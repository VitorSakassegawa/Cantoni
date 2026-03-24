import assert from 'node:assert/strict'
import {
  assertPaymentAmountMatches,
  mapMercadoPagoStatus,
  normalizePaymentAmount,
  splitFullName,
} from '../lib/payments.ts'

assert.equal(normalizePaymentAmount('120.456'), 120.46)

assert.throws(() => assertPaymentAmountMatches(100, 99.5), /Payment amount mismatch/)

assert.equal(mapMercadoPagoStatus('approved'), 'pago')
assert.equal(mapMercadoPagoStatus('pending'), 'pendente')
assert.equal(mapMercadoPagoStatus('rejected'), 'pendente')

assert.deepEqual(splitFullName('Gabriel Cantoni Silva'), {
  firstName: 'Gabriel',
  lastName: 'Cantoni Silva',
})

console.log('payment-utils tests passed')
