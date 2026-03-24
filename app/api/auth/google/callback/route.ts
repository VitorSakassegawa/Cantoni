import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Google OAuth setup route is disabled in production' },
      { status: 403 }
    )
  }

  await requireProfessor()

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('google_oauth_state')?.value
  cookieStore.delete('google_oauth_state')

  if (!code) {
    return NextResponse.json({ error: 'No code' }, { status: 400 })
  }

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 })
  }

  const auth = getGoogleAuth()
  const { tokens } = await auth.getToken(code)

  return NextResponse.json({
    message:
      'Token obtido com sucesso em ambiente local. Salve o refresh_token em sua configuração segura do servidor.',
    refresh_token: tokens.refresh_token,
  })
}
