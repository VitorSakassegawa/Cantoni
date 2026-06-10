import assert from 'node:assert/strict'

import {
  gradeRespostas,
  sanitizeQuestoesForStudent,
  shuffleMap,
  validateQuestoes,
} from '../lib/atividades-utils.ts'

// ---- validateQuestoes -----------------------------------------------------------

const validas = validateQuestoes([
  { tipo: 'multipla_escolha', enunciado: 'Choose one', opcoes: ['go', 'goes', 'going'], respostaIndice: 1 },
  { tipo: 'verdadeiro_falso', enunciado: '"Children" is plural.', respostaBool: true },
  { tipo: 'lacunas', enunciado: 'She ___ to school every day.', respostaTexto: 'goes|walks' },
  { tipo: 'ordenar', enunciado: 'Order the sentence', itens: ['I', 'always', 'wake', 'up', 'early'] },
  { tipo: 'dissertativa', enunciado: 'Describe your last vacation.', criterio: 'past tenses' },
])
assert.equal(validas.length, 5)
// ids re-sequenciados
assert.deepEqual(validas.map((q) => q.id), [1, 2, 3, 4, 5])

// inválidas são descartadas
const descartadas = validateQuestoes([
  { tipo: 'multipla_escolha', enunciado: 'x', opcoes: ['a'], respostaIndice: 0 }, // < 2 opções
  { tipo: 'multipla_escolha', enunciado: 'x', opcoes: ['a', 'A'], respostaIndice: 0 }, // duplicadas
  { tipo: 'multipla_escolha', enunciado: 'x', opcoes: ['a', 'b'], respostaIndice: 5 }, // fora do range
  { tipo: 'lacunas', enunciado: 'sem lacuna aqui', respostaTexto: 'x' }, // sem ___
  { tipo: 'ordenar', enunciado: 'x', itens: ['a', 'b'] }, // < 3 itens
  { tipo: 'verdadeiro_falso', enunciado: 'x' }, // sem resposta
  { tipo: 'inexistente', enunciado: 'x' },
  null,
  'string',
])
assert.equal(descartadas.length, 0)
assert.deepEqual(validateQuestoes(null), [])
assert.deepEqual(validateQuestoes('not-array'), [])

// ---- shuffleMap -----------------------------------------------------------------

// determinístico: mesmo seed → mesma permutação
assert.deepEqual(shuffleMap(6, 'seed-a'), shuffleMap(6, 'seed-a'))
// é uma permutação completa
const perm = shuffleMap(8, 'seed-b')
assert.deepEqual([...perm].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7])

// ---- sanitizeQuestoesForStudent ---------------------------------------------------

const sanitized = sanitizeQuestoesForStudent(validas, 'atrib-1')
// nunca vaza gabarito
for (const q of sanitized) {
  assert.equal('respostaIndice' in q, false)
  assert.equal('respostaBool' in q, false)
  assert.equal('respostaTexto' in q, false)
  assert.equal('criterio' in q, false)
}
// ordenar vem embaralhado mas com os mesmos itens
const ordenarOriginal = validas.find((q) => q.tipo === 'ordenar')!
const ordenarAluno = sanitized.find((q) => q.tipo === 'ordenar')!
assert.deepEqual([...ordenarAluno.itens!].sort(), [...ordenarOriginal.itens!].sort())

// ---- gradeRespostas ---------------------------------------------------------------

// resposta correta de ordenar: para cada posição p, o índice embaralhado cujo original é p
const map = shuffleMap(ordenarOriginal.itens!.length, `atrib-1:${ordenarOriginal.id}`)
const ordemCorreta = Array.from({ length: map.length }, (_, p) => map.indexOf(p))

const full = gradeRespostas(
  validas,
  [
    { id: 1, valor: 1 },
    { id: 2, valor: true },
    { id: 3, valor: '  WALKS ' }, // alternativa aceita + normalização
    { id: 4, valor: ordemCorreta },
    { id: 5, valor: 'My vacation was great.' },
  ],
  'atrib-1'
)
assert.equal(full.acertos, 4)
assert.equal(full.totalObjetivas, 4)
assert.equal(full.temDissertativa, true)
assert.equal(full.detalhes.find((d) => d.id === 5)?.correta, null)

// erradas e em branco
const zero = gradeRespostas(validas, [{ id: 1, valor: 0 }, { id: 2, valor: false }], 'atrib-1')
assert.equal(zero.acertos, 0)
assert.equal(zero.totalObjetivas, 4)

// ordem errada não pontua
const wrongOrder = gradeRespostas(
  validas,
  [{ id: 4, valor: [...ordemCorreta].reverse() }],
  'atrib-1'
)
assert.equal(wrongOrder.detalhes.find((d) => d.id === 4)?.correta, false)

// seed diferente → mapa diferente → a mesma resposta deixa de valer (proteção contra replay entre atribuições)
const otherSeed = gradeRespostas(validas, [{ id: 4, valor: ordemCorreta }], 'atrib-2')
const stillCorrect = otherSeed.detalhes.find((d) => d.id === 4)?.correta
const mapOther = shuffleMap(ordenarOriginal.itens!.length, `atrib-2:${ordenarOriginal.id}`)
assert.equal(stillCorrect, JSON.stringify(mapOther) === JSON.stringify(map))

// acentos em lacunas
const acentos = validateQuestoes([
  { tipo: 'lacunas', enunciado: 'Ele ___ feliz.', respostaTexto: 'está' },
])
assert.equal(gradeRespostas(acentos, [{ id: 1, valor: 'esta' }], 's').acertos, 1)

console.log('atividades-utils tests passed')
