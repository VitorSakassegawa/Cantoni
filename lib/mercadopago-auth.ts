import crypto from 'crypto'

/** Comparação de digests hex em tempo constante (evita timing attack). */
function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length === 0 || ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

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

    const isValid = digests.some(({ digest }) => safeEqualHex(digest, v1))

    if (!isValid) {
      // Não logar v1/digests/manifests para não vazar detalhes sensíveis em produção.
      console.error('MP Auth: Signature mismatch')
    }

    return isValid
  } catch (error) {
    console.error('MP Auth: Validation error', error)
    return false
  }
}

/**
 * Rejeita notificações cujo timestamp (ts) está fora de uma janela de tolerância,
 * como defesa adicional contra replay de requisições capturadas.
 *
 * ATENÇÃO: o Mercado Pago reenvia notificações (mesma assinatura e mesmo ts) quando
 * o endpoint falha, então a janela deve ser generosa para não descartar retries
 * legítimos. O processamento já é idempotente (busca o status real via payment.get),
 * portanto isto é defesa em profundidade, não a proteção principal. Passe
 * toleranceSeconds <= 0 para desabilitar.
 */
export function isWebhookTimestampFresh(xSignature: string, toleranceSeconds: number): boolean {
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds <= 0) {
    return true // janela desabilitada
  }
  try {
    const tsRaw = xSignature
      .split(',')
      .map((part) => part.split('='))
      .find(([key]) => key?.trim() === 'ts')?.[1]
      ?.trim()
    if (!tsRaw) return true // ts ausente: a assinatura já é validada à parte
    let ts = Number(tsRaw)
    if (!Number.isFinite(ts)) return true
    if (ts > 1e12) ts = Math.floor(ts / 1000) // normaliza ms -> s
    const nowSeconds = Math.floor(Date.now() / 1000)
    return Math.abs(nowSeconds - ts) <= toleranceSeconds
  } catch {
    return true // fail-open: não derruba pagamentos por erro de parsing
  }
}
