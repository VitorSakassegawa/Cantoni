import { NextRequest, NextResponse } from 'next/server'
import { createRecoveryClient } from '@/lib/supabase/server'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

const INVALID_LINK = 'Link de redefinição inválido ou expirado. Solicite um novo e-mail.'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      password?: string
      accessToken?: string
      refreshToken?: string
      tokenHash?: string
    }

    const password = body.password?.trim()
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 }
      )
    }

    // SECURITY: resolve the account strictly from the recovery credential in the
    // link, on a cookie-less client. This prevents the reset from ever targeting
    // whoever is currently logged in on the device.
    const supabase = createRecoveryClient()

    const accessToken = body.accessToken?.trim()
    const refreshToken = body.refreshToken?.trim()
    const tokenHash = body.tokenHash?.trim()

    let recoveryUserId: string | null = null

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error || !data.user) {
        return NextResponse.json({ error: INVALID_LINK }, { status: 401 })
      }
      recoveryUserId = data.user.id
    } else if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash,
      })
      if (error || !data.user) {
        return NextResponse.json({ error: INVALID_LINK }, { status: 401 })
      }
      recoveryUserId = data.user.id
    } else {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Drop the ephemeral recovery session; it never touched the browser cookies.
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, userId: recoveryUserId })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Erro ao redefinir a senha.') },
      { status: 500 }
    )
  }
}
