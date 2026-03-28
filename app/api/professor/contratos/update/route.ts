import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logActivityBestEffort } from '@/lib/activity-log'
import { buildPendingPaymentUpdates } from '@/lib/contract-payments'

type PaymentRow = {
  id: number
  status: string
  parcela_num: number
  valor: number | string | null
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
    return NextResponse.json({ error: 'Apenas professores podem editar contratos' }, { status: 403 })
  }

  const payload = await request.json()
  const {
    id,
    planoId,
    dataInicio,
    dataFim,
    semestre,
    ano,
    livro_atual,
    nivel_atual,
    horario,
    valor,
    dia_vencimento,
    forma_pagamento,
    status,
    tipoContrato,
    dias_da_semana,
    descontoValor,
    descontoPercentual,
    numParcelas,
  } = payload

  if (!id) {
    return NextResponse.json({ error: 'ID do contrato e obrigatorio' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()

  const { data: existingContract, error: existingContractError } = await serviceSupabase
    .from('contratos')
    .select(
      'plano_id, data_inicio, data_fim, semestre, ano, livro_atual, nivel_atual, horario, valor, dia_vencimento, forma_pagamento, status, tipo_contrato, dias_da_semana, desconto_valor, desconto_percentual'
    )
    .eq('id', id)
    .single()

  if (existingContractError || !existingContract) {
    return NextResponse.json({ error: 'Contrato nao encontrado' }, { status: 404 })
  }

  const nextStatus = status ?? existingContract.status
  const nextValorRaw = valor ?? existingContract.valor
  const nextDueDayRaw = dia_vencimento ?? existingContract.dia_vencimento
  const nextPaymentMethod = forma_pagamento ?? existingContract.forma_pagamento
  const nextStartDate = dataInicio ?? existingContract.data_inicio
  const nextEndDate = dataFim ?? existingContract.data_fim
  const nextSemester = semestre ?? existingContract.semestre
  const nextYear = ano ?? existingContract.ano
  const nextBook = livro_atual ?? existingContract.livro_atual
  const nextLevel = nivel_atual ?? existingContract.nivel_atual
  const nextSchedule = horario ?? existingContract.horario
  const nextContractType = tipoContrato ?? existingContract.tipo_contrato
  const nextWeekdays = dias_da_semana ?? existingContract.dias_da_semana
  const nextDiscountValue = descontoValor ?? existingContract.desconto_valor ?? 0
  const nextDiscountPercent = descontoPercentual ?? existingContract.desconto_percentual ?? 0

  const nextValor = Number.parseFloat(String(nextValorRaw))
  const nextDueDay = Number.parseInt(String(nextDueDayRaw), 10)

  if (Number.isNaN(nextValor) || Number.isNaN(nextDueDay)) {
    return NextResponse.json({ error: 'Dados numericos invalidos' }, { status: 400 })
  }

  const { count: paidPaymentsCount } = await serviceSupabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', id)
    .eq('status', 'pago')

  const hasPaidPayments = (paidPaymentsCount || 0) > 0
  const isFinancialChange =
    Number(existingContract.valor) !== nextValor ||
    Number(existingContract.dia_vencimento) !== nextDueDay ||
    existingContract.forma_pagamento !== nextPaymentMethod ||
    existingContract.data_inicio !== nextStartDate ||
    existingContract.data_fim !== nextEndDate

  if (hasPaidPayments && isFinancialChange) {
    return NextResponse.json(
      {
        error:
          'Este contrato ja possui parcelas pagas. Alteracoes financeiras exigem fluxo de renegociacao/aditivo.',
      },
      { status: 409 }
    )
  }

  const { data: allPagamentos } = await serviceSupabase
    .from('pagamentos')
    .select('id, status, parcela_num, valor')
    .eq('contrato_id', id)

  const paymentRows = (allPagamentos || []) as PaymentRow[]
  const unpaidPayments = paymentRows.filter((pagamento) => pagamento.status !== 'pago')
  const paidAmount = paymentRows
    .filter((pagamento) => pagamento.status === 'pago')
    .reduce((acc, pagamento) => acc + Number(pagamento.valor || 0), 0)
  const remainingAmount = Math.max(0, nextValor - paidAmount)

  let paymentUpdates: ReturnType<typeof buildPendingPaymentUpdates> = []
  if (!hasPaidPayments) {
    try {
      paymentUpdates = buildPendingPaymentUpdates({
        dataInicio: nextStartDate,
        diaVencimento: nextDueDay,
        formaPagamento: nextPaymentMethod,
        unpaidPayments,
        remainingAmount,
      })
    } catch (error: unknown) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Falha ao recalcular as parcelas pendentes' },
        { status: 400 }
      )
    }
  }

  const { error: updateError } = await serviceSupabase.rpc('update_contract_and_pending_payments_v1', {
    p_contract_id: Number(id),
    p_plano_id: planoId ? Number(planoId) : existingContract.plano_id,
    p_data_inicio: nextStartDate,
    p_data_fim: nextEndDate,
    p_semestre: nextSemester,
    p_ano: nextYear,
    p_livro_atual: nextBook,
    p_nivel_atual: nextLevel,
    p_horario: nextSchedule,
    p_valor: nextValor,
    p_dia_vencimento: nextDueDay,
    p_forma_pagamento: nextPaymentMethod,
    p_status: nextStatus,
    p_tipo_contrato: nextContractType,
    p_dias_da_semana: nextWeekdays,
    p_desconto_valor: nextDiscountValue,
    p_desconto_percentual: nextDiscountPercent,
    p_payment_updates: paymentUpdates,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: contrato } = await serviceSupabase
    .from('contratos')
    .select('id, aluno_id')
    .eq('id', id)
    .single()

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: contrato?.aluno_id,
    contractId: Number(id),
    eventType: 'contract.updated',
    title: 'Contrato atualizado',
    description: `O contrato foi atualizado com status ${nextStatus} e valor ${nextValor.toFixed(2)}.`,
    severity: 'info',
    metadata: {
      semester: nextSemester,
      year: nextYear,
      paymentMethod: nextPaymentMethod,
      requestedInstallments: numParcelas ?? null,
      hasPaidPayments,
    },
  })

  return NextResponse.json({ success: true })
}
