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
    semestre,
    ano,
    livro_atual,
    nivel_atual,
    horario,
    valor,
    dia_vencimento,
    forma_pagamento,
    status,
    dias_da_semana,
    descontoValor,
    descontoPercentual,
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
      semestre,
      ano,
      livro_atual,
      nivel_atual,
      horario,
      valor: vFloat,
      dia_vencimento: dvInt,
      forma_pagamento,
      status,
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
    .select('id')
    .eq('contrato_id', id)

  const totalParcels = allPagamentos?.length || 6
  const valorParcela = Number((vFloat / totalParcels).toFixed(2))
  const { data: pendentes } = await supabase
    .from('pagamentos')
    .select('id, data_vencimento')
    .eq('contrato_id', id)
    .eq('status', 'pendente')

  await mapWithConcurrency(pendentes || [], 5, async (pagamento: any) => {
    if (!pagamento.data_vencimento) {
      return
    }

    const currentLoc = new Date(`${pagamento.data_vencimento}T12:00:00`)
    if (Number.isNaN(currentLoc.getTime())) {
      return
    }

    const newDate = new Date(currentLoc.getFullYear(), currentLoc.getMonth(), dvInt, 12, 0, 0)
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
    },
  })

  return NextResponse.json({ success: true })
}
