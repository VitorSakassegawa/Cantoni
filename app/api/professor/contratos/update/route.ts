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
    valor 
  } = await request.json()

  if (!id) return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('contratos')
    .update({
      semestre,
      ano,
      livro_atual,
      nivel_atual,
      horario,
      valor: parseFloat(valor),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
