type CookieOptions = {
  path?: string
  maxAge?: number
  expires?: Date
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'lax' | 'strict' | 'none' | boolean
}

type CookieWriter = {
  set: (name: string, value: string, options?: CookieOptions) => unknown
}

type CookieReader = {
  getAll: () => Array<{ name: string; value: string }>
}

const AUTH_COOKIE_PATTERNS = [/^sb-/i, /supabase/i, /auth-token/i]

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as {
    code?: string
    status?: number
    message?: string
    __isAuthError?: boolean
  }

  return (
    candidate.code === 'refresh_token_not_found' ||
    (candidate.__isAuthError === true &&
      candidate.status === 400 &&
      typeof candidate.message === 'string' &&
      candidate.message.toLowerCase().includes('refresh token'))
  )
}

export function clearSupabaseAuthCookies(
  cookieReader: CookieReader,
  cookieWriter: CookieWriter
) {
  const authCookies = cookieReader
    .getAll()
    .filter((cookie) => AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(cookie.name)))

  authCookies.forEach((cookie) => {
    cookieWriter.set(cookie.name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
  })
}
