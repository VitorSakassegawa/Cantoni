export type CancellationReasonCode =
  | 'schedule_conflict'
  | 'financial'
  | 'goals_changed'
  | 'temporary_pause'
  | 'moving'
  | 'dissatisfaction'
  | 'school_decision'
  | 'other'

export type CancellationLessonAction = 'auto_cancel_future' | 'keep_future_for_review'
export type CancellationOutstandingAction = 'keep_open_balance' | 'waive_open_balance'
export type CancellationCreditAction = 'no_credit' | 'refund_manual' | 'convert_to_credit'

export type CancellationSummary = {
  paidAmount: number
  openAmount: number
  consumedValue: number
  creditValue: number
  completedLessons: number
  futureLessons: number
  totalLessons: number
  lessonUnitValue: number
}

export const cancellationReasonOptions: Array<{
  value: CancellationReasonCode
  label: string
  description: string
}> = [
  {
    value: 'schedule_conflict',
    label: 'Incompatibilidade de agenda',
    description: 'Aluno e escola não encontraram uma rotina viável para manter as aulas.',
  },
  {
    value: 'financial',
    label: 'Questões financeiras',
    description: 'O encerramento ocorreu por restrição orçamentária ou prioridade financeira.',
  },
  {
    value: 'goals_changed',
    label: 'Mudança de objetivos',
    description: 'O aluno mudou de foco acadêmico ou já não precisa mais deste formato de curso.',
  },
  {
    value: 'temporary_pause',
    label: 'Pausa temporária',
    description: 'O aluno precisa interromper a jornada por um período e encerrar o contrato atual.',
  },
  {
    value: 'moving',
    label: 'Mudança de rotina ou cidade',
    description: 'Houve mudança relevante de disponibilidade, endereço ou rotina familiar.',
  },
  {
    value: 'dissatisfaction',
    label: 'Insatisfação',
    description: 'O cancelamento ocorreu por percepção de valor, experiência ou aderência metodológica.',
  },
  {
    value: 'school_decision',
    label: 'Encerramento pela escola',
    description: 'A escola decidiu encerrar o vínculo por estratégia, compliance ou operação.',
  },
  {
    value: 'other',
    label: 'Outro motivo',
    description: 'Use quando o motivo não se encaixar nas opções acima.',
  },
]

export function getCancellationReasonLabel(reasonCode: CancellationReasonCode) {
  return cancellationReasonOptions.find((option) => option.value === reasonCode)?.label || 'Outro motivo'
}

export function calculateCancellationSummary(input: {
  contractValue: number
  totalLessons: number
  paidAmount: number
  openAmount: number
  completedLessons: number
  futureLessons: number
}): CancellationSummary {
  const totalLessons = Math.max(0, input.totalLessons)
  const lessonUnitValue = totalLessons > 0 ? Number((input.contractValue / totalLessons).toFixed(2)) : 0
  const consumedValue = Number(
    Math.min(input.contractValue, lessonUnitValue * Math.max(0, input.completedLessons)).toFixed(2)
  )
  const creditValue = Number(Math.max(0, input.paidAmount - consumedValue).toFixed(2))

  return {
    paidAmount: Number(input.paidAmount.toFixed(2)),
    openAmount: Number(input.openAmount.toFixed(2)),
    consumedValue,
    creditValue,
    completedLessons: Math.max(0, input.completedLessons),
    futureLessons: Math.max(0, input.futureLessons),
    totalLessons,
    lessonUnitValue,
  }
}
