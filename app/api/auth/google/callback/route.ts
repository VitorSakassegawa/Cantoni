import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  const auth = getGoogleAuth()
  const { tokens } = await auth.getToken(code)

  // In production, save tokens.refresh_token to environment or secure storage
  console.log('Google refresh token:', tokens.refresh_token)
  console.log('Save this as GOOGLE_REFRESH_TOKEN in your .env.local')

  return NextResponse.json({
    message: 'Token obtido com sucesso! Copie o refresh_token abaixo e salve no seu .env.local',
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
  })
}
