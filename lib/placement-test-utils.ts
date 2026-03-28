import type { PlacementAnswerRecord } from '@/lib/dashboard-types'

export type NormalizedPlacementAnswer = {
  id: number | null
  question: string | null
  options: string[] | null
  selected: number | null
  correct: boolean
  correctAnswer: number | null
}

export function normalizePlacementAnswers(answers: PlacementAnswerRecord[]): NormalizedPlacementAnswer[] {
  return answers.map((answer) => ({
    id: typeof answer.id === 'number' ? answer.id : null,
    question: typeof answer.question === 'string' ? answer.question : null,
    options: Array.isArray(answer.options) ? answer.options.filter((option): option is string => typeof option === 'string') : null,
    selected: typeof answer.selected === 'number' ? answer.selected : null,
    correct: Boolean(answer.correct),
    correctAnswer: typeof answer.correctAnswer === 'number' ? answer.correctAnswer : null,
  }))
}

export function countPlacementCorrectAnswers(answers: Array<Pick<NormalizedPlacementAnswer, 'correct'>>) {
  return answers.filter((answer) => Boolean(answer.correct)).length
}

export function hasDetailedPlacementAnswers(answers: Array<Pick<NormalizedPlacementAnswer, 'question' | 'options'> | PlacementAnswerRecord> | null | undefined) {
  return Boolean(
    answers?.some(
      (answer) =>
        typeof answer.question === 'string' &&
        answer.question.trim().length > 0 &&
        Array.isArray(answer.options) &&
        answer.options.length > 0
    )
  )
}
