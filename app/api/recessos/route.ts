import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recessos')
    .select('*')
    .order('data_inicio', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem gerenciar o calendário' }, { status: 403 })
  }

  const { titulo, data_inicio, data_fim, tipo } = await request.json()

  if (!titulo || !data_inicio || !data_fim || !tipo) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recessos')
    .insert({
      titulo,
      data_inicio,
      data_fim,
      tipo,
      criado_por: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se for recesso ou feriado do professor, identificar conflitos de aulas
  if (tipo === 'recesso' || tipo === 'feriado' || tipo === 'ferias') {
    const { data: aulasImpactadas } = await supabase
      .from('aulas')
      .select('id')
      .gte('data_hora', data_inicio + 'T00:00:00')
      .lte('data_hora', data_fim + 'T23:59:59')
      .eq('status', 'agendada')

    if (aulasImpactadas && aulasImpactadas.length > 0) {
      const ids = aulasImpactadas.map((a: { id: string }) => a.id)
      await supabase
        .from('aulas')
        .update({ 
          status: 'pendente_remarcacao',
          motivo_remarcacao: `Conflito: ${titulo} (${tipo})`
        })
        .in('id', ids)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem gerenciar o calendário' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID ausente' }, { status: 400 })

  const { error } = await supabase
    .from('recessos')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
