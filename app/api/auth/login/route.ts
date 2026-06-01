import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  buildLoginRateLimitKey,
  extractRequestIp,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_SCOPE,
  LOGIN_WINDOW_MS,
  normalizeRateLimitResult,
} from '@/lib/auth-security'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao autenticar'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
    }

    // Throttle brute-force / credential-stuffing attempts (MITRE ATT&CK T1110)
    // before touching the auth provider. Keyed by IP + email so a single user
    // succeeding cannot lock out others.
    const requestIp = extractRequestIp(request.headers)
    const serviceSupabase = await createServiceClient()
    const { data: rateLimitData, error: rateLimitError } = await serviceSupabase.rpc(
      'consume_rate_limit',
      {
        p_scope: LOGIN_RATE_LIMIT_SCOPE,
        p_identifier: buildLoginRateLimitKey(requestIp, email),
        p_max_attempts: LOGIN_MAX_ATTEMPTS,
        p_window_seconds: Math.floor(LOGIN_WINDOW_MS / 1000),
      }
    )

    if (rateLimitError) {
      console.error('Login rate limit error:', rateLimitError)
      return NextResponse.json(
        { error: 'Não foi possível processar o login agora. Tente novamente.' },
        { status: 503 }
      )
    }

    const rateLimit = normalizeRateLimitResult(rateLimitData)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      )
    }

    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Não foi possível autenticar.' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      success: true,
      redirectTo: profile?.role === 'professor' ? '/professor' : '/aluno',
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
