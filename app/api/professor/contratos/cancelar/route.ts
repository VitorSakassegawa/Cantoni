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

type LessonRow = {
  id: number
  status: string
  data_hora: string
  google_event_id?: string | null
}

type PaymentRow = {
  id: number
  status: string
  valor: number | string | null
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

  const [lessonsResult, paymentsResult] = await Promise.all([
    serviceSupabase
      .from('aulas')
      .select('id, status, data_hora, google_event_id')
      .eq('contrato_id', contractId)
      .order('data_hora'),
    serviceSupabase.from('pagamentos').select('id, status, valor').eq('contrato_id', contractId),
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

  if (outstandingAction === 'waive_open_balance' && openPayments.length > 0) {
    const openPaymentIds = openPayments.map((payment) => payment.id)
    const { error: deletePaymentsError } = await serviceSupabase.from('pagamentos').delete().in('id', openPaymentIds)

    if (deletePaymentsError) {
      return NextResponse.json({ error: deletePaymentsError.message }, { status: 500 })
    }
  }

  const reasonLabel = getCancellationReasonLabel(reasonCode)
  const { error: cancellationError } = await serviceSupabase.from('contract_cancellations').insert({
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

  if (cancellationError) {
    return NextResponse.json({ error: cancellationError.message }, { status: 500 })
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

  return NextResponse.json({
    success: true,
    summary,
    cancelledFutureLessons,
  })
}
