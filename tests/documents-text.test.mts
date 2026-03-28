import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(
  join(import.meta.dirname, '..', 'lib', 'documents.ts'),
  'utf8'
)

assert.match(source, /function formatCountWithWords\(count: number\)/)
assert.match(source, /function getContractFormatLabel\(contract: DocumentContract\)/)

assert.doesNotMatch(source, /String\(contract\.aulas_totais\)/)
assert.doesNotMatch(source, /aula\(s\)/)
assert.doesNotMatch(source, /parcela\(s\)/)
assert.doesNotMatch(source, /cancelamento\(s\)/)
assert.doesNotMatch(source, /aditivo\(s\)/)

assert.match(source, /formatCountWithWords\(contract\.aulas_totais\)/)
assert.match(source, /formatCountWithWords\(paymentCount\)/)
assert.match(source, /formatCountWithWords\(rescheduleLimit\)/)

console.log('documents-text tests passed')
