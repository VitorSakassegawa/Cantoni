import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { getEnv } from '@/lib/env'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const env = getEnv({ allowPartial: true })

  if (isProduction && !env.GOOGLE_OAUTH_SETUP_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth setup route is locked in production' },
      { status: 403 }
    )
  }

  await requireProfessor()

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('google_oauth_state')?.value
  const setupAllowed = cookieStore.get('google_oauth_setup_allowed')?.value
  cookieStore.delete('google_oauth_state')
  cookieStore.delete('google_oauth_setup_allowed')

  if (!code) {
    return NextResponse.json({ error: 'No code' }, { status: 400 })
  }

  if (isProduction && setupAllowed !== '1') {
    return NextResponse.json({ error: 'Missing Google OAuth setup authorization' }, { status: 403 })
  }

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 })
  }

  const auth = getGoogleAuth()
  const { tokens } = await auth.getToken(code)

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          'Google nao retornou um refresh_token. Revogue o acesso anterior da conta e tente novamente com prompt de consentimento.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    message: 'Token obtido com sucesso. Salve o refresh_token na configuracao segura do servidor e atualize o Vercel.',
    refresh_token: tokens.refresh_token,
  })
}
