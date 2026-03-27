import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { listAvailableContractCredits } from '@/lib/contract-credits'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem consultar créditos' }, { status: 403 })
  }

  const { id: studentId } = await params

  if (!studentId) {
    return NextResponse.json({ error: 'Aluno inválido' }, { status: 400 })
  }

  try {
    const serviceSupabase = await createServiceClient()
    const sources = await listAvailableContractCredits(serviceSupabase, studentId)
    const totalAvailable = Number(
      sources.reduce((total, source) => total + source.availableValue, 0).toFixed(2)
    )

    return NextResponse.json({
      totalAvailable,
      sources,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Falha ao consultar créditos disponíveis') },
      { status: 500 }
    )
  }
}
