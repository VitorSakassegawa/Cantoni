import { NextResponse } from 'next/server'
import { getGoogleAuth } from '@/lib/google-calendar'

export async function GET() {
  const auth = getGoogleAuth()
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
  return NextResponse.redirect(url)
}
