import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const dummyClient = {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: () => {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => chain,
          limit: () => chain,
        }
        return chain
      }
    }
    return dummyClient as any
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    const dummyClient = {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: () => {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => chain,
          limit: () => chain,
        }
        return chain
      }
    }
    return dummyClient as any
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
