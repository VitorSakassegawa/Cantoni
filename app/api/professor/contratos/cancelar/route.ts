import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logActivityBestEffort } from '@/lib/activity-log'
import {
  calculateCancellationSummary,
  getCancellationReasonLabel,
  type CancellationCreditAction,
  type CancellationLessonAction,
  type CancellationOutstandingAction,
  type CancellationReasonCode,
} from '@/lib/contract-cancellation'
import { deletarEventoCalendar } from '@/lib/google-calendar'
import { enviarEmailCancelamentoContrato } from '@/lib/resend'
import { buildCancellationNoticeSnapshot } from '@/lib/documents'
import { generateDocumentHash } from '@/lib/document-audit'

type LessonRow = {
  id: number
  status: string
  data_hora: string
  google_event_id?: string | null
}

type PaymentRow = {
  id: number
  parcela_num?: number | null
  status: string
  valor: number | string | null
  data_vencimento?: string | null
  forma?: string | null
}

function startOfDayIso(date: string) {
  return new Date(`${date}T00:00:00`).toISOString()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem cancelar contratos' }, { status: 403 })
  }

  const body = await request.json()
  const contractId = Number(body.contractId)
  const effectiveDate = String(body.effectiveDate || '')
  const reasonCode = body.reasonCode as CancellationReasonCode
  const reasonDetails = typeof body.reasonDetails === 'string' ? body.reasonDetails.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const lessonAction = body.lessonAction as CancellationLessonAction
  const outstandingAction = body.outstandingAction as CancellationOutstandingAction
  const creditAction = body.creditAction as CancellationCreditAction

  if (!Number.isFinite(contractId) || contractId <= 0) {
    return NextResponse.json({ error: 'Contrato invalido' }, { status: 400 })
  }

  if (!effectiveDate) {
    return NextResponse.json({ error: 'Informe a data efetiva do cancelamento.' }, { status: 400 })
  }

  if (!reasonCode) {
    return NextResponse.json({ error: 'Selecione o motivo do cancelamento.' }, { status: 400 })
  }

  if (reasonCode === 'other' && !reasonDetails) {
    return NextResponse.json({ error: 'Descreva o motivo do cancelamento.' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()

  const { data: contract, error: contractError } = await serviceSupabase
    .from('contratos')
    .select('id, aluno_id, valor, aulas_totais, status, status_financeiro, data_inicio, data_fim')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contrato nao encontrado' }, { status: 404 })
  }

  if (contract.status === 'cancelado') {
    return NextResponse.json({ error: 'Este contrato ja foi cancelado.' }, { status: 409 })
  }

  const { data: studentProfile } = await serviceSupabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', contract.aluno_id)
    .single()
  const { data: teacherProfile } = await serviceSupabase
    .from('profiles')
    .select('*')
    .eq('role', 'professor')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const [lessonsResult, paymentsResult] = await Promise.all([
    serviceSupabase
      .from('aulas')
      .select('id, status, data_hora, google_event_id')
      .eq('contrato_id', contractId)
      .order('data_hora'),
    serviceSupabase
      .from('pagamentos')
      .select('id, parcela_num, status, valor, data_vencimento, forma')
      .eq('contrato_id', contractId),
  ])

  if (lessonsResult.error || paymentsResult.error) {
    return NextResponse.json(
      { error: lessonsResult.error?.message || paymentsResult.error?.message || 'Falha ao carregar contrato' },
      { status: 500 }
    )
  }

  const lessons = (lessonsResult.data || []) as LessonRow[]
  const payments = (paymentsResult.data || []) as PaymentRow[]

  const completedStatuses = new Set(['dada', 'finalizado'])
  const futureCancelableStatuses = new Set(['agendada', 'confirmada', 'pendente_remarcacao'])
  const effectiveDateIso = startOfDayIso(effectiveDate)

  const completedLessons = lessons.filter((lesson) => completedStatuses.has(lesson.status)).length
  const futureLessons = lessons.filter(
    (lesson) => lesson.data_hora >= effectiveDateIso && futureCancelableStatuses.has(lesson.status)
  )

  const paidAmount = payments
    .filter((payment) => payment.status === 'pago')
    .reduce((total, payment) => total + Number(payment.valor || 0), 0)
  const openPayments = payments.filter((payment) => payment.status !== 'pago')
  const openAmount = openPayments.reduce((total, payment) => total + Number(payment.valor || 0), 0)

  const summary = calculateCancellationSummary({
    contractValue: Number(contract.valor || 0),
    totalLessons: Number(contract.aulas_totais || 0),
    paidAmount,
    openAmount,
    completedLessons,
    futureLessons: futureLessons.length,
  })

  const nextFinancialStatus =
    outstandingAction === 'keep_open_balance' && summary.openAmount > 0 ? 'pendente' : 'em_dia'

  const { error: contractUpdateError } = await serviceSupabase
    .from('contratos')
    .update({
      status: 'cancelado',
      status_financeiro: nextFinancialStatus,
      data_fim: effectiveDate,
    })
    .eq('id', contractId)

  if (contractUpdateError) {
    return NextResponse.json({ error: contractUpdateError.message }, { status: 500 })
  }

  let cancelledFutureLessons = 0

  if (lessonAction === 'auto_cancel_future' && futureLessons.length > 0) {
    for (const lesson of futureLessons) {
      const { error: lessonUpdateError } = await serviceSupabase
        .from('aulas')
        .update({
          status: 'cancelada',
          justificativa_professor: 'Contrato cancelado',
          motivo_remarcacao: `Contrato cancelado em ${effectiveDate}`,
        })
        .eq('id', lesson.id)

      if (!lessonUpdateError) {
        cancelledFutureLessons += 1
      }

      if (lesson.google_event_id) {
        await deletarEventoCalendar(lesson.google_event_id)
      }
    }
  }

  const reasonLabel = getCancellationReasonLabel(reasonCode)
  const { data: cancellationRecord, error: cancellationError } = await serviceSupabase
    .from('contract_cancellations')
    .insert({
    contract_id: contractId,
    student_id: contract.aluno_id,
    cancelled_by: user.id,
    effective_date: effectiveDate,
    reason_code: reasonCode,
    reason_label: reasonLabel,
    reason_details: reasonDetails || null,
    notes: notes || null,
    lesson_action: lessonAction,
    outstanding_action: outstandingAction,
    credit_action: creditAction,
    paid_amount: summary.paidAmount,
    consumed_value: summary.consumedValue,
    outstanding_value: summary.openAmount,
    credit_value: summary.creditValue,
    completed_lessons: summary.completedLessons,
    future_lessons_cancelled: cancelledFutureLessons,
    })
    .select('*')
    .single()

  if (cancellationError || !cancellationRecord) {
    return NextResponse.json(
      { error: cancellationError?.message || 'Falha ao registrar o cancelamento.' },
      { status: 500 }
    )
  }

  if (outstandingAction === 'waive_open_balance' && openPayments.length > 0) {
    const paymentSnapshots = openPayments.map((payment) => ({
      contract_cancellation_id: cancellationRecord.id,
      contract_id: contractId,
      student_id: contract.aluno_id,
      original_payment_id: payment.id,
      parcela_num: payment.parcela_num || null,
      original_status: payment.status,
      original_amount: Number(payment.valor || 0),
      original_due_date: payment.data_vencimento || null,
      original_payment_method: payment.forma || null,
      cancellation_reason: 'contract_cancellation',
    }))

    const { error: snapshotError } = await serviceSupabase
      .from('payment_cancellation_entries')
      .insert(paymentSnapshots)

    if (snapshotError) {
      return NextResponse.json({ error: snapshotError.message }, { status: 500 })
    }

    const openPaymentIds = openPayments.map((payment) => payment.id)
    const { error: deletePaymentsError } = await serviceSupabase.from('pagamentos').delete().in('id', openPaymentIds)

    if (deletePaymentsError) {
      return NextResponse.json({ error: deletePaymentsError.message }, { status: 500 })
    }
  }

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: contract.aluno_id,
    contractId,
    eventType: 'contract.cancelled',
    title: 'Contrato cancelado',
    description: `Contrato cancelado com motivo "${reasonLabel}" e data efetiva em ${effectiveDate}.`,
    severity: 'warning',
    metadata: {
      outstandingAction,
      creditAction,
      lessonAction,
      reasonCode,
      reasonDetails: reasonDetails || null,
      paidAmount: summary.paidAmount,
      consumedValue: summary.consumedValue,
      outstandingValue: summary.openAmount,
      creditValue: summary.creditValue,
      completedLessons: summary.completedLessons,
      cancelledFutureLessons,
    },
  })

  let emailWarning: string | null = null
  let issuanceId: number | null = null
  if (studentProfile?.email) {
    try {
      await enviarEmailCancelamentoContrato({
        to: studentProfile.email,
        nomeAluno: studentProfile.full_name || 'Aluno',
        effectiveDate,
        reasonLabel,
        outstandingAction,
        creditAction,
        notes: notes || undefined,
      })
    } catch (emailError) {
      console.error('Cancellation email failed:', emailError)
      emailWarning = 'Contrato cancelado, mas houve falha ao enviar o comunicado por e-mail.'
    }
  }

  const cancellationPayload = buildCancellationNoticeSnapshot({
    student: studentProfile || {},
    teacher: teacherProfile || {},
    contract,
    cancellation: cancellationRecord,
  })
  const contentHash = generateDocumentHash(cancellationPayload)

  const { data: previousIssuances } = await serviceSupabase
    .from('document_issuances')
    .select('version')
    .eq('contract_id', contractId)
    .eq('kind', 'cancellation_notice')
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = ((previousIssuances?.[0]?.version as number | undefined) || 0) + 1

  await serviceSupabase
    .from('document_issuances')
    .update({ status: 'superseded' })
    .eq('contract_id', contractId)
    .eq('kind', 'cancellation_notice')
    .eq('status', 'issued')

  const { data: issuance, error: issuanceError } = await serviceSupabase
    .from('document_issuances')
    .insert({
      contract_id: contractId,
      student_id: contract.aluno_id,
      kind: 'cancellation_notice',
      version: nextVersion,
      title: cancellationPayload.title,
      payload: cancellationPayload,
      content_hash: contentHash,
      status: 'issued',
      requires_acceptance: false,
      issued_by: user.id,
    })
    .select('id')
    .single()

  if (!issuanceError && issuance) {
    issuanceId = issuance.id
  }

  return NextResponse.json({
    success: true,
    summary,
    cancelledFutureLessons,
    emailWarning,
    issuanceId,
  })
}
