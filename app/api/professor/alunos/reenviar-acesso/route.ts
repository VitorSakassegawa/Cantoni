import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enviarEmailPrimeiroAcesso } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { alunoId } = await request.json()
  if (!alunoId) {
    return NextResponse.json({ error: 'Aluno não informado.' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()
  const { data: aluno, error: alunoError } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', alunoId)
    .single()

  if (alunoError || !aluno || aluno.role !== 'aluno') {
    return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 })
  }

  if (!aluno.email) {
    return NextResponse.json({ error: 'Aluno sem e-mail cadastrado.' }, { status: 400 })
  }

  const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: aluno.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkError?.message || 'Não foi possível gerar o link de primeiro acesso.' },
      { status: 500 }
    )
  }

  await enviarEmailPrimeiroAcesso({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    setupPasswordLink: linkData.properties.action_link,
  })

  return NextResponse.json({ success: true })
}
