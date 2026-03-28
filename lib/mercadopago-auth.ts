import crypto from 'crypto'

/**
 * Validates the Mercado Pago webhook signature (x-signature).
 * @param xSignature The value of the x-signature header.
 * @param resourceId The ID of the resource (payment) being notified.
 * @param secret The Webhook Secret from Mercado Pago panel.
 * @returns boolean indicating if the signature is valid.
 */
export function validateMPSignature(
  xSignature: string,
  resourceId: string,
  secret: string,
  xRequestId?: string | null
): boolean {
  if (!xSignature || !resourceId || !secret) {
    console.warn('MP Auth: Missing parameters for validation')
    return false
  }

  try {
    const parts = xSignature.split(',')
    let ts = ''
    let v1 = ''

    parts.forEach(part => {
      const [key, value] = part.split('=')
      if (key?.trim() === 'ts') ts = value?.trim()
      if (key?.trim() === 'v1') v1 = value?.trim()
    })

    if (!ts || !v1) {
      console.warn('MP Auth: Invalid x-signature format')
      return false
    }

    const normalizedResourceIds = Array.from(
      new Set([
        resourceId.trim(),
        resourceId.trim().toLowerCase(),
      ].filter(Boolean))
    )

    const manifests = normalizedResourceIds.flatMap((candidateId) =>
      [
        xRequestId ? `id:${candidateId};request-id:${xRequestId};ts:${ts};` : null,
        `id:${candidateId};ts:${ts};`,
      ].filter(Boolean) as string[]
    )

    const digests = manifests.map((manifest) => {
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(manifest)
      return {
        manifest,
        digest: hmac.digest('hex'),
      }
    })

    const isValid = digests.some(({ digest }) => digest === v1)

    if (!isValid) {
      console.error('MP Auth: Signature mismatch!')
      console.error(`MP Auth: Received v1: ${v1}`)
      digests.forEach(({ manifest, digest }) => {
        console.error(`MP Auth: Generated Digest: ${digest}`)
        console.error(`MP Auth: Manifest used: ${manifest}`)
      })
    }

    return isValid
  } catch (error) {
    console.error('MP Auth: Validation error', error)
    return false
  }
}
