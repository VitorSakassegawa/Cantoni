import assert from 'node:assert/strict'
import {
  assertPaymentAmountMatches,
  mapMercadoPagoStatus,
  normalizePaymentAmount,
  splitFullName,
} from '../lib/payments.ts'
import { calculateNextStreak } from '../lib/streak-utils.ts'
import { evaluatePlacementEligibility } from '../lib/placement-eligibility.ts'
import { buildPendingPaymentUpdates } from '../lib/contract-payments.ts'

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

assert.deepEqual(
  evaluatePlacementEligibility({
    placementTestCompleted: null,
    latestResultAt: null,
    contracts: [],
    now: new Date('2026-03-25T12:00:00Z'),
  }),
  {
    allowed: true,
    reason: 'first_test',
    title: 'Primeiro nivelamento liberado',
    description: 'Seu primeiro teste pode ser feito diretamente no portal.',
  }
)

assert.equal(
  evaluatePlacementEligibility({
    placementTestCompleted: true,
    latestResultAt: '2026-02-01T12:00:00Z',
    contracts: [{ data_inicio: '2026-03-01', data_fim: '2026-06-30', status: 'ativo' }],
    now: new Date('2026-03-25T12:00:00Z'),
  }).reason,
  'new_contract'
)

assert.equal(
  evaluatePlacementEligibility({
    placementTestCompleted: true,
    latestResultAt: '2026-01-10T12:00:00Z',
    contracts: [{ data_inicio: '2025-10-01', data_fim: '2026-03-01', status: 'encerrado' }],
    now: new Date('2026-03-25T12:00:00Z'),
  }).reason,
  'contract_end'
)

assert.equal(
  evaluatePlacementEligibility({
    placementTestCompleted: true,
    latestResultAt: '2025-11-10T12:00:00Z',
    contracts: [{ data_inicio: '2025-10-01', data_fim: '2026-12-01', status: 'ativo' }],
    now: new Date('2026-03-25T12:00:00Z'),
  }).reason,
  'semester_rollover'
)

assert.equal(
  evaluatePlacementEligibility({
    placementTestCompleted: false,
    latestResultAt: '2026-03-01T12:00:00Z',
    contracts: [{ data_inicio: '2025-10-01', data_fim: '2026-12-01', status: 'ativo' }],
    now: new Date('2026-03-25T12:00:00Z'),
  }).reason,
  'professor_approved'
)

assert.deepEqual(
  buildPendingPaymentUpdates({
    dataInicio: '2026-04-19',
    diaVencimento: 19,
    formaPagamento: 'pix',
    unpaidPayments: [
      { id: 1, parcela_num: 1 },
      { id: 2, parcela_num: 2 },
      { id: 3, parcela_num: 3 },
    ],
    remainingAmount: 540,
  }),
  [
    { id: 1, valor: 180, forma: 'pix', data_vencimento: '2026-05-19' },
    { id: 2, valor: 180, forma: 'pix', data_vencimento: '2026-06-19' },
    { id: 3, valor: 180, forma: 'pix', data_vencimento: '2026-07-19' },
  ]
)

assert.deepEqual(
  buildPendingPaymentUpdates({
    dataInicio: '2026-04-30',
    diaVencimento: 31,
    formaPagamento: 'pix',
    unpaidPayments: [
      { id: 10, parcela_num: 1 },
      { id: 11, parcela_num: 2 },
    ],
    remainingAmount: 100,
  }),
  [
    { id: 10, valor: 50, forma: 'pix', data_vencimento: '2026-05-31' },
    { id: 11, valor: 50, forma: 'pix', data_vencimento: '2026-06-30' },
  ]
)

assert.throws(
  () =>
    buildPendingPaymentUpdates({
      dataInicio: '2026-04-19',
      diaVencimento: 19,
      formaPagamento: 'pix',
      unpaidPayments: [{ id: 99, parcela_num: 0 }],
      remainingAmount: 100,
    }),
  /Parcela inválida/
)

console.log('payment-utils tests passed')
