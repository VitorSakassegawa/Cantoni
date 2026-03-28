import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName)
  if (!fs.existsSync(filePath)) {
    return
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      continue
    }

    const [rawKey, ...rawValue] = line.split('=')
    const key = rawKey.trim()
    if (!key || process.env[key]) {
      continue
    }

    process.env[key] = rawValue.join('=').trim()
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

function normalizeCpf(value) {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

function formatCpf(value) {
  const digits = normalizeCpf(value)
  return digits ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null
}

function getKey() {
  const raw = process.env.CPF_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('CPF_ENCRYPTION_KEY is required')
  }

  return crypto.createHash('sha256').update(raw).digest()
}

function encryptCpf(value) {
  const formatted = formatCpf(value)
  if (!formatted) {
    return null
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(formatted, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decryptCpf(ciphertext) {
  if (!ciphertext) {
    return null
  }

  const payload = Buffer.from(ciphertext, 'base64')
  const iv = payload.subarray(0, 12)
  const tag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Supabase environment variables are required')
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, cpf, cpf_encrypted, cpf_last4')
  .or('cpf.not.is.null,cpf_encrypted.not.is.null')

if (error) {
  throw error
}

let updated = 0

for (const profile of profiles || []) {
  const plaintextDigits = normalizeCpf(profile.cpf)
  const encryptedDigits = decryptCpf(profile.cpf_encrypted)
  const canonicalDigits = plaintextDigits || normalizeCpf(encryptedDigits)

  if (!canonicalDigits) {
    continue
  }

  const nextEncryptedCpf = profile.cpf_encrypted || encryptCpf(canonicalDigits)
  const nextLast4 = canonicalDigits.slice(-4)
  const needsPlaintextRemoval = Boolean(profile.cpf)
  const needsEncryptedCpf = !profile.cpf_encrypted
  const needsLast4Repair = profile.cpf_last4 !== nextLast4

  if (!needsPlaintextRemoval && !needsEncryptedCpf && !needsLast4Repair) {
    continue
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      cpf: null,
      cpf_encrypted: nextEncryptedCpf,
      cpf_last4: nextLast4,
    })
    .eq('id', profile.id)

  if (updateError) {
    throw updateError
  }

  updated += 1
}

console.log(`Encrypted CPF records updated: ${updated}`)
