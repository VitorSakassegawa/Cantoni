import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapWithConcurrency } from '@/lib/async'
import { logActivityBestEffort } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json(
      { error: 'Apenas professores podem editar contratos' },
      { status: 403 }
    )
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

  const unpaidPayments = (allPagamentos || []).filter((pagamento: any) => pagamento.status !== 'pago')
  const paidAmount = (allPagamentos || [])
    .filter((pagamento: any) => pagamento.status === 'pago')
    .reduce((acc: number, pagamento: any) => acc + Number(pagamento.valor || 0), 0)
  const remainingAmount = Math.max(0, vFloat - paidAmount)
  const valorParcela = unpaidPayments.length > 0
    ? Number((remainingAmount / unpaidPayments.length).toFixed(2))
    : 0

  await mapWithConcurrency(unpaidPayments, 5, async (pagamento: any) => {
    const parcelaNumero = Number(pagamento.parcela_num)
    if (!Number.isFinite(parcelaNumero) || parcelaNumero <= 0) {
      return
    }

    const dueBase = new Date(`${dataInicio}T12:00:00`)
    dueBase.setMonth(dueBase.getMonth() + parcelaNumero)
    const ultimoDiaMes = new Date(dueBase.getFullYear(), dueBase.getMonth() + 1, 0).getDate()
    const diaEfetivo = Math.min(dvInt, ultimoDiaMes)
    const newDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), diaEfetivo, 12, 0, 0)
    if (Number.isNaN(newDate.getTime())) {
      return
    }

    await supabase
      .from('pagamentos')
      .update({
        valor: valorParcela,
        forma: forma_pagamento,
        data_vencimento: newDate.toISOString().split('T')[0],
      })
      .eq('id', pagamento.id)
  })

  const { data: contrato } = await supabase
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
    description: `O contrato foi atualizado com status ${status} e valor ${vFloat.toFixed(2)}.`,
    severity: 'info',
    metadata: {
      semester: semestre,
      year: ano,
      paymentMethod: forma_pagamento,
      requestedInstallments: numParcelas ?? null,
    },
  })

  return NextResponse.json({ success: true })
}
