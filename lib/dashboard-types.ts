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
    mercadopago_status?: string | null
  }>
}

export type DocumentIssuanceSummary = {
  id: number
  kind: 'contract' | 'enrollment_declaration' | 'cancellation_notice'
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

export type StudentContractPlanSummary = {
  freq_semana?: number | null
  remarca_max_mes?: number | null
  descricao?: string | null
}

export type StudentContractSummary = {
  id: number
  aluno_id?: string
  status: StatusContrato
  status_financeiro?: 'em_dia' | 'pendente' | null
  data_inicio: string
  data_fim: string
  created_at?: string
  aulas_dadas?: number | null
  aulas_totais?: number | null
  aulas_restantes?: number | null
  semestre?: string | null
  ano?: number | null
  valor?: number | string | null
  tipo_contrato?: string | null
  nivel_atual?: string | null
  livro_atual?: string | null
  horario?: string | null
  dia_vencimento?: number | null
  forma_pagamento?: string | null
  planos?: StudentContractPlanSummary | null
  profiles?: Pick<
    Profile,
    'full_name' | 'email' | 'phone' | 'birth_date' | 'nivel' | 'streak_count' | 'last_activity_date'
  > | null
}

export type MonthlyRescheduleSummary = {
  aluno_id?: string
  mes: string
  quantidade: number
}

export type ActivityLogSummary = {
  id: number | string
  title: string
  description: string
  severity?: string | null
  target_user_id?: string | null
  created_at: string
}

export type ContractAddendumSummary = {
  id: number
  contract_id: number
  previous_open_value?: number | string | null
  new_open_value?: number | string | null
  previous_open_installments?: number | null
  new_open_installments?: number | null
  first_due_date?: string | null
  created_at: string
}

export type ContractCancellationSummary = {
  id: number
  contract_id: number
  effective_date: string
  reason_label: string
  reason_details?: string | null
  paid_amount?: number | string | null
  consumed_value?: number | string | null
  outstanding_value?: number | string | null
  credit_value?: number | string | null
  completed_lessons?: number | null
  future_lessons_cancelled?: number | null
  created_at: string
}

export type ProfessorLessonScheduleItem = TimelineAula & {
  contratos?: {
    status?: StatusContrato | string
    aluno_id?: string
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
}

export type ProfessorContractSummary = StudentContractSummary & {
  pagamentos?: Array<{
    status?: string | null
    parcela_num?: number | null
    valor?: number | string | null
    data_vencimento?: string | null
    data_pagamento?: string | null
    mercadopago_status?: string | null
  }> | null
}

export type ProfessorRescheduleRequest = TimelineAula & {
  contratos?: {
    aluno_id: string | null
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
  contracts?: {
    aluno_id: string | null
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
}

export type StudentListProfile = Pick<
  Profile,
  'id' | 'full_name' | 'email' | 'phone' | 'birth_date'
>

export type RenegotiationPaymentSummary = {
  id: number
  status?: string | null
  valor?: number | string | null
  data_vencimento?: string | null
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

export type PlacementAnswerRecord = Partial<PlacementQuestion> & {
  selected?: number
  correct?: boolean
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
