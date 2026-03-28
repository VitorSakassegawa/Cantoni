import { NextRequest, NextResponse } from 'next/server'
import { mapWithConcurrency } from '@/lib/async'
import { logActivityBestEffort } from '@/lib/activity-log'
import { deletarEventoCalendar } from '@/lib/google-calendar'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type DeleteContractSummary = { id: number }
type LessonEventRow = { google_event_id?: string | null }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: professor } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()

  if (professor?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem deletar alunos' }, { status: 403 })
  }

  const { alunoId } = await request.json()
  if (!alunoId) {
    return NextResponse.json({ error: 'ID do aluno nao fornecido' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()

  try {
    const { data: aluno } = await serviceSupabase.from('profiles').select('full_name').eq('id', alunoId).single()

    const { data: contratos } = await serviceSupabase.from('contratos').select('id').eq('aluno_id', alunoId)
    const contratoIds = ((contratos || []) as DeleteContractSummary[]).map((contrato) => contrato.id)

    await serviceSupabase.from('activity_logs').delete().eq('target_user_id', alunoId)
    await serviceSupabase.from('activity_logs').delete().eq('actor_user_id', alunoId)

    if (contratoIds.length > 0) {
      await serviceSupabase.from('activity_logs').delete().in('contract_id', contratoIds)
    }

    if (contratoIds.length > 0) {
      const { data: aulas } = await serviceSupabase
        .from('aulas')
        .select('google_event_id')
        .in('contrato_id', contratoIds)
        .not('google_event_id', 'is', null)

      const eventIds = ((aulas || []) as LessonEventRow[])
        .map((aula) => aula.google_event_id)
        .filter((eventId): eventId is string => Boolean(eventId))

      await mapWithConcurrency(eventIds, 5, async (eventId) => {
        try {
          await deletarEventoCalendar(eventId)
        } catch (error) {
          console.error(`Erro ao deletar evento ${eventId}`, error)
        }
      })
    }

    const { error: deleteAuthErr } = await serviceSupabase.auth.admin.deleteUser(alunoId)

    if (deleteAuthErr) {
      console.error('Auth delete error:', deleteAuthErr)
      return NextResponse.json(
        { error: 'Erro ao deletar usuario do sistema de autenticacao' },
        { status: 500 }
      )
    }

    await logActivityBestEffort({
      actorUserId: currentUser.id,
      targetUserId: alunoId,
      eventType: 'student.deleted',
      title: 'Aluno removido',
      description: `O cadastro de ${aluno?.full_name || 'um aluno'} foi removido do sistema.`,
      severity: 'warning',
    })

    return NextResponse.json({
      success: true,
      message: 'Aluno e todos os dados associados foram removidos com sucesso.',
    })
  } catch (error: unknown) {
    console.error('Global delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao processar a exclusao' },
      { status: 500 }
    )
  }
}
