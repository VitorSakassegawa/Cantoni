import assert from 'node:assert/strict'

process.env.CPF_ENCRYPTION_KEY = 'cpf-test-key-with-at-least-32-characters'

const {
  buildEncryptedCpfColumns,
  decryptCpf,
  encryptCpf,
  formatCpf,
  getCpfLast4,
  normalizeCpf,
  resolveCpf,
} = await import('../lib/cpf-security.ts')

assert.equal(normalizeCpf('123.456.789-09'), '12345678909')
assert.equal(formatCpf('12345678909'), '123.456.789-09')
assert.equal(getCpfLast4('12345678909'), '8909')

const encrypted = encryptCpf('123.456.789-09')
assert.equal(typeof encrypted, 'string')
assert.equal(decryptCpf(encrypted), '123.456.789-09')

const columns = buildEncryptedCpfColumns('123.456.789-09')
assert.equal(columns.cpf, null)
assert.equal(columns.cpf_last4, '8909')
assert.equal(resolveCpf(columns), '123.456.789-09')

console.log('cpf-security tests passed')
