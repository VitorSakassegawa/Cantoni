import crypto from 'node:crypto'

// Token opaco e assinado (AES-256-GCM) que carrega o GABARITO do módulo de
// nivelamento. O cliente recebe o token mas NÃO consegue lê-lo (encriptado) nem
// forjá-lo (auth tag). Apenas o servidor decripta para corrigir. Isso fecha duas
// brechas: (1) o gabarito não vai mais legível para o browser; (2) a correção
// passa a ser feita no servidor, não confiando no flag `correct` do cliente.

const ALGO = 'aes-256-gcm'

export type PlacementKeyEntry = { id: number; correctAnswer: number }

export type PlacementKeyPayload = {
  module: string
  level: string
  key: PlacementKeyEntry[]
  issuedAt: number
}

function getPlacementKey() {
  const secret = process.env.CPF_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('CPF_ENCRYPTION_KEY (>= 32 chars) é obrigatória para tokens de nivelamento')
  }
  // Separação de domínio: a chave do nivelamento difere da usada para CPF.
  return crypto.createHash('sha256').update(`placement-v1:${secret}`).digest()
}

export function encryptPlacementKey(payload: PlacementKeyPayload): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getPlacementKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
}

export function decryptPlacementKey(token: string | null | undefined): PlacementKeyPayload | null {
  if (!token || typeof token !== 'string') return null
  try {
    const payload = Buffer.from(token, 'base64url')
    if (payload.length <= 28) return null
    const iv = payload.subarray(0, 12)
    const authTag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    const decipher = crypto.createDecipheriv(ALGO, getPlacementKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    const parsed = JSON.parse(decrypted) as PlacementKeyPayload
    if (!parsed || !Array.isArray(parsed.key)) return null
    return parsed
  } catch {
    return null
  }
}
