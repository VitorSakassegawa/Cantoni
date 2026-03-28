import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveCpf } from '@/lib/cpf-security'

type DocumentAccessProfile = {
  id?: string
  role?: string | null
  full_name?: string | null
  cpf?: string | null
  cpf_encrypted?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
}

type DocumentAccessContract = {
  id: number
  aluno_id?: string | null
  aulas_totais: number
  data_inicio: string
  data_fim: string
  horario?: string | null
  tipo_contrato?: string | null
  valor?: number | string | null
  forma_pagamento?: string | null
  status?: string | null
  dias_da_semana?: number[] | null
  planos?: {
    freq_semana?: number | null
    remarca_max_mes?: number | null
  } | null
  profiles?: DocumentAccessProfile | null
}

type DocumentAccessPayment = {
  parcela_num: number
  valor?: number | string | null
  data_vencimento: string
}

type DocumentAccessAddendum = {
  id: number
  previous_open_value?: number | string | null
  new_open_value?: number | string | null
  previous_open_installments?: number | null
  new_open_installments?: number | null
  first_due_date?: string | null
}

type DocumentAccessContext = {
  viewer: DocumentAccessProfile | null
  student: DocumentAccessProfile | null
  teacher: DocumentAccessProfile | null
  contract: DocumentAccessContract
  payments: DocumentAccessPayment[]
  addenda: DocumentAccessAddendum[]
  isProfessor: boolean
}

type DocumentAccessOptions = {
  redirectOnFail?: boolean
}

const PROFILE_SELECT = 'id, role, full_name, cpf, cpf_encrypted, email, phone, city'
const CONTRACT_SELECT = `
  id,
  aluno_id,
  aulas_totais,
  data_inicio,
  data_fim,
  horario,
  tipo_contrato,
  valor,
  forma_pagamento,
  status,
  dias_da_semana,
  planos(freq_semana, remarca_max_mes),
  profiles(${PROFILE_SELECT})
`
const PAYMENT_SELECT = 'parcela_num, valor, data_vencimento'
const ADDENDUM_SELECT =
  'id, previous_open_value, new_open_value, previous_open_installments, new_open_installments, first_due_date'

function normalizeProfile(profile: DocumentAccessProfile | null | undefined): DocumentAccessProfile | null {
  if (!profile) return null

  return {
    ...profile,
    cpf: resolveCpf(profile),
    cpf_encrypted: null,
  }
}

function mergeTeacherProfile(
  primary: DocumentAccessProfile | null | undefined,
  fallback: DocumentAccessProfile | null | undefined
): DocumentAccessProfile | null {
  if (!primary && !fallback) return null
  if (!primary) return fallback ?? null
  if (!fallback) return primary ?? null

  return {
    ...fallback,
    ...primary,
    full_name: primary.full_name || fallback.full_name,
    cpf: primary.cpf || fallback.cpf,
    email: primary.email || fallback.email,
    phone: primary.phone || fallback.phone,
    city: primary.city || fallback.city,
  }
}

export async function getDocumentContext(
  contractId: number,
  options?: DocumentAccessOptions
): Promise<DocumentAccessContext> {
  const redirectOnFail = options?.redirectOnFail ?? true
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (redirectOnFail) {
      redirect('/login')
    }
    throw new Error('Não autenticado')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .single()

  const { data: contract } = await supabase
    .from('contratos')
    .select(CONTRACT_SELECT)
    .eq('id', contractId)
    .single()

  if (!contract) {
    if (redirectOnFail) {
      redirect(profile?.role === 'professor' ? '/professor' : '/aluno')
    }
    throw new Error('Contrato não encontrado')
  }

  const isProfessor = profile?.role === 'professor'
  if (!isProfessor && contract.aluno_id !== user.id) {
    if (redirectOnFail) {
      redirect('/aluno')
    }
    throw new Error('Sem permissão para acessar este documento')
  }

  const { data: payments } = await supabase
    .from('pagamentos')
    .select(PAYMENT_SELECT)
    .eq('contrato_id', contractId)
    .order('parcela_num', { ascending: true })

  const { data: addenda } = await supabase
    .from('contract_addenda')
    .select(ADDENDUM_SELECT)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })

  const typedContract = contract as DocumentAccessContract
  let student = typedContract.profiles

  if (!student && typedContract.aluno_id) {
    const { data: fallbackStudent } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', typedContract.aluno_id)
      .maybeSingle()

    student = fallbackStudent || null
  }

  const { data: teacher } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', 'professor')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const fallbackTeacher: DocumentAccessProfile | null = profile?.role === 'professor' ? profile : null
  const resolvedTeacher = mergeTeacherProfile(teacher, fallbackTeacher)

  return {
    viewer: normalizeProfile(profile),
    student: normalizeProfile(student),
    teacher: resolvedTeacher,
    contract: typedContract,
    payments: (payments || []) as DocumentAccessPayment[],
    addenda: (addenda || []) as DocumentAccessAddendum[],
    isProfessor,
  }
}
