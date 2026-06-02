import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv, getSupabaseServiceEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabasePublicEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server components may not allow setting cookies during render.
        }
      },
    },
  })
}

/**
 * Cookie-less anon client for the password-recovery flow. It is deliberately
 * NOT bound to the request cookies, so the user being modified is resolved
 * strictly from the recovery token in the link — never from whoever happens to
 * be logged in on the device (which previously let a reset hit the wrong user).
 */
export function createRecoveryClient() {
  const { url, anonKey } = getSupabasePublicEnv()

  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export async function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv()

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
