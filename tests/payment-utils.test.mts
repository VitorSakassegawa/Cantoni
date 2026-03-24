import assert from 'node:assert/strict'
import {
  assertPaymentAmountMatches,
  mapMercadoPagoStatus,
  normalizePaymentAmount,
  splitFullName,
} from '../lib/payments.ts'
import { calculateNextStreak } from '../lib/streak-utils.ts'

assert.equal(normalizePaymentAmount('120.456'), 120.46)

assert.throws(() => assertPaymentAmountMatches(100, 99.5), /Payment amount mismatch/)

assert.equal(mapMercadoPagoStatus('approved'), 'pago')
assert.equal(mapMercadoPagoStatus('pending'), 'pendente')
assert.equal(mapMercadoPagoStatus('rejected'), 'pendente')

assert.deepEqual(splitFullName('Gabriel Cantoni Silva'), {
  firstName: 'Gabriel',
  lastName: 'Cantoni Silva',
})

assert.deepEqual(calculateNextStreak(0, null, '2026-03-24'), {
  streakCount: 1,
  lastActivityDate: '2026-03-24',
  changed: true,
})

assert.deepEqual(calculateNextStreak(3, '2026-03-23', '2026-03-24'), {
  streakCount: 4,
  lastActivityDate: '2026-03-24',
  changed: true,
})

assert.deepEqual(calculateNextStreak(4, '2026-03-24', '2026-03-24'), {
  streakCount: 4,
  lastActivityDate: '2026-03-24',
  changed: false,
})

assert.deepEqual(calculateNextStreak(5, '2026-03-20', '2026-03-24'), {
  streakCount: 1,
  lastActivityDate: '2026-03-24',
  changed: true,
})

console.log('payment-utils tests passed')
