import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCpf } from '@/lib/cpf-security'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, cpf, cpf_encrypted, birth_date')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    ...profile,
    cpf: resolveCpf(profile),
    cpf_encrypted: undefined,
  })
}
