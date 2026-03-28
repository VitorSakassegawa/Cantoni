import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
  GOOGLE_OAUTH_SETUP_SECRET: z.string().min(1).optional(),
  GOOGLE_CALENDAR_ID: z.string().min(1).optional().default('primary'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  CPF_ENCRYPTION_KEY: z.string().min(32).optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  CRON_SECRET: z.string().min(1).optional(),
})

type Env = z.infer<typeof envSchema>

function buildRawEnv() {
  return {
    ...process.env,
  }
}

let cachedEnv: Env | null = null

function shouldAllowPartialEnv() {
  return process.env.NODE_ENV !== 'production'
}

export function getEnv(options?: { allowPartial?: boolean }) {
  if (cachedEnv) {
    return cachedEnv
  }

  const parsed = envSchema.safeParse(buildRawEnv())

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)

    if (!(options?.allowPartial ?? shouldAllowPartialEnv())) {
      throw new Error('Invalid environment variables for runtime execution')
    }

    return buildRawEnv() as unknown as Env
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export function getCronSecret() {
  const secret = getEnv().CRON_SECRET
  if (!secret) {
    throw new Error('CRON_SECRET is required for cron routes')
  }
  return secret
}

export function getSupabasePublicEnv() {
  const currentEnv = getEnv({ allowPartial: false })

  if (!currentEnv.NEXT_PUBLIC_SUPABASE_URL || !currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase public environment variables are required')
  }

  return {
    url: currentEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function getSupabaseServiceEnv() {
  const currentEnv = getEnv({ allowPartial: false })

  if (!currentEnv.NEXT_PUBLIC_SUPABASE_URL || !currentEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service environment variables are required')
  }

  return {
    url: currentEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: currentEnv.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export const env = getEnv({ allowPartial: true })
