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

  // Server-side validation
  if (!nome || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'Dados obrigatórios inválidos' }, { status: 400 })
  }

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
    user_metadata: { full_name: nome }
  })

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  // Use upsert to avoid conflict with the 'on_auth_user_created' trigger
  const { error: profileErr } = await adminSupabase.from('profiles').upsert({
    id: authUser.user.id,
    role: 'aluno',
    full_name: nome,
    email,
    phone: telefone || null,
    nivel: nivel || null,
    tipo_aula: tipoAula || null,
    cpf: cpf || null,
    birth_date: birthDate || null,
  }, { 
    onConflict: 'id' 
  })

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })


  return NextResponse.json({ success: true, alunoId: authUser.user.id })
}
