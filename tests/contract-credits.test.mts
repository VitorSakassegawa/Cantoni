import assert from 'node:assert/strict'

import {
  calculateCreditApplicationPlan,
  getAppliedCreditTotal,
} from '../lib/contract-credits.ts'

const plan = calculateCreditApplicationPlan({
  requestedAmount: 225,
  sources: [
    {
      cancellationId: 10,
      sourceContractId: 20,
      studentId: 'student-1',
      effectiveDate: '2026-03-01',
      createdAt: '2026-03-01T10:00:00Z',
      creditValue: 100,
      usedValue: 0,
      availableValue: 100,
    },
    {
      cancellationId: 11,
      sourceContractId: 21,
      studentId: 'student-1',
      effectiveDate: '2026-03-15',
      createdAt: '2026-03-15T10:00:00Z',
      creditValue: 200,
      usedValue: 50,
      availableValue: 150,
    },
  ],
})

assert.deepEqual(plan, [
  {
    cancellationId: 10,
    sourceContractId: 20,
    amount: 100,
  },
  {
    cancellationId: 11,
    sourceContractId: 21,
    amount: 125,
  },
])

assert.equal(getAppliedCreditTotal(plan), 225)

const overRequestedPlan = calculateCreditApplicationPlan({
  requestedAmount: 500,
  sources: [
    {
      cancellationId: 30,
      sourceContractId: 40,
      studentId: 'student-2',
      effectiveDate: '2026-04-01',
      createdAt: '2026-04-01T10:00:00Z',
      creditValue: 90,
      usedValue: 0,
      availableValue: 90,
    },
  ],
})

assert.equal(getAppliedCreditTotal(overRequestedPlan), 90)

console.log('contract-credits tests passed')

