import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCpf } from '@/lib/cpf-security'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (viewerProfile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem acessar este perfil' }, { status: 403 })
  }

  const alunoId = request.nextUrl.searchParams.get('id')
  if (!alunoId) {
    return NextResponse.json({ error: 'ID do aluno é obrigatório' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, cpf, cpf_encrypted, birth_date, data_inscricao, nivel')
    .eq('id', alunoId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil do aluno não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    ...profile,
    cpf: resolveCpf(profile),
    cpf_encrypted: undefined,
  })
}
