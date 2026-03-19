export type Role = 'professor' | 'aluno'
export type Nivel = 'iniciante' | 'basico' | 'intermediario' | 'avancado' | 'conversacao' | 'certificado'
export type TipoAula = 'regular' | 'conversacao' | 'certificado'
export type Semestre = 'jan-jun' | 'jul-dez'
export type StatusContrato = 'ativo' | 'vencido' | 'cancelado'
export type StatusAula = 'agendada' | 'confirmada' | 'dada' | 'cancelada' | 'remarcada'
export type StatusPagamento = 'pendente' | 'pago' | 'atrasado' | 'vencido'
export type FormaPagemento = 'pix' | 'cartao'

export interface Profile {
  id: string
  role: Role
  full_name: string
  email: string
  phone?: string
  nivel?: Nivel
  tipo_aula?: TipoAula
}

export interface Plano {
  id: number
  freq_semana: 1 | 2
  aulas_totais: number
  remarca_max_mes: number
  descricao?: string
}

export interface Contrato {
  id: number
  aluno_id: string
  plano_id: number
  data_inicio: string
  data_fim: string
  semestre: Semestre
  ano: number
  aulas_totais: number
  aulas_dadas: number
  aulas_restantes: number
  status: StatusContrato
  livro_atual?: string
  nivel_atual?: string
  infinitepay_customer_id?: string
  created_at: string
  profiles?: Profile
  planos?: Plano
}

export interface Aula {
  id: number
  contrato_id: number
  google_event_id?: string
  data_hora: string
  duracao_minutos: number
  status: StatusAula
  aviso_horas_antecedencia?: number
  remarcada_de?: number
  meet_link?: string
  homework?: string
  homework_completed: boolean
  homework_notificado: boolean
  created_at: string
}

export interface RemarcacaoMes {
  id: number
  aluno_id: string
  mes: string
  quantidade: number
}

export interface Pagamento {
  id: number
  contrato_id: number
  parcela_num: number
  valor: number
  data_vencimento: string
  data_pagamento?: string
  forma?: FormaPagemento
  infinitepay_invoice_id?: string
  pix_qrcode_base64?: string
  pix_copia_cola?: string
  status: StatusPagamento
  email_enviado: boolean
  lembrete_enviado: boolean
}
