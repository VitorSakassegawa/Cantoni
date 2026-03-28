import crypto from 'crypto'

export const PASSWORD_RECOVERY_WINDOW_MS = 15 * 60 * 1000
export const PASSWORD_RECOVERY_MAX_ATTEMPTS = 3
export const PASSWORD_RECOVERY_RATE_LIMIT_SCOPE = 'password_recovery'

export const PASSWORD_RECOVERY_GENERIC_MESSAGE =
  'Se existir uma conta com este e-mail, enviaremos um link de recuperação em instantes.'

export function normalizeRecoveryEmail(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized || !normalized.includes('@')) {
    return null
  }

  return normalized
}

export function extractRequestIp(headers: Headers) {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return headers.get('x-real-ip') || 'unknown'
}

export function buildPasswordRecoveryRateLimitKey(ip: string, email: string) {
  return `${ip}:${email}`
}

export function secureCompareSecret(candidate: string | null | undefined, expected: string) {
  if (!candidate) {
    return false
  }

  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
}

export function prunePasswordRecoveryAttempts(
  attempts: number[],
  now = Date.now(),
  windowMs = PASSWORD_RECOVERY_WINDOW_MS
) {
  return attempts.filter((timestamp) => now - timestamp < windowMs)
}

export function evaluatePasswordRecoveryRateLimit(
  attempts: number[],
  now = Date.now(),
  maxAttempts = PASSWORD_RECOVERY_MAX_ATTEMPTS,
  windowMs = PASSWORD_RECOVERY_WINDOW_MS
) {
  const recentAttempts = prunePasswordRecoveryAttempts(attempts, now, windowMs)

  if (recentAttempts.length < maxAttempts) {
    return {
      allowed: true,
      recentAttempts,
      retryAfterSeconds: 0,
    }
  }

  const oldestRelevantAttempt = recentAttempts[0]
  const retryAfterMs = Math.max(0, windowMs - (now - oldestRelevantAttempt))

  return {
    allowed: false,
    recentAttempts,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  }
}

export type PasswordRecoveryRateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export function normalizePasswordRecoveryRateLimitResult(
  payload: unknown
): PasswordRecoveryRateLimitResult {
  const row = Array.isArray(payload) ? payload[0] : payload

  if (!row || typeof row !== 'object') {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    }
  }

  const typedRow = row as {
    allowed?: boolean | string | number | null
    retry_after_seconds?: number | string | null
  }

  return {
    allowed:
      typedRow.allowed === true ||
      typedRow.allowed === 'true' ||
      typedRow.allowed === 1,
    retryAfterSeconds: Math.max(0, Number(typedRow.retry_after_seconds ?? 0) || 0),
  }
}
