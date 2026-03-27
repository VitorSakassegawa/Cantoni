import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapWithConcurrency } from '@/lib/async'
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

  const { data: existingContract, error: existingContractError } = await supabase
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

  const { count: paidPaymentsCount } = await supabase
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

  const { error: updateError } = await supabase
    .from('contratos')
    .update({
      plano_id: planoId ? Number(planoId) : existingContract.plano_id,
      data_inicio: nextStartDate,
      data_fim: nextEndDate,
      semestre: nextSemester,
      ano: nextYear,
      livro_atual: nextBook,
      nivel_atual: nextLevel,
      horario: nextSchedule,
      valor: nextValor,
      dia_vencimento: nextDueDay,
      forma_pagamento: nextPaymentMethod,
      status: nextStatus,
      tipo_contrato: nextContractType,
      dias_da_semana: nextWeekdays,
      desconto_valor: nextDiscountValue,
      desconto_percentual: nextDiscountPercent,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: allPagamentos } = await supabase
    .from('pagamentos')
    .select('id, status, parcela_num, valor')
    .eq('contrato_id', id)

  if (!hasPaidPayments) {
    const paymentRows = (allPagamentos || []) as PaymentRow[]
    const unpaidPayments = paymentRows.filter((pagamento) => pagamento.status !== 'pago')
    const paidAmount = paymentRows
      .filter((pagamento) => pagamento.status === 'pago')
      .reduce((acc, pagamento) => acc + Number(pagamento.valor || 0), 0)
    const remainingAmount = Math.max(0, nextValor - paidAmount)

    let paymentUpdates
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

    const updateResults = await mapWithConcurrency(paymentUpdates, 5, async (paymentUpdate) => {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          valor: paymentUpdate.valor,
          forma: paymentUpdate.forma,
          data_vencimento: paymentUpdate.data_vencimento,
        })
        .eq('id', paymentUpdate.id)

      return {
        id: paymentUpdate.id,
        error,
      }
    })

    const failedUpdates = updateResults.filter((result) => result.error)
    if (failedUpdates.length > 0) {
      const { error: rollbackError } = await supabase
        .from('contratos')
        .update({
          plano_id: existingContract.plano_id,
          data_inicio: existingContract.data_inicio,
          data_fim: existingContract.data_fim,
          semestre: existingContract.semestre,
          ano: existingContract.ano,
          livro_atual: existingContract.livro_atual,
          nivel_atual: existingContract.nivel_atual,
          horario: existingContract.horario,
          valor: existingContract.valor,
          dia_vencimento: existingContract.dia_vencimento,
          forma_pagamento: existingContract.forma_pagamento,
          status: existingContract.status,
          tipo_contrato: existingContract.tipo_contrato,
          dias_da_semana: existingContract.dias_da_semana,
          desconto_valor: existingContract.desconto_valor || 0,
          desconto_percentual: existingContract.desconto_percentual || 0,
        })
        .eq('id', id)

      return NextResponse.json(
        {
          error: rollbackError
            ? 'Falha ao atualizar parcelas pendentes e nao foi possivel restaurar o contrato automaticamente.'
            : 'Falha ao atualizar uma ou mais parcelas pendentes. O contrato foi restaurado para o estado anterior.',
          details: failedUpdates.map((result) => ({
            id: result.id,
            message: result.error?.message || 'Erro desconhecido',
          })),
          rollbackError: rollbackError?.message || null,
        },
        { status: 502 }
      )
    }
  }

  const { data: contrato } = await supabase.from('contratos').select('id, aluno_id').eq('id', id).single()

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
