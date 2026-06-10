import assert from 'node:assert/strict'

import { evaluatePlacementEligibility } from '../lib/placement-eligibility.ts'

const NOW = new Date('2026-06-10T12:00:00-03:00')
const LAST_RESULT = '2026-06-01T12:00:00-03:00'

// Same-semester baseline: no contracts events, no invites → blocked.
const blocked = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  contracts: [],
  now: NOW,
})
assert.equal(blocked.allowed, false)
assert.equal(blocked.reason, 'blocked')

// First test is always allowed, with or without invites.
const firstTest = evaluatePlacementEligibility({ latestResultAt: null, now: NOW })
assert.equal(firstTest.allowed, true)
assert.equal(firstTest.reason, 'first_test')

// Active invite without window unlocks the test.
const openInvite = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  invites: [{ status: 'pending', valid_from: null, valid_until: null }],
  now: NOW,
})
assert.equal(openInvite.allowed, true)
assert.equal(openInvite.reason, 'professor_invite')

// Invite inside its validity window unlocks; description mentions the deadline.
const windowed = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  invites: [{ status: 'pending', valid_from: '2026-06-09T00:00:00-03:00', valid_until: '2026-06-12T23:59:59-03:00' }],
  now: NOW,
})
assert.equal(windowed.allowed, true)
assert.equal(windowed.reason, 'professor_invite')
assert.match(windowed.description, /válido até/i)

// Invite scheduled for the future blocks, but announces the opening date.
const scheduled = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  invites: [{ status: 'pending', valid_from: '2026-06-20T00:00:00-03:00', valid_until: null }],
  now: NOW,
})
assert.equal(scheduled.allowed, false)
assert.equal(scheduled.reason, 'blocked')
assert.equal(scheduled.title, 'Novo teste agendado')

// Expired invite does not unlock and does not announce anything special.
const expired = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  invites: [{ status: 'pending', valid_from: null, valid_until: '2026-06-05T23:59:59-03:00' }],
  now: NOW,
})
assert.equal(expired.allowed, false)
assert.equal(expired.title, 'Novo teste ainda não liberado')

// Used/revoked invites are ignored entirely.
const consumed = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  invites: [
    { status: 'used', valid_from: null, valid_until: null },
    { status: 'revoked', valid_from: null, valid_until: null },
  ],
  now: NOW,
})
assert.equal(consumed.allowed, false)

// Legacy boolean release still works when there is no invite.
const legacy = evaluatePlacementEligibility({
  placementTestCompleted: false,
  latestResultAt: LAST_RESULT,
  now: NOW,
})
assert.equal(legacy.allowed, true)
assert.equal(legacy.reason, 'professor_approved')

// Automatic rules still take precedence (new contract after last test).
const newContract = evaluatePlacementEligibility({
  placementTestCompleted: true,
  latestResultAt: LAST_RESULT,
  contracts: [{ status: 'ativo', data_inicio: '2026-06-05T00:00:00-03:00', data_fim: null }],
  invites: [{ status: 'pending', valid_from: null, valid_until: null }],
  now: NOW,
})
assert.equal(newContract.allowed, true)
assert.equal(newContract.reason, 'new_contract')

console.log('placement-eligibility tests passed')
