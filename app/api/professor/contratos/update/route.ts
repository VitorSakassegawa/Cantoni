import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar se o usuário é professor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem editar contratos' }, { status: 403 })
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
    status
  } = await request.json()

  if (!id) return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 })

  const { error: updateError } = await supabase
    .from('contratos')
    .update({
      semestre,
      ano,
      livro_atual,
      nivel_atual,
      horario,
      valor: parseFloat(valor),
      dia_vencimento: parseInt(dia_vencimento),
      forma_pagamento,
      status
    })

    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Sincronizar pagamentos pendentes
  const valorParcela = parseFloat((parseFloat(valor) / 6).toFixed(2))
  const { data: pendentes } = await supabase
    .from('pagamentos')
    .select('id, data_vencimento')
    .eq('contrato_id', id)
    .eq('status', 'pendente')

  if (pendentes && pendentes.length > 0) {
    for (const p of pendentes) {
      const currentLoc = new Date(p.data_vencimento + 'T12:00:00') // Usar T12 to avoid timezone shifts
      const newDate = new Date(currentLoc.getFullYear(), currentLoc.getMonth(), parseInt(dia_vencimento))
      
      await supabase
        .from('pagamentos')
        .update({
          valor: valorParcela,
          forma: forma_pagamento,
          data_vencimento: newDate.toISOString().split('T')[0]
        })
        .eq('id', p.id)
    }
  }

  return NextResponse.json({ success: true })
}
