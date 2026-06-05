import assert from 'node:assert/strict'

import { daysOverdue, getEscalationTier } from '../lib/payment-escalation.ts'

// daysOverdue
assert.equal(daysOverdue('2026-06-01', '2026-06-01'), 0)
assert.equal(daysOverdue('2026-06-01', '2026-06-05'), 4)
assert.equal(daysOverdue('2026-06-10', '2026-06-01'), -9) // not yet due
assert.equal(daysOverdue('garbage', '2026-06-01'), 0)

// tiers: <1 none, 1-6 suave, 7-14 firme, 15+ urgente
assert.equal(getEscalationTier('2026-06-01', '2026-06-01'), null) // same day, not overdue
assert.equal(getEscalationTier('2026-06-10', '2026-06-01'), null) // future
assert.equal(getEscalationTier('2026-06-01', '2026-06-03')?.tier, 'suave') // 2 days
assert.equal(getEscalationTier('2026-06-01', '2026-06-08')?.tier, 'firme') // 7 days
assert.equal(getEscalationTier('2026-06-01', '2026-06-14')?.tier, 'firme') // 13 days
assert.equal(getEscalationTier('2026-06-01', '2026-06-16')?.tier, 'urgente') // 15 days
assert.equal(getEscalationTier('2026-06-01', '2026-06-30')?.days, 29)

console.log('payment-escalation tests passed')
