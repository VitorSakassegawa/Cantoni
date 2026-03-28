import assert from 'node:assert/strict'

import {
  countPlacementCorrectAnswers,
  hasDetailedPlacementAnswers,
  normalizePlacementAnswers,
} from '../lib/placement-test-utils.ts'

const normalized = normalizePlacementAnswers([
  {
    id: 1,
    question: 'Choose the correct sentence',
    options: ['She go', 'She goes', 'She going', 'She gone'],
    selected: 1,
    correct: true,
    correctAnswer: 1,
  },
  {
    correct: false,
  },
])

assert.deepEqual(normalized[0], {
  id: 1,
  question: 'Choose the correct sentence',
  options: ['She go', 'She goes', 'She going', 'She gone'],
  selected: 1,
  correct: true,
  correctAnswer: 1,
})

assert.deepEqual(normalized[1], {
  id: null,
  question: null,
  options: null,
  selected: null,
  correct: false,
  correctAnswer: null,
})

assert.equal(countPlacementCorrectAnswers(normalized), 1)
assert.equal(hasDetailedPlacementAnswers(normalized), true)
assert.equal(hasDetailedPlacementAnswers([{ correct: true }, { correct: false }]), false)

console.log('placement-test-utils tests passed')
