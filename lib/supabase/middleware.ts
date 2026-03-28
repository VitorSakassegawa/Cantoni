import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { clearSupabaseAuthCookies, isInvalidRefreshTokenError } from '@/lib/supabase/auth-session'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const isAuthPath = request.nextUrl.pathname.startsWith('/login')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !key) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      const sanitizedResponse = isAuthPath
        ? NextResponse.next({ request })
        : NextResponse.redirect(new URL('/login', request.url))

      clearSupabaseAuthCookies(
        { getAll: () => request.cookies.getAll() },
        { set: (name, value, options) => sanitizedResponse.cookies.set(name, value, options) }
      )

      return sanitizedResponse
    }

    throw error
  }

  const url = request.nextUrl.clone()
  const isAuth = url.pathname.startsWith('/login')
  const isDashboard =
    url.pathname.startsWith('/professor') || url.pathname.startsWith('/aluno')
  const isResetPassword = url.pathname.startsWith('/redefinir-senha')

  if (isResetPassword) {
    return supabaseResponse
  }

  if (!user && isDashboard) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuth) {
    // Get user role and redirect accordingly
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    url.pathname = profile?.role === 'professor' ? '/professor' : '/aluno'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
