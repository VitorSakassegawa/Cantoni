import { createBrowserClient } from '@supabase/ssr'

type PublicSupabaseEnv = {
  url?: string
  anonKey?: string
}

declare global {
  interface Window {
    __SUPABASE_PUBLIC_ENV__?: PublicSupabaseEnv
  }
}

function readSupabasePublicEnv() {
  const runtimeEnv =
    typeof window !== 'undefined' ? window.__SUPABASE_PUBLIC_ENV__ : undefined

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv?.url
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv?.anonKey

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are required')
  }

  return { url, anonKey }
}

export function createClient() {
  const { url, anonKey } = readSupabasePublicEnv()
  return createBrowserClient(url, anonKey)
}
