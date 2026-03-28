import crypto from 'node:crypto'
import { getEnv } from './env.ts'

type MaybeCpfRow = {
  cpf?: string | null
  cpf_encrypted?: string | null
  cpf_last4?: string | null
}

function getCpfEncryptionKey() {
  const key = getEnv({ allowPartial: false }).CPF_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CPF_ENCRYPTION_KEY is required to access CPF data')
  }

  return crypto.createHash('sha256').update(key).digest()
}

export function normalizeCpf(value: string | null | undefined) {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

export function formatCpf(value: string | null | undefined) {
  const digits = normalizeCpf(value)
  if (!digits) {
    return null
  }

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function getCpfLast4(value: string | null | undefined) {
  const digits = normalizeCpf(value)
  return digits ? digits.slice(-4) : null
}

export function encryptCpf(value: string) {
  const normalizedCpf = normalizeCpf(value)
  if (!normalizedCpf) {
    throw new Error('Invalid CPF')
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getCpfEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(normalizedCpf, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptCpf(ciphertext: string | null | undefined) {
  if (!ciphertext) {
    return null
  }

  const payload = Buffer.from(ciphertext, 'base64')
  const iv = payload.subarray(0, 12)
  const authTag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getCpfEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  return formatCpf(decrypted)
}

export function resolveCpf(row: MaybeCpfRow | null | undefined) {
  if (!row) {
    return null
  }

  if (row.cpf_encrypted) {
    return decryptCpf(row.cpf_encrypted)
  }

  return formatCpf(row.cpf)
}

export function buildEncryptedCpfColumns(value: string | null | undefined) {
  const formattedCpf = formatCpf(value)

  if (!formattedCpf) {
    return {
      cpf: null,
      cpf_encrypted: null,
      cpf_last4: null,
    }
  }

  return {
    cpf: null,
    cpf_encrypted: encryptCpf(formattedCpf),
    cpf_last4: getCpfLast4(formattedCpf),
  }
}
