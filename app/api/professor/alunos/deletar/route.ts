import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { deletarEventoCalendar } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (!currentUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Check professor role
  const { data: professor } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (professor?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem deletar alunos' }, { status: 403 })
  }

  const { alunoId } = await request.json()
  if (!alunoId) {
    return NextResponse.json({ error: 'ID do aluno não fornecido' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()

  try {
    // 1. Get all calendar event IDs before deleting records
    const { data: contratos } = await serviceSupabase
      .from('contratos')
      .select('id')
      .eq('aluno_id', alunoId)

    const contratoIds = contratos?.map((c: any) => c.id) || []

    if (contratoIds.length > 0) {
      const { data: aulas } = await serviceSupabase
        .from('aulas')
        .select('google_event_id')
        .in('contrato_id', contratoIds)
        .not('google_event_id', 'is', null)

      // 2. Delete Google Calendar events
      if (aulas && aulas.length > 0) {
        for (const aula of aulas) {
          if (aula.google_event_id) {
            try {
              await deletarEventoCalendar(aula.google_event_id)
            } catch (e) {
              console.error(`Erro ao deletar evento ${aula.google_event_id}`, e)
            }
          }
        }
      }
    }

    // 3. Delete from Auth Users (This will cascade all DB records because of ON DELETE CASCADE)
    const { error: deleteAuthErr } = await serviceSupabase.auth.admin.deleteUser(alunoId)
    
    if (deleteAuthErr) {
      console.error('Auth delete error:', deleteAuthErr)
      // If auth delete fails, try manual DB cleanup just in case
      await serviceSupabase.from('profiles').delete().eq('id', alunoId)
      return NextResponse.json({ error: 'Erro ao deletar usuário do sistema de autenticação' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Aluno e todos os dados associados foram removidos com sucesso.' })
  } catch (error: any) {
    console.error('Global delete error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno ao processar a exclusão' }, { status: 500 })
  }
}
