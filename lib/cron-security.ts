import { getCronSecret } from './env.ts'
import { secureCompareSecret } from './auth-security.ts'

function extractBearerToken(authorization: string | null) {
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(' ', 2)
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

export function isValidCronRequest(headers: Headers) {
  const expectedSecret = getCronSecret()
  const headerToken = headers.get('x-cron-secret')
  const bearerToken = extractBearerToken(headers.get('authorization'))

  return (
    secureCompareSecret(headerToken, expectedSecret) ||
    secureCompareSecret(bearerToken, expectedSecret)
  )
}
