import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a proxy that handles missing environment variables during build
    return new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') return new Proxy({} as any, { get: () => () => ({ data: { user: null }, error: null }) })
        return () => ({ data: null, error: new Error('Supabase environment variables are not defined.') })
      }
    })
  }

  return createBrowserClient(url, key)
}
