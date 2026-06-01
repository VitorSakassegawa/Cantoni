import assert from 'node:assert/strict'

// Precisa estar setado antes de encriptar (a chave é derivada do CPF_ENCRYPTION_KEY).
process.env.CPF_ENCRYPTION_KEY = 'x'.repeat(40)

import { encryptPlacementKey, decryptPlacementKey } from '../lib/placement-token.ts'

const payload = {
  module: 'grammar',
  level: 'B1',
  key: [
    { id: 1, correctAnswer: 2 },
    { id: 2, correctAnswer: 0 },
  ],
  issuedAt: 1700000000000,
}

const token = encryptPlacementKey(payload)
assert.equal(typeof token, 'string')

// round-trip
assert.deepEqual(decryptPlacementKey(token), payload)

// o cliente não consegue LER o gabarito (token não contém o plaintext)
assert.ok(!token.includes('correctAnswer'))
assert.ok(!token.includes('"key"'))

// o cliente não consegue FORJAR (auth tag) nem usar lixo
assert.equal(decryptPlacementKey(token.slice(0, -4) + 'AAAA'), null)
assert.equal(decryptPlacementKey('garbage'), null)
assert.equal(decryptPlacementKey(''), null)
assert.equal(decryptPlacementKey(null), null)

console.log('placement-token tests passed')
