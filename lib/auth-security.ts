export const PASSWORD_RECOVERY_WINDOW_MS = 15 * 60 * 1000
export const PASSWORD_RECOVERY_MAX_ATTEMPTS = 3

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
