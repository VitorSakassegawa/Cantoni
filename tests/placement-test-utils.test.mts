import assert from 'node:assert/strict'

import {
  countPlacementCorrectAnswers,
  gradePlacementSelections,
  hasDetailedPlacementAnswers,
  normalizePlacementAnswers,
  validateGeneratedQuestions,
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

// gradePlacementSelections: corrige a partir do gabarito, ignorando o que o cliente "acha"
const answerKey = [
  { id: 1, correctAnswer: 2 },
  { id: 2, correctAnswer: 0 },
  { id: 3, correctAnswer: 1 },
]
const graded = gradePlacementSelections(answerKey, [
  { id: 1, selected: 2 }, // correto
  { id: 2, selected: 3 }, // errado
  // id 3 não respondido
])
assert.equal(graded.score, 1)
assert.equal(graded.total, 3)
assert.equal(graded.graded[2].selected, null)
assert.equal(graded.graded[2].correct, false)
// seleção inválida (fora do range) não vira acerto
assert.equal(gradePlacementSelections(answerKey, [{ id: 1, selected: 99 }]).score, 0)

// validateGeneratedQuestions: descarta itens malformados gerados pela IA
const validQuestions = validateGeneratedQuestions([
  { id: 1, question: 'ok?', options: ['a', 'b', 'c', 'd'], correctAnswer: 1 }, // válido
  { id: 2, question: '', options: ['a', 'b'], correctAnswer: 0 }, // pergunta vazia
  { id: 3, question: 'dup?', options: ['a', 'a', 'b', 'c'], correctAnswer: 0 }, // opções duplicadas
  { id: 4, question: 'range?', options: ['a', 'b'], correctAnswer: 5 }, // correctAnswer fora do range
  { id: 5, question: 'few?', options: ['a'], correctAnswer: 0 }, // menos de 2 opções
])
assert.equal(validQuestions.length, 1)
assert.equal(validQuestions[0].id, 1)
assert.equal(validQuestions[0].correctAnswer, 1)

console.log('placement-test-utils tests passed')
