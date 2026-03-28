import fs from 'node:fs'
import path from 'node:path'

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

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim())

if (missing.length > 0) {
  console.error('Missing required environment variables:')
  for (const name of missing) {
    console.error(`- ${name}`)
  }
  process.exit(1)
}
