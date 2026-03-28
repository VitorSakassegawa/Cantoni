import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enviarEmailPrimeiroAcesso } from '@/lib/resend'
import { buildEncryptedCpfColumns, normalizeCpf } from '@/lib/cpf-security'

function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') {
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  }

  const { nome, email, telefone, nivel, tipoAula, cpf, birthDate } = await request.json()

  if (!nome || !email || !email.includes('@') || !cpf) {
    return NextResponse.json(
      { error: 'Dados obrigatorios invalidos. Informe nome, e-mail e CPF.' },
      { status: 400 }
    )
  }

  const cleanCPF = normalizeCpf(cpf)
  if (!cleanCPF || cleanCPF.length !== 11) {
    return NextResponse.json(
      { error: 'CPF invalido. Ele deve conter 11 digitos numericos.' },
      { status: 400 }
    )
  }

  const serviceSupabase = await createServiceClient()
  const tempPassword = generateTemporaryPassword()

  const { data: authUser, error: authErr } = await serviceSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: nome },
  })

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const { error: profileErr } = await serviceSupabase.from('profiles').upsert(
    {
      id: authUser.user.id,
      role: 'aluno',
      full_name: nome,
      email,
      phone: telefone || null,
      nivel: nivel || null,
      tipo_aula: tipoAula || null,
      ...buildEncryptedCpfColumns(cpf),
      birth_date: birthDate || null,
    },
    {
      onConflict: 'id',
    }
  )

  if (profileErr) {
    await serviceSupabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  let emailWarning: string | null = null
  try {
    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      emailWarning =
        linkError?.message || 'Aluno criado, mas o link de primeiro acesso nao pode ser gerado.'
    } else {
      const emailResult = await enviarEmailPrimeiroAcesso({
        to: email,
        nomeAluno: nome,
        setupPasswordLink: linkData.properties.action_link,
      })

      if (emailResult?.error) {
        emailWarning =
          emailResult.error.message || 'Aluno criado, mas o e-mail de primeiro acesso nao pode ser entregue.'
      }
    }
  } catch (error) {
    console.error('Student first access email error:', error)
    emailWarning = 'Aluno criado, mas houve falha ao enviar o e-mail de primeiro acesso.'
  }

  return NextResponse.json({
    success: true,
    alunoId: authUser.user.id,
    emailWarning,
  })
}
