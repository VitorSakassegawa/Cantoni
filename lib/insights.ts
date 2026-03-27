import { differenceInCalendarDays, isBefore, parseISO } from 'date-fns'
import { getEffectivePaymentStatus } from '@/lib/payments'

export type InsightSeverity = 'info' | 'warning' | 'success'

export interface FeedItem {
  id: string
  title: string
  description: string
  severity: InsightSeverity
  meta?: string
  href?: string
  actionLabel?: string
}

export interface RenewalCandidate {
  contractId: number
  studentId: string
  studentName: string
  daysRemaining: number
  progressPct: number
  severity: InsightSeverity
}

export interface AttentionCandidate {
  contractId: number
  studentId: string
  studentName: string
  score: number
  reasons: string[]
}

export function getStudentRemarkBlockReason(input: {
  isProfessor?: boolean
  status?: string | null
  hasRequestedDate?: boolean
  monthlyRescheduleCount?: number
  monthlyRescheduleLimit?: number | null
}) {
  if (input.isProfessor) {
    return null
  }

  if (input.status === 'pendente_remarcacao' && input.hasRequestedDate) {
    return 'Você já tem uma solicitação de remarcação aguardando análise do professor.'
  }

  if (
    typeof input.monthlyRescheduleLimit === 'number' &&
    (input.monthlyRescheduleCount || 0) >= input.monthlyRescheduleLimit &&
    input.status !== 'pendente_remarcacao' &&
    input.status !== 'pendente_remarcacao_rejeitada'
  ) {
    return `Limite mensal de ${input.monthlyRescheduleLimit} remarcação(ões) já utilizado.`
  }

  return null
}

export function getDaysRemaining(dateValue?: string | null, now: Date = new Date()) {
  if (!dateValue) {
    return null
  }

  const parsed = parseISO(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return differenceInCalendarDays(parsed, now)
}

export function buildRenewalCandidate(contract: any, now: Date = new Date()): RenewalCandidate | null {
  const daysRemaining = getDaysRemaining(contract?.data_fim, now)
  if (daysRemaining === null || daysRemaining < 0 || daysRemaining > 30) {
    return null
  }

  const progressPct = contract?.aulas_totais
    ? Math.round(((contract.aulas_dadas || 0) / contract.aulas_totais) * 100)
    : 0

  return {
    contractId: contract.id,
    studentId: contract.aluno_id,
    studentName: contract.profiles?.full_name || 'Aluno',
    daysRemaining,
    progressPct,
    severity: daysRemaining <= 14 || progressPct >= 85 ? 'warning' : 'info',
  }
}

export function buildAttentionCandidate(
  contract: any,
  options?: {
    remarcacoesNoMes?: number
    now?: Date
  }
): AttentionCandidate | null {
  const now = options?.now ?? new Date()
  const reasons: string[] = []
  let score = 0

  const overduePayments =
    contract.pagamentos?.filter((payment: any) => getEffectivePaymentStatus(payment) === 'atrasado')
      .length || 0
  if (overduePayments > 0) {
    reasons.push(`${overduePayments} pagamento(s) em atraso`)
    score += 3
  }

  if (contract.status_financeiro === 'pendente') {
    reasons.push('financeiro pendente')
    score += 2
  }

  const daysRemaining = getDaysRemaining(contract.data_fim, now)
  if (daysRemaining !== null && daysRemaining <= 14) {
    reasons.push(`contrato termina em ${daysRemaining} dia(s)`)
    score += 2
  }

  const streak = contract.profiles?.streak_count ?? 0
  if (streak <= 2) {
    reasons.push('streak muito baixo')
    score += 1
  }

  const lastActivityDate = contract.profiles?.last_activity_date
  if (lastActivityDate) {
    const parsedActivity = parseISO(`${lastActivityDate}T00:00:00`)
    if (
      !Number.isNaN(parsedActivity.getTime()) &&
      isBefore(parsedActivity, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))
    ) {
      reasons.push('sem atividade recente')
      score += 1
    }
  }

  if ((options?.remarcacoesNoMes || 0) >= (contract.planos?.remarca_max_mes || Infinity)) {
    reasons.push('limite de remarcações atingido')
    score += 1
  }

  if (score === 0) {
    return null
  }

  return {
    contractId: contract.id,
    studentId: contract.aluno_id,
    studentName: contract.profiles?.full_name || 'Aluno',
    score,
    reasons,
  }
}

export function buildProfessorNotifications(input: {
  pendingReschedules: number
  overduePayments: number
  renewalsSoon: RenewalCandidate[]
  attentionStudents: AttentionCandidate[]
  recentActivityCount: number
}) {
  const items: FeedItem[] = []

  if (input.pendingReschedules > 0) {
    items.push({
      id: 'pending-reschedules',
      title: 'Solicitações de remarcação aguardando análise',
      description: `${input.pendingReschedules} aula(s) precisam de aprovação ou nova proposta de horário.`,
      severity: 'warning',
      href: '/professor',
      actionLabel: 'Revisar',
    })
  }

  if (input.overduePayments > 0) {
    items.push({
      id: 'overdue-payments',
      title: 'Existem pagamentos em atraso',
      description: `${input.overduePayments} pagamento(s) exigem contato ou acompanhamento.`,
      severity: 'warning',
      href: '/professor/pagamentos',
      actionLabel: 'Abrir financeiro',
    })
  }

  if (input.renewalsSoon.length > 0) {
    items.push({
      id: 'renewals-soon',
      title: 'Contratos próximos da renovação',
      description: `${input.renewalsSoon.length} contrato(s) terminam nos próximos 30 dias.`,
      severity: 'info',
      href: `/professor/alunos/${input.renewalsSoon[0].studentId}`,
      actionLabel: 'Ver prioridade',
    })
  }

  if (input.attentionStudents.length > 0) {
    items.push({
      id: 'attention-students',
      title: 'Alunos exigindo atenção do professor',
      description: `${input.attentionStudents.length} aluno(s) têm sinais de risco operacional ou pedagógico.`,
      severity: 'info',
      href: `/professor/alunos/${input.attentionStudents[0].studentId}`,
      actionLabel: 'Abrir aluno',
    })
  }

  if (input.recentActivityCount > 0) {
    items.push({
      id: 'recent-activity',
      title: 'Movimentações recentes registradas',
      description: `${input.recentActivityCount} evento(s) recentes estão disponíveis no feed operacional.`,
      severity: 'success',
      href: '/professor#feed-atividade',
      actionLabel: 'Ver feed',
    })
  }

  return items
}

export function buildStudentNotifications(input: {
  daysRemaining: number | null
  hasPendingPayment: boolean
  hasOverduePayment: boolean
  hasPendingReschedule: boolean
  hasUpcomingHomework: boolean
  upcomingHomeworkLabel?: string | null
  flashcardsDue: number
  recentActivityCount: number
}) {
  const items: FeedItem[] = []

  if (input.daysRemaining !== null && input.daysRemaining <= 30 && input.daysRemaining >= 0) {
    items.push({
      id: 'contract-ending',
      title: 'Seu contrato está entrando na janela de renovação',
      description: `Faltam ${input.daysRemaining} dia(s) para o término do contrato atual.`,
      severity: input.daysRemaining <= 14 ? 'warning' : 'info',
      href: '/aluno/pagamentos',
      actionLabel: 'Ver contrato',
    })
  }

  if (input.hasOverduePayment) {
    items.push({
      id: 'overdue-payment',
      title: 'Há um pagamento em atraso',
      description: 'Regularize o financeiro para evitar interrupções e facilitar sua renovação.',
      severity: 'warning',
      href: '/aluno/pagamentos',
      actionLabel: 'Abrir financeiro',
    })
  } else if (input.hasPendingPayment) {
    items.push({
      id: 'pending-payment',
      title: 'Você tem um pagamento pendente',
      description: 'O próximo vencimento já está disponível no portal.',
      severity: 'info',
      href: '/aluno/pagamentos',
      actionLabel: 'Pagar agora',
    })
  }

  if (input.hasPendingReschedule) {
    items.push({
      id: 'pending-reschedule',
      title: 'Existe uma remarcação aguardando sua ação',
      description: 'Abra sua timeline e proponha um novo horário para concluir a remarcação.',
      severity: 'warning',
      href: '/aluno/aulas',
      actionLabel: 'Resolver',
    })
  }

  if (input.hasUpcomingHomework) {
    items.push({
      id: 'upcoming-homework',
      title: 'Há homework para sua próxima aula',
      description: input.upcomingHomeworkLabel
        ? `Revise e entregue antes da aula: ${input.upcomingHomeworkLabel}`
        : 'Revise sua tarefa antes do próximo encontro para aproveitar melhor a aula.',
      severity: 'warning',
      href: '/aluno/aulas',
      actionLabel: 'Ver tarefa',
    })
  }

  if (input.flashcardsDue > 0) {
    items.push({
      id: 'flashcards-due',
      title: 'Flashcards prontos para a próxima aula',
      description: `${input.flashcardsDue} flashcard(s) já estão prontos para revisar hoje.`,
      severity: 'success',
      href: '/aluno/flashcards',
      actionLabel: 'Revisar',
    })
  }

  if (input.recentActivityCount > 0) {
    items.push({
      id: 'recent-activity',
      title: 'Há atualizações recentes no seu histórico',
      description: `${input.recentActivityCount} movimentação(ões) novas foram registradas no seu portal.`,
      severity: 'info',
      href: '/aluno#historico-recente',
      actionLabel: 'Ver feed',
    })
  }

  return items
}
