import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailRecuperacaoSenha } from '@/lib/resend'
import {
  buildPasswordRecoveryRateLimitKey,
  extractRequestIp,
  normalizeRecoveryEmail,
  normalizePasswordRecoveryRateLimitResult,
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  PASSWORD_RECOVERY_GENERIC_MESSAGE,
  PASSWORD_RECOVERY_RATE_LIMIT_SCOPE,
  PASSWORD_RECOVERY_WINDOW_MS,
} from '@/lib/auth-security'

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: unknown }
    const normalizedEmail = normalizeRecoveryEmail(email)

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    const requestIp = extractRequestIp(request.headers)
    const rateLimitKey = buildPasswordRecoveryRateLimitKey(requestIp, normalizedEmail)
    const serviceSupabase = await createServiceClient()
    const { data: rateLimitData, error: rateLimitError } = await serviceSupabase.rpc(
      'consume_rate_limit',
      {
        p_scope: PASSWORD_RECOVERY_RATE_LIMIT_SCOPE,
        p_identifier: rateLimitKey,
        p_max_attempts: PASSWORD_RECOVERY_MAX_ATTEMPTS,
        p_window_seconds: Math.floor(PASSWORD_RECOVERY_WINDOW_MS / 1000),
      }
    )

    if (rateLimitError) {
      console.error('Password recovery rate limit error:', rateLimitError)
      return NextResponse.json(
        { error: 'Não foi possível processar sua solicitação agora.' },
        { status: 503 }
      )
    }

    const rateLimit = normalizePasswordRecoveryRateLimitResult(rateLimitData)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas solicitações de recuperação. Tente novamente em alguns minutos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      )
    }

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!profile?.email) {
      return NextResponse.json({
        success: true,
        message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
      })
    }

    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Password recovery link generation error:', linkError)
      return NextResponse.json({
        success: true,
        message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
      })
    }

    const emailResult = await enviarEmailRecuperacaoSenha({
      to: normalizedEmail,
      nomeAluno: profile.full_name || 'Aluno(a)',
      recoveryLink: linkData.properties.action_link,
    })

    if (emailResult?.error) {
      console.error('Password recovery email delivery error:', emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
    })
  } catch (error) {
    console.error('Password recovery route error:', error)
    return NextResponse.json({
      success: true,
      message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
    })
  }
}
