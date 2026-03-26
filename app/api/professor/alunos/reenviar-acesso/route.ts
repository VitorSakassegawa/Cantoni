import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  }

  const { alunoId } = await request.json()
  if (!alunoId) {
    return NextResponse.json({ error: 'Aluno nao informado.' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()
  const { data: aluno, error: alunoError } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', alunoId)
    .single()

  if (alunoError || !aluno || aluno.role !== 'aluno') {
    return NextResponse.json({ error: 'Aluno nao encontrado.' }, { status: 404 })
  }

  if (!aluno.email) {
    return NextResponse.json({ error: 'Aluno sem e-mail cadastrado.' }, { status: 400 })
  }

  const { error: resetError } = await serviceSupabase.auth.resetPasswordForEmail(aluno.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  })

  if (resetError) {
    return NextResponse.json(
      { error: resetError.message || 'Nao foi possivel enviar o e-mail de primeiro acesso.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
