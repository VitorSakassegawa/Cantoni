import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { getEnv } from '@/lib/env'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const isProduction = process.env.NODE_ENV === 'production'
  const env = getEnv({ allowPartial: true })
  const requestUrl = new URL(request.url)
  const providedSecret = requestUrl.searchParams.get('setup')

  if (isProduction && (!env.GOOGLE_OAUTH_SETUP_SECRET || providedSecret !== env.GOOGLE_OAUTH_SETUP_SECRET)) {
    return NextResponse.json(
      { error: 'Google OAuth setup route is locked in production' },
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
  cookieStore.set('google_oauth_setup_allowed', '1', {
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
      'https://www.googleapis.com/auth/meetings.space.readonly',
    ],
  })

  return NextResponse.redirect(url)
}
