import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
