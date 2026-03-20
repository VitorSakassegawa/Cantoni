import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a proxy that handles missing environment variables during build
    const dummyClient: any = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: null }),
      },
      from: () => {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: null, error: new Error('Supabase environment variables are not defined.') }),
          maybeSingle: async () => ({ data: null, error: new Error('Supabase environment variables are not defined.') }),
          order: () => chain,
          limit: () => chain,
          in: () => chain,
          gte: () => chain,
          lt: () => chain,
        }
        return chain
      }
    }
    return dummyClient
  }

  return createBrowserClient(url, key)
}
