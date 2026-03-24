import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    return NextResponse.json(
      { error: 'Google OAuth setup route is disabled in production' },
      { status: 403 }
    )
  }

  await requireProfessor()

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 60 * 10,
    path: '/',
  })

  const auth = getGoogleAuth()
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })

  return NextResponse.redirect(url)
}
