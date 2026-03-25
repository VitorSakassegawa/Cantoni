import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { clearSupabaseAuthCookies } from '@/lib/supabase/auth-session'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!), {
    status: 303,
  })

  const cookieStore = await cookies()
  clearSupabaseAuthCookies(
    { getAll: () => cookieStore.getAll() },
    { set: (name, value, options) => response.cookies.set(name, value, options) }
  )

  return response
}
