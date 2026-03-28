export type LocalPaymentStatus = 'pendente' | 'pago' | 'atrasado' | 'vencido'

export type MercadoPagoAttemptState =
  | 'approved'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'
  | 'unknown'

const APPROVED_STATUSES = new Set(['approved', 'authorized'])
const PENDING_STATUSES = new Set(['pending', 'in_process', 'in_mediation'])
const FAILED_STATUSES = new Set(['rejected'])
const CANCELLED_STATUSES = new Set(['cancelled'])
const REFUNDED_STATUSES = new Set(['refunded'])
const CHARGEBACK_STATUSES = new Set(['charged_back'])

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

export function classifyMercadoPagoStatus(
  status: string | null | undefined
): MercadoPagoAttemptState {
  if (!status) {
    return 'unknown'
  }

  if (APPROVED_STATUSES.has(status)) {
    return 'approved'
  }

  if (PENDING_STATUSES.has(status)) {
    return 'pending'
  }

  if (FAILED_STATUSES.has(status)) {
    return 'failed'
  }

  if (CANCELLED_STATUSES.has(status)) {
    return 'cancelled'
  }

  if (REFUNDED_STATUSES.has(status)) {
    return 'refunded'
  }

  if (CHARGEBACK_STATUSES.has(status)) {
    return 'charged_back'
  }

  return 'unknown'
}

export function getMercadoPagoStatusCopy(status: string | null | undefined) {
  switch (classifyMercadoPagoStatus(status)) {
    case 'approved':
      return {
        shortLabel: 'Aprovado',
        detail: 'Pagamento confirmado pelo Mercado Pago.',
      }
    case 'pending':
      return {
        shortLabel: 'Em processamento',
        detail: 'Mercado Pago ainda está aguardando confirmação da tentativa de pagamento.',
      }
    case 'failed':
      return {
        shortLabel: 'Tentativa recusada',
        detail: 'A tentativa mais recente foi recusada. Você pode gerar uma nova tentativa de pagamento.',
      }
    case 'cancelled':
      return {
        shortLabel: 'Cobrança cancelada',
        detail: 'A tentativa de pagamento foi cancelada. Gere uma nova cobrança para continuar.',
      }
    case 'refunded':
      return {
        shortLabel: 'Pagamento estornado',
        detail: 'O pagamento foi estornado. A parcela voltou a ficar em aberto.',
      }
    case 'charged_back':
      return {
        shortLabel: 'Pagamento contestado',
        detail: 'O pagamento foi contestado ou revertido. A parcela requer revisão manual.',
      }
    default:
      return null
  }
}

export function resolveLocalPaymentStatus(input: {
  mercadoPagoStatus?: string | null
  currentStatus?: string | null
  dueDate?: string | null
  paidAt?: string | null
}): LocalPaymentStatus {
  const attemptState = classifyMercadoPagoStatus(input.mercadoPagoStatus)

  if (
    attemptState === 'approved' ||
    ((attemptState === 'unknown' || attemptState === 'pending') &&
      (input.currentStatus === 'pago' || Boolean(input.paidAt)))
  ) {
    return 'pago'
  }

  if (input.currentStatus === 'vencido') {
    return 'vencido'
  }

  if (!input.dueDate) {
    return input.currentStatus === 'atrasado' ? 'atrasado' : 'pendente'
  }

  const dueDate = new Date(`${input.dueDate}T23:59:59`)
  if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) {
    return 'atrasado'
  }

  return input.currentStatus === 'atrasado' ? 'atrasado' : 'pendente'
}

export function splitFullName(fullName: string) {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/)

  return {
    firstName,
    lastName: rest.join(' '),
  }
}

export function getEffectivePaymentStatus(payment: {
  status?: string | null
  data_vencimento?: string | null
  data_pagamento?: string | null
  mercadopago_status?: string | null
}): LocalPaymentStatus {
  return resolveLocalPaymentStatus({
    mercadoPagoStatus: payment.mercadopago_status,
    currentStatus: payment.status,
    dueDate: payment.data_vencimento,
    paidAt: payment.data_pagamento,
  })
}

export function withEffectivePaymentStatus<
  T extends {
    status?: string | null
    data_vencimento?: string | null
    data_pagamento?: string | null
    mercadopago_status?: string | null
  },
>(payment: T): T & { effectiveStatus: LocalPaymentStatus } {
  return {
    ...payment,
    effectiveStatus: getEffectivePaymentStatus(payment),
  }
}
