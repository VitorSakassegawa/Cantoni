export type RescheduleLimitCheckInput = {
  monthlyLimit: number
  currentCount: number
  isProfessor?: boolean
  isResolvingConflict?: boolean
}

export type RescheduleLimitCheckResult = {
  allowed: boolean
  message?: string
}

export function evaluateMonthlyRescheduleLimit({
  monthlyLimit,
  currentCount,
  isProfessor = false,
  isResolvingConflict = false,
}: RescheduleLimitCheckInput): RescheduleLimitCheckResult {
  if (isProfessor || isResolvingConflict) {
    return { allowed: true }
  }

  if (currentCount >= monthlyLimit) {
    return {
      allowed: false,
      message: `Você já usou o limite de ${monthlyLimit} remarcação(ões) deste mês.`,
    }
  }

  return { allowed: true }
}
