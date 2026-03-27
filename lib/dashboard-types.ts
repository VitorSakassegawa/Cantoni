import type { Aula, Pagamento, Profile, StatusAula, StatusContrato } from '@/lib/types'
import type { LocalPaymentStatus } from '@/lib/payments'

export type PaymentContractSummary = {
  id: number
  data_inicio: string
  data_fim: string
  status: StatusContrato | string
}

export type PaymentWithEffectiveStatus = Pagamento & {
  effectiveStatus: LocalPaymentStatus
  contratos?: {
    id?: number
    aluno_id?: string
    profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'> | null
  } | null
}

export type StudentPaymentGroup = {
  contratoId: number
  alunoId?: string
  studentName: string
  studentPhone?: string | null
  totalValue: number
  openValue: number
  paidCount: number
  totalCount: number
  status: 'Em dia' | 'Atrasado'
  installments: Array<{
    id: number
    parcela_num: number
    valor: number
    data_vencimento: string
    status: LocalPaymentStatus
  }>
}

export type DocumentIssuanceSummary = {
  id: number
  kind: 'contract' | 'enrollment_declaration'
  version: number
  status: string
  created_at: string
  external_signature_status?: string | null
}

export type TimelineAula = Aula & {
  contracts?: {
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
  contratos?: {
    aluno_id?: string
    tipo_contrato?: string | null
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
  status: StatusAula
  data_hora_solicitada?: string | null
  justificativa_professor?: string | null
  motivo_remarcacao?: string | null
  ai_summary_pt?: string | null
  ai_summary_en?: string | null
  homework_type?: 'regular' | 'esl_brains' | 'evolve' | null
  homework_link?: string | null
  homework_image_url?: string | null
  homework_due_date?: string | null
  class_notes?: string | null
  vocabulary_json?: VocabularyEntry[] | null
  remarkBlockReason?: string | null
}

export type VocabularyEntry = {
  word: string
  translation: string
  example?: string
}

export type LessonAnalysisResult = {
  summary_pt: string
  summary_en: string
  homework?: string
  due_date?: string
  vocabulary: VocabularyEntry[]
}

export type PlacementQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

export type PlacementModule = 'grammar' | 'reading' | 'listening'
export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export type PlacementQuestionSet = {
  module: PlacementModule
  text: string | null
  questions: PlacementQuestion[]
  error?: string
}

export type PlacementAnswer = PlacementQuestion & {
  selected: number
  correct: boolean
}

export type PlacementEvaluationResult = {
  suggestedLevel: PlacementLevel
  suggestedNivel: string
  score: number
  total: number
  confirmed: boolean
  insights: string
}

export type PlacementResultRecord = {
  id: string
  created_at: string
  cefr_level: string
  insights: string | null
}
