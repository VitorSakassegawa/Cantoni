import assert from 'node:assert/strict'

import { calculateNextSRS, DEFAULT_EASE_FACTOR, MIN_EASE_FACTOR } from '../lib/flashcards-srs.ts'

// A lapse (q < 3) resets repetitions and schedules for tomorrow.
const lapse = calculateNextSRS(1, 30, 5, 2.5)
assert.equal(lapse.lapsed, true)
assert.equal(lapse.interval, 1)
assert.equal(lapse.repetitions, 0)
assert.ok(lapse.easeFactor < 2.5, 'lapse should reduce ease factor')

// First successful recall → 1 day; second → 4 (Bom) or 6 (Fácil).
assert.equal(calculateNextSRS(4, 0, 0, 2.5).interval, 1)
assert.equal(calculateNextSRS(4, 1, 1, 2.5).interval, 4)
assert.equal(calculateNextSRS(5, 1, 1, 2.5).interval, 6)

// The four outcomes must produce genuinely distinct next intervals at steady state.
const base = { interval: 10, reps: 4, ef: 2.5 }
const hard = calculateNextSRS(3, base.interval, base.reps, base.ef).interval
const good = calculateNextSRS(4, base.interval, base.reps, base.ef).interval
const easy = calculateNextSRS(5, base.interval, base.reps, base.ef).interval
assert.ok(hard < good && good < easy, `expected hard<good<easy, got ${hard}/${good}/${easy}`)
assert.ok(hard >= base.interval + 1, 'every success advances at least one day')

// Quality is clamped to 0–5; out-of-range values do not corrupt the schedule.
assert.equal(calculateNextSRS(99, 5, 3, 2.5).lapsed, false)
assert.equal(calculateNextSRS(-7, 5, 3, 2.5).lapsed, true)

// Null/NaN inputs fall back to sane defaults instead of producing NaN.
const fromNull = calculateNextSRS(4, null, null, null)
assert.ok(Number.isFinite(fromNull.interval), 'interval must be finite')
assert.equal(fromNull.interval, 1)
assert.ok(Number.isFinite(fromNull.easeFactor))

// Ease factor never drops below the floor.
let ef: number = 2.5
for (let i = 0; i < 20; i++) ef = calculateNextSRS(0, 1, 0, ef).easeFactor
assert.equal(ef, MIN_EASE_FACTOR)

assert.equal(DEFAULT_EASE_FACTOR, 2.5)

console.log('flashcards-srs tests passed')
