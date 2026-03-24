import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { nome, email, telefone, nivel, tipoAula, cpf, birthDate } = await request.json()

  if (!nome || !email || !email.includes('@') || !cpf) {
    return NextResponse.json(
      { error: 'Dados obrigatórios (Nome, Email, CPF) inválidos' },
      { status: 400 }
    )
  }

  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) {
    return NextResponse.json(
      { error: 'CPF inválido, deve conter 11 dígitos numéricos' },
      { status: 400 }
    )
  }

  const adminSupabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tempPassword = generateTemporaryPassword()

  const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: nome },
  })

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const { error: profileErr } = await adminSupabase.from('profiles').upsert(
    {
      id: authUser.user.id,
      role: 'aluno',
      full_name: nome,
      email,
      phone: telefone || null,
      nivel: nivel || null,
      tipo_aula: tipoAula || null,
      cpf: cpf || null,
      birth_date: birthDate || null,
    },
    {
      onConflict: 'id',
    }
  )

  if (profileErr) {
    await adminSupabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, alunoId: authUser.user.id })
}
