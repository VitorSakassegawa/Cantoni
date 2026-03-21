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
  const { data: allPagamentos } = await supabase
    .from('pagamentos')
    .select('id')
    .eq('contrato_id', id)
    
  const totalParcels = allPagamentos?.length || 6
  const valorParcela = parseFloat((parseFloat(valor) / totalParcels).toFixed(2))
  const { data: pendentes } = await supabase
    .from('pagamentos')
    .select('id, data_vencimento')
    .eq('contrato_id', id)
    .eq('status', 'pendente')

  if (pendentes && pendentes.length > 0) {
    for (const p of pendentes) {
      // Robust date parsing
      if (!p.data_vencimento) continue

      try {
        const currentLoc = new Date(p.data_vencimento + 'T12:00:00')
        
        // Check if date is valid after parsing
        if (isNaN(currentLoc.getTime())) {
          console.warn(`[UpdateContrato] Data de vencimento inválida para pagamento ${p.id}: ${p.data_vencimento}`)
          continue
        }

        const diaVenc = parseInt(dia_vencimento)
        if (isNaN(diaVenc)) {
           console.warn(`[UpdateContrato] Dia de vencimento inválido: ${dia_vencimento}`)
           continue
        }

        const newDate = new Date(currentLoc.getFullYear(), currentLoc.getMonth(), diaVenc)
        
        // Final guard before toISOString
        if (isNaN(newDate.getTime())) {
          console.warn(`[UpdateContrato] Erro ao calcular nova data para pagamento ${p.id}`)
          continue
        }

        await supabase
          .from('pagamentos')
          .update({
            valor: valorParcela,
            forma: forma_pagamento,
            data_vencimento: newDate.toISOString().split('T')[0]
          })
          .eq('id', p.id)
      } catch (err) {
        console.error(`[UpdateContrato] Erro ao processar pagamento ${p.id}:`, err)
        // Skip this one and continue
      }
    }
  }

  return NextResponse.json({ success: true })
}
