import assert from 'node:assert/strict'
import {
  assertPaymentAmountMatches,
  classifyMercadoPagoStatus,
  getMercadoPagoStatusCopy,
  normalizePaymentAmount,
  resolveLocalPaymentStatus,
  splitFullName,
} from '../lib/payments.ts'
import { calculateNextStreak } from '../lib/streak-utils.ts'
import { evaluatePlacementEligibility } from '../lib/placement-eligibility.ts'
import { buildPendingPaymentUpdates, splitInstallmentsExact } from '../lib/contract-payments.ts'
import { evaluateMonthlyRescheduleLimit } from '../lib/lesson-reschedule.ts'
import {
  getExternalSignatureStatusLabel,
  getExternalSignatureStatusTone,
} from '../lib/document-issuances.ts'
import { getContractCancellationClause } from '../lib/document-text.ts'

assert.equal(normalizePaymentAmount('120.456'), 120.46)

assert.throws(() => assertPaymentAmountMatches(100, 99.5), /Payment amount mismatch/)

assert.equal(classifyMercadoPagoStatus('approved'), 'approved')
assert.equal(classifyMercadoPagoStatus('pending'), 'pending')
assert.equal(classifyMercadoPagoStatus('rejected'), 'failed')
assert.equal(classifyMercadoPagoStatus('cancelled'), 'cancelled')
assert.equal(classifyMercadoPagoStatus('refunded'), 'refunded')
assert.equal(classifyMercadoPagoStatus('charged_back'), 'charged_back')
assert.equal(classifyMercadoPagoStatus(null), 'unknown')

assert.equal(getMercadoPagoStatusCopy('rejected')?.shortLabel, 'Tentativa recusada')
assert.match(getMercadoPagoStatusCopy('rejected')?.detail || '', /recusada/i)
assert.equal(getMercadoPagoStatusCopy('refunded')?.shortLabel, 'Pagamento estornado')
assert.match(getMercadoPagoStatusCopy('refunded')?.detail || '', /estornado/i)
assert.equal(getMercadoPagoStatusCopy(null)?.shortLabel, 'Cobrança pendente')
assert.match(getMercadoPagoStatusCopy(null)?.detail || '', /código pix|cobranca/i)

assert.equal(
  resolveLocalPaymentStatus({
    mercadoPagoStatus: 'approved',
    currentStatus: 'pendente',
    dueDate: '2099-01-01',
    paidAt: null,
  }),
  'pago'
)
assert.equal(
  resolveLocalPaymentStatus({
    mercadoPagoStatus: 'refunded',
    currentStatus: 'pago',
    dueDate: '2099-01-01',
    paidAt: '2026-03-27',
  }),
  'pendente'
)
assert.equal(
  resolveLocalPaymentStatus({
    mercadoPagoStatus: 'pending',
    currentStatus: 'pago',
    dueDate: '2099-01-01',
    paidAt: '2026-03-27',
  }),
  'pago'
)
assert.equal(
  resolveLocalPaymentStatus({
    mercadoPagoStatus: 'rejected',
    currentStatus: 'pendente',
    dueDate: '2020-01-01',
    paidAt: null,
  }),
  'atrasado'
)

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

assert.deepEqual(splitInstallmentsExact(100, 3), [
  { installmentNumber: 1, amount: 33.33 },
  { installmentNumber: 2, amount: 33.33 },
  { installmentNumber: 3, amount: 33.34 },
])

assert.throws(() => splitInstallmentsExact(-1, 2), /Valor total inv/)
assert.throws(() => splitInstallmentsExact(100, 0), /N[úu]mero de parcelas inv/)

assert.deepEqual(
  evaluateMonthlyRescheduleLimit({
    monthlyLimit: 1,
    currentCount: 1,
  }),
  {
    allowed: false,
    message: 'Você já usou o limite de 1 remarcação(ões) deste mês.',
  }
)

assert.deepEqual(
  evaluateMonthlyRescheduleLimit({
    monthlyLimit: 1,
    currentCount: 1,
    isResolvingConflict: true,
  }),
  { allowed: true }
)

assert.deepEqual(
  evaluateMonthlyRescheduleLimit({
    monthlyLimit: 2,
    currentCount: 2,
    isProfessor: true,
  }),
  { allowed: true }
)

assert.equal(
  getExternalSignatureStatusLabel('pending_external_signature'),
  'Pendente de assinatura externa'
)
assert.equal(getExternalSignatureStatusLabel('sent_to_provider'), 'Enviado ao ZapSign')
assert.equal(getExternalSignatureStatusLabel('signed_externally'), 'Assinado externamente')
assert.equal(getExternalSignatureStatusLabel('internal_only'), 'Somente no portal')

assert.equal(
  getExternalSignatureStatusTone('pending_external_signature'),
  'border-amber-200 bg-amber-50 text-amber-700'
)
assert.equal(
  getExternalSignatureStatusTone('sent_to_provider'),
  'border-blue-200 bg-blue-50 text-blue-700'
)
assert.equal(
  getExternalSignatureStatusTone('signed_externally'),
  'border-emerald-200 bg-emerald-50 text-emerald-700'
)
assert.equal(
  getExternalSignatureStatusTone('internal_only'),
  'border-slate-200 bg-slate-100 text-slate-600'
)

const cancellationClause = getContractCancellationClause()
assert.match(cancellationClause, /apura/)
assert.doesNotMatch(cancellationClause, /10%/)

console.log('payment-utils tests passed')
