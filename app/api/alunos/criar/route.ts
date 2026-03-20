import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { nome, email, telefone, nivel, tipoAula, cpf, birthDate } = await request.json()

  // Use service role to create user
  const adminSupabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Generate temp password
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'

  const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const { error: profileErr } = await adminSupabase.from('profiles').insert({
    id: authUser.user.id,
    role: 'aluno',
    full_name: nome,
    email,
    phone: telefone || null,
    nivel: nivel || null,
    tipo_aula: tipoAula || null,
    cpf: cpf || null,
    birth_date: birthDate || null,
  })

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Send password reset so student can set their own password
  await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  return NextResponse.json({ success: true, alunoId: authUser.user.id })
}
