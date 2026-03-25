import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapWithConcurrency } from '@/lib/async'
import { logActivityBestEffort } from '@/lib/activity-log'
import { buildPendingPaymentUpdates } from '@/lib/contract-payments'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem editar contratos' }, { status: 403 })
  }

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
  } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 })
  }

  const vFloat = Number.parseFloat(valor)
  const dvInt = Number.parseInt(dia_vencimento, 10)
  if (Number.isNaN(vFloat) || Number.isNaN(dvInt)) {
    return NextResponse.json({ error: 'Dados numéricos inválidos' }, { status: 400 })
  }

  const { data: existingContract, error: existingContractError } = await supabase
    .from('contratos')
    .select('valor, dia_vencimento, forma_pagamento, data_inicio, data_fim')
    .eq('id', id)
    .single()

  if (existingContractError || !existingContract) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  }

  const { count: paidPaymentsCount } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', id)
    .eq('status', 'pago')

  const hasPaidPayments = (paidPaymentsCount || 0) > 0
  const isFinancialChange =
    Number(existingContract.valor) !== vFloat ||
    Number(existingContract.dia_vencimento) !== dvInt ||
    existingContract.forma_pagamento !== forma_pagamento ||
    existingContract.data_inicio !== dataInicio ||
    existingContract.data_fim !== dataFim

  if (hasPaidPayments && isFinancialChange) {
    return NextResponse.json(
      {
        error: 'Este contrato já possui parcelas pagas. Alterações financeiras exigem fluxo de renegociação/aditivo.',
      },
      { status: 409 }
    )
  }

  const { error: updateError } = await supabase
    .from('contratos')
    .update({
      plano_id: planoId ? Number(planoId) : undefined,
      data_inicio: dataInicio,
      data_fim: dataFim,
      semestre,
      ano,
      livro_atual,
      nivel_atual,
      horario,
      valor: vFloat,
      dia_vencimento: dvInt,
      forma_pagamento,
      status,
      tipo_contrato: tipoContrato,
      dias_da_semana,
      desconto_valor: descontoValor || 0,
      desconto_percentual: descontoPercentual || 0,
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
    const unpaidPayments = (allPagamentos || []).filter((pagamento: any) => pagamento.status !== 'pago')
    const paidAmount = (allPagamentos || [])
      .filter((pagamento: any) => pagamento.status === 'pago')
      .reduce((acc: number, pagamento: any) => acc + Number(pagamento.valor || 0), 0)
    const remainingAmount = Math.max(0, vFloat - paidAmount)

    let paymentUpdates
    try {
      paymentUpdates = buildPendingPaymentUpdates({
        dataInicio,
        diaVencimento: dvInt,
        formaPagamento: forma_pagamento,
        unpaidPayments,
        remainingAmount,
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Falha ao recalcular as parcelas pendentes' },
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
      return NextResponse.json(
        {
          error: 'Falha ao atualizar uma ou mais parcelas pendentes do contrato.',
          details: failedUpdates.map((result) => ({
            id: result.id,
            message: result.error?.message || 'Erro desconhecido',
          })),
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
    description: `O contrato foi atualizado com status ${status} e valor ${vFloat.toFixed(2)}.`,
    severity: 'info',
    metadata: {
      semester: semestre,
      year: ano,
      paymentMethod: forma_pagamento,
      requestedInstallments: numParcelas ?? null,
      hasPaidPayments,
    },
  })

  return NextResponse.json({ success: true })
}
