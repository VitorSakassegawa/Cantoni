import type { createServiceClient } from '@/lib/supabase/server'

export type ContractCreditSource = {
  cancellationId: number
  sourceContractId: number
  studentId: string
  effectiveDate: string
  createdAt: string
  creditValue: number
  usedValue: number
  availableValue: number
}

export type ContractCreditApplication = {
  cancellationId: number
  sourceContractId: number
  amount: number
}

function toMoney(value: number) {
  return Number(value.toFixed(2))
}

export function calculateCreditApplicationPlan(input: {
  requestedAmount: number
  sources: ContractCreditSource[]
}): ContractCreditApplication[] {
  const requestedAmount = toMoney(Math.max(0, input.requestedAmount))

  if (requestedAmount <= 0) {
    return []
  }

  let remaining = requestedAmount
  const applications: ContractCreditApplication[] = []

  for (const source of input.sources) {
    const availableValue = toMoney(Math.max(0, source.availableValue))

    if (availableValue <= 0 || remaining <= 0) {
      continue
    }

    const amount = toMoney(Math.min(availableValue, remaining))

    applications.push({
      cancellationId: source.cancellationId,
      sourceContractId: source.sourceContractId,
      amount,
    })

    remaining = toMoney(remaining - amount)
  }

  return applications
}

export function getAppliedCreditTotal(applications: ContractCreditApplication[]) {
  return toMoney(applications.reduce((total, item) => total + item.amount, 0))
}

export async function listAvailableContractCredits(
  serviceSupabase: Awaited<ReturnType<typeof createServiceClient>>,
  studentId: string
): Promise<ContractCreditSource[]> {
  const { data: cancellations, error: cancellationsError } = await serviceSupabase
    .from('contract_cancellations')
    .select('id, contract_id, student_id, effective_date, created_at, credit_value')
    .eq('student_id', studentId)
    .eq('credit_action', 'convert_to_credit')
    .gt('credit_value', 0)
    .order('effective_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (cancellationsError) {
    throw new Error(cancellationsError.message)
  }

  const normalizedCancellations = (cancellations || []).map((entry) => ({
    cancellationId: Number(entry.id),
    sourceContractId: Number(entry.contract_id),
    studentId: String(entry.student_id),
    effectiveDate: String(entry.effective_date),
    createdAt: String(entry.created_at),
    creditValue: toMoney(Number(entry.credit_value || 0)),
  }))

  if (normalizedCancellations.length === 0) {
    return []
  }

  const cancellationIds = normalizedCancellations.map((entry) => entry.cancellationId)
  const { data: applications, error: applicationsError } = await serviceSupabase
    .from('contract_credit_applications')
    .select('source_cancellation_id, applied_amount')
    .in('source_cancellation_id', cancellationIds)

  if (applicationsError) {
    throw new Error(applicationsError.message)
  }

  const appliedByCancellation = new Map<number, number>()

  for (const application of applications || []) {
    const cancellationId = Number(application.source_cancellation_id)
    const appliedAmount = toMoney(Number(application.applied_amount || 0))
    appliedByCancellation.set(
      cancellationId,
      toMoney((appliedByCancellation.get(cancellationId) || 0) + appliedAmount)
    )
  }

  return normalizedCancellations
    .map((entry) => {
      const usedValue = toMoney(appliedByCancellation.get(entry.cancellationId) || 0)
      const availableValue = toMoney(Math.max(0, entry.creditValue - usedValue))

      return {
        ...entry,
        usedValue,
        availableValue,
      }
    })
    .filter((entry) => entry.availableValue > 0)
}
