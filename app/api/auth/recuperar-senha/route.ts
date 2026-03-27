import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailRecuperacaoSenha } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    const serviceSupabase = await createServiceClient()
    const normalizedEmail = email.trim().toLowerCase()

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Password recovery link generation error:', linkError)
      return NextResponse.json(
        { error: 'Não foi possível gerar o link de recuperação.' },
        { status: 500 }
      )
    }

    const emailResult = await enviarEmailRecuperacaoSenha({
      to: normalizedEmail,
      nomeAluno: profile?.full_name || 'Aluno(a)',
      recoveryLink: linkData.properties.action_link,
    })

    if (emailResult?.error) {
      console.error('Password recovery email delivery error:', emailResult.error)
      return NextResponse.json(
        { error: emailResult.error.message || 'Não foi possível enviar o e-mail de recuperação.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password recovery route error:', error)
    return NextResponse.json(
      { error: 'Não foi possível processar a recuperação de senha.' },
      { status: 500 }
    )
  }
}
