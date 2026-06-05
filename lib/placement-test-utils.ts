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

// ---- Correção server-side (gabarito vem do token, nunca do cliente) ----

export type PlacementSelection = { id: number; selected: number }
export type PlacementAnswerKeyEntry = { id: number; correctAnswer: number }
export type PlacementGradedAnswer = {
  id: number
  selected: number | null
  correct: boolean
  correctAnswer: number
}

export function gradePlacementSelections(
  key: PlacementAnswerKeyEntry[],
  selections: Array<{ id?: unknown; selected?: unknown }> | null | undefined
): { score: number; total: number; graded: PlacementGradedAnswer[] } {
  const selectionById = new Map<number, number>()
  for (const sel of selections || []) {
    if (typeof sel?.id === 'number' && typeof sel?.selected === 'number') {
      selectionById.set(sel.id, sel.selected)
    }
  }

  const graded = (key || []).map((entry) => {
    const selected = selectionById.has(entry.id) ? (selectionById.get(entry.id) as number) : null
    return {
      id: entry.id,
      selected,
      correct: selected !== null && selected === entry.correctAnswer,
      correctAnswer: entry.correctAnswer,
    }
  })

  return {
    score: graded.filter((g) => g.correct).length,
    total: graded.length,
    graded,
  }
}

// ---- Resumo por habilidade (computado das respostas module-tagged) ----

export type PlacementSkillSummary = {
  module: string
  score: number
  total: number
  ratio: number
}

const PLACEMENT_SKILL_ORDER = ['grammar', 'reading', 'listening']

// Reconstructs the per-skill breakdown from a stored placement answers array.
// Returns [] for legacy results whose answers were not tagged with `module`.
export function summarizePlacementSkills(
  answers: Array<{ module?: unknown; correct?: unknown }> | null | undefined
): PlacementSkillSummary[] {
  const byModule = new Map<string, { score: number; total: number }>()

  for (const answer of answers || []) {
    const moduleName = typeof answer?.module === 'string' ? answer.module : null
    if (!moduleName) continue
    const entry = byModule.get(moduleName) || { score: 0, total: 0 }
    entry.total += 1
    if (answer.correct === true) entry.score += 1
    byModule.set(moduleName, entry)
  }

  return Array.from(byModule.entries())
    .map(([moduleName, { score, total }]) => ({
      module: moduleName,
      score,
      total,
      ratio: total > 0 ? score / total : 0,
    }))
    .sort((a, b) => {
      const ai = PLACEMENT_SKILL_ORDER.indexOf(a.module)
      const bi = PLACEMENT_SKILL_ORDER.indexOf(b.module)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
}

// ---- Validação estrutural das questões geradas pela IA (#3) ----

export type ValidatedPlacementQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

// Descarta itens malformados: pergunta vazia, menos de 2 opções, opção vazia,
// opções duplicadas, ou correctAnswer fora do intervalo das opções.
export function validateGeneratedQuestions(rawQuestions: unknown): ValidatedPlacementQuestion[] {
  if (!Array.isArray(rawQuestions)) return []
  const valid: ValidatedPlacementQuestion[] = []

  rawQuestions.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return
    const q = raw as { id?: unknown; question?: unknown; options?: unknown; correctAnswer?: unknown }

    if (typeof q.question !== 'string' || q.question.trim().length === 0) return
    if (!Array.isArray(q.options) || q.options.length < 2) return
    if (!q.options.every((o) => typeof o === 'string' && o.trim().length > 0)) return

    const normalized = (q.options as string[]).map((o) => o.trim().toLowerCase())
    if (new Set(normalized).size !== normalized.length) return // opções duplicadas

    if (typeof q.correctAnswer !== 'number' || !Number.isInteger(q.correctAnswer)) return
    if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) return

    valid.push({
      id: typeof q.id === 'number' ? q.id : index + 1,
      question: q.question.trim(),
      options: q.options as string[],
      correctAnswer: q.correctAnswer,
    })
  })

  return valid
}
