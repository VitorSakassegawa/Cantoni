// Desconto de fidelidade ("tempo de casa"): 5% por ano completo desde o
// primeiro contrato do aluno, com teto de 15% (3 anos). Aplicado em contratos
// novos/renovações — nunca em contrato vigente —, depois do tier de compromisso
// e antes do ajuste manual. Amortiza o reajuste IPCA.

export const LOYALTY_PERCENT_PER_YEAR = 5
export const LOYALTY_MAX_PERCENT = 15

/**
 * Anos completos entre `firstContractStart` e `reference` (default: agora).
 * Conta aniversários completos (não fração de ano).
 */
export function completedYearsSince(
  firstContractStart: Date | string | null | undefined,
  reference: Date
): number {
  if (!firstContractStart) return 0
  const start = firstContractStart instanceof Date ? firstContractStart : new Date(firstContractStart)
  if (Number.isNaN(start.getTime()) || start.getTime() > reference.getTime()) return 0

  let years = reference.getFullYear() - start.getFullYear()
  const anniversary = new Date(start)
  anniversary.setFullYear(start.getFullYear() + years)
  if (anniversary.getTime() > reference.getTime()) {
    years -= 1
  }
  return Math.max(0, years)
}

/** Percentual de fidelidade (0, 5, 10, 15) para o tempo de casa informado. */
export function loyaltyDiscountPercent(
  firstContractStart: Date | string | null | undefined,
  reference: Date
): number {
  const years = completedYearsSince(firstContractStart, reference)
  if (years < 1) return 0
  return Math.min(years * LOYALTY_PERCENT_PER_YEAR, LOYALTY_MAX_PERCENT)
}

/** Aplica o desconto de fidelidade a um valor, retornando o líquido (2 casas). */
export function applyLoyaltyDiscount(amount: number, percent: number): number {
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), LOYALTY_MAX_PERCENT)
  return Math.round(amount * (1 - safePercent / 100) * 100) / 100
}
