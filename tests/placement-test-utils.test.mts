import assert from 'node:assert/strict'

import {
  countPlacementCorrectAnswers,
  gradePlacementSelections,
  groupPlacementAnswersByModule,
  hasDetailedPlacementAnswers,
  normalizePlacementAnswers,
  summarizePlacementSkills,
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

// summarizePlacementSkills: agrupa por módulo, na ordem grammar→reading→listening
const skills = summarizePlacementSkills([
  { module: 'reading', correct: true },
  { module: 'grammar', correct: true },
  { module: 'grammar', correct: false },
  { module: 'listening', correct: true },
  { module: 'listening', correct: false },
])
assert.deepEqual(
  skills.map((s) => s.module),
  ['grammar', 'reading', 'listening']
)
assert.equal(skills[0].score, 1)
assert.equal(skills[0].total, 2)
assert.equal(skills[0].ratio, 0.5)
assert.equal(skills[1].ratio, 1)
// resultados legados (sem module) não geram breakdown
assert.deepEqual(summarizePlacementSkills([{ correct: true }, { correct: false }]), [])
assert.deepEqual(summarizePlacementSkills(null), [])

// agrupamento por módulo: ordem fixa, contagens por grupo, legados em 'other'
const groups = groupPlacementAnswersByModule([
  { module: 'listening', correct: false },
  { module: 'grammar', correct: true },
  { module: 'reading', correct: true },
  { module: 'grammar', correct: false },
  { correct: true },
])
assert.deepEqual(
  groups.map((g) => g.module),
  ['grammar', 'reading', 'listening', 'other']
)
assert.equal(groups[0].items.length, 2)
assert.equal(groups[2].items.length, 1)
assert.equal(groups[3].items.length, 1)
assert.deepEqual(groupPlacementAnswersByModule(null), [])
assert.deepEqual(groupPlacementAnswersByModule([]), [])

console.log('placement-test-utils tests passed')
