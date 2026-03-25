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
    profiles?: Pick<Profile, 'full_name' | 'email'> | null
  } | null
}

export type StudentPaymentGroup = {
  contratoId: number
  studentName: string
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
    tipo_contrato?: string | null
    profiles?: Pick<Profile, 'full_name'> | null
  } | null
  status: StatusAula
  data_hora_solicitada?: string | null
  justificativa_professor?: string | null
  motivo_remarcacao?: string | null
  ai_summary_pt?: string | null
  ai_summary_en?: string | null
  homework_type?: string | null
  homework_link?: string | null
  homework_image_url?: string | null
  remarkBlockReason?: string | null
}
