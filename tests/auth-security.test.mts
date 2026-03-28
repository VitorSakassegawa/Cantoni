import assert from 'node:assert/strict'
import {
  buildPasswordRecoveryRateLimitKey,
  evaluatePasswordRecoveryRateLimit,
  extractRequestIp,
  normalizeRecoveryEmail,
  PASSWORD_RECOVERY_GENERIC_MESSAGE,
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  PASSWORD_RECOVERY_WINDOW_MS,
} from '../lib/auth-security.ts'

assert.equal(normalizeRecoveryEmail('  STUDENT@Email.com '), 'student@email.com')
assert.equal(normalizeRecoveryEmail('invalid-email'), null)
assert.equal(normalizeRecoveryEmail(null), null)

const headers = new Headers({
  'x-forwarded-for': '203.0.113.1, 70.0.0.1',
})
assert.equal(extractRequestIp(headers), '203.0.113.1')
assert.equal(
  buildPasswordRecoveryRateLimitKey('203.0.113.1', 'student@email.com'),
  '203.0.113.1:student@email.com'
)

const now = Date.now()
const underLimit = evaluatePasswordRecoveryRateLimit(
  [now - 1_000, now - 2_000],
  now,
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  PASSWORD_RECOVERY_WINDOW_MS
)
assert.equal(underLimit.allowed, true)
assert.equal(underLimit.retryAfterSeconds, 0)

const limited = evaluatePasswordRecoveryRateLimit(
  [now - 1_000, now - 2_000, now - 3_000],
  now,
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  PASSWORD_RECOVERY_WINDOW_MS
)
assert.equal(limited.allowed, false)
assert.ok(limited.retryAfterSeconds > 0)

assert.match(PASSWORD_RECOVERY_GENERIC_MESSAGE, /Se existir uma conta/i)

console.log('auth-security tests passed')
