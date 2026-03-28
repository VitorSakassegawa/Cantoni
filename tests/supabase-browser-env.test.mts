import assert from 'node:assert/strict'

function resetWindow() {
  delete (globalThis as typeof globalThis & { window?: Window }).window
}

async function importClientModule() {
  return import(`../lib/supabase/client.ts?cacheBust=${Date.now()}-${Math.random()}`)
}

resetWindow()
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const { __internal } = await importClientModule()

assert.throws(
  () => __internal.readSupabasePublicEnv(),
  /Supabase public environment variables are required/
)

;(globalThis as typeof globalThis & {
  window?: { __SUPABASE_PUBLIC_ENV__?: { url?: string; anonKey?: string } }
}).window = {
  __SUPABASE_PUBLIC_ENV__: {
    url: 'https://example.supabase.co',
    anonKey: 'anon-key-from-window',
  },
}

assert.deepEqual(__internal.readSupabasePublicEnv(), {
  url: 'https://example.supabase.co',
  anonKey: 'anon-key-from-window',
})

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://env.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-from-env'

assert.deepEqual(__internal.readSupabasePublicEnv(), {
  url: 'https://env.supabase.co',
  anonKey: 'anon-key-from-env',
})

resetWindow()
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('supabase-browser-env tests passed')
