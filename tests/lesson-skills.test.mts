import assert from 'node:assert/strict'

import { normalizeSkillScores, hasAnySkillScore, averageSkillScores } from '../lib/lesson-skills.ts'

// normalizeSkillScores: clamps 1–10 integers, null for missing/invalid/out-of-range.
const n = normalizeSkillScores({ speaking: 7, listening: 5.6, reading: null, writing: 99 })
assert.equal(n.speaking, 7)
assert.equal(n.listening, 6) // rounded
assert.equal(n.reading, null)
assert.equal(n.writing, null) // out of range → null
assert.deepEqual(normalizeSkillScores(null), { speaking: null, listening: null, reading: null, writing: null })
assert.deepEqual(normalizeSkillScores('garbage'), { speaking: null, listening: null, reading: null, writing: null })
assert.equal(normalizeSkillScores({ speaking: 0 }).speaking, null) // below range

// hasAnySkillScore
assert.equal(hasAnySkillScore({ speaking: null, listening: null, reading: null, writing: null }), false)
assert.equal(hasAnySkillScore({ speaking: 5, listening: null, reading: null, writing: null }), true)

// averageSkillScores: per-skill mean ignoring nulls; skill with no data stays null.
const avg = averageSkillScores([
  { speaking: 6, listening: 5, reading: null, writing: null },
  { speaking: 8, listening: 7, reading: null, writing: null },
  { speaking: 7, listening: null, reading: null, writing: null },
])
assert.equal(avg.speaking, 7) // (6+8+7)/3
assert.equal(avg.listening, 6) // (5+7)/2
assert.equal(avg.reading, null) // never observed
assert.equal(avg.writing, null)
assert.deepEqual(averageSkillScores([]), { speaking: null, listening: null, reading: null, writing: null })

console.log('lesson-skills tests passed')
