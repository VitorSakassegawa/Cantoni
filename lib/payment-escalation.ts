// Professor-driven dunning "ladder": classifies an overdue payment by how many
// days late it is, so the professor can see who to chase and how firmly. The
// professor reviews and sends the message manually — nothing is auto-sent.

export type EscalationTier = 'suave' | 'firme' | 'urgente'

export const ESCALATION_META: Record<EscalationTier, { label: string; minDays: number; badgeClass: string }> = {
  suave: { label: 'Lembrete', minDays: 1, badgeClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  firme: { label: 'Aviso', minDays: 7, badgeClass: 'bg-orange-50 text-orange-700 border-orange-100' },
  urgente: { label: 'Urgente', minDays: 15, badgeClass: 'bg-rose-50 text-rose-700 border-rose-100' },
}

// Whole days between dueDate and today (both 'YYYY-MM-DD'). Positive = overdue.
export function daysOverdue(dueDate: string, today: string): number {
  const due = Date.parse(`${dueDate}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(due) || Number.isNaN(now)) return 0
  return Math.floor((now - due) / 86_400_000)
}

export function getEscalationTier(dueDate: string, today: string): { tier: EscalationTier; days: number } | null {
  const days = daysOverdue(dueDate, today)
  if (days < ESCALATION_META.suave.minDays) return null
  if (days >= ESCALATION_META.urgente.minDays) return { tier: 'urgente', days }
  if (days >= ESCALATION_META.firme.minDays) return { tier: 'firme', days }
  return { tier: 'suave', days }
}
