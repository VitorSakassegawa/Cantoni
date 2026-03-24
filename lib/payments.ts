export type LocalPaymentStatus = 'pendente' | 'pago'

const APPROVED_STATUSES = new Set(['approved', 'authorized'])
const PENDING_STATUSES = new Set([
  'pending',
  'in_process',
  'in_mediation',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
])

export function normalizePaymentAmount(value: unknown): number {
  const amount =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount')
  }

  return Number(amount.toFixed(2))
}

export function assertPaymentAmountMatches(expected: unknown, actual: unknown) {
  const normalizedExpected = normalizePaymentAmount(expected)
  const normalizedActual = normalizePaymentAmount(actual)

  if (Math.abs(normalizedExpected - normalizedActual) > 0.01) {
    throw new Error('Payment amount mismatch')
  }
}

export function mapMercadoPagoStatus(status: string | null | undefined): LocalPaymentStatus {
  if (!status) {
    return 'pendente'
  }

  if (APPROVED_STATUSES.has(status)) {
    return 'pago'
  }

  if (PENDING_STATUSES.has(status)) {
    return 'pendente'
  }

  return 'pendente'
}

export function splitFullName(fullName: string) {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/)

  return {
    firstName,
    lastName: rest.join(' '),
  }
}
