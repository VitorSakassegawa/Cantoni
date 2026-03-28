import 'server-only'
import { createClient, createServiceClient } from './supabase/server'

type AuthProfile = {
  id: string
  role?: string | null
  email?: string | null
  full_name?: string | null
  nivel?: string | null
  cefr_level?: string | null
  tipo_aula?: string | null
}

type LessonAccessPlan = {
  remarca_max_mes?: number | null
  freq_semana?: number | null
}

type LessonAccessContract = {
  id: number
  aluno_id?: string | null
  aulas_dadas?: number | null
  aulas_restantes?: number | null
  nivel_atual?: string | null
  livro_atual?: string | null
  planos?: LessonAccessPlan | null
  profiles?: AuthProfile | null
}

type RawLessonAccessPlan = LessonAccessPlan | LessonAccessPlan[] | null
type RawLessonAccessProfile = AuthProfile | AuthProfile[] | null
type RawLessonAccessContract = Omit<LessonAccessContract, 'planos' | 'profiles'> & {
  planos?: RawLessonAccessPlan
  profiles?: RawLessonAccessProfile
}

type LessonAccessLesson = {
  id: number
  contrato_id?: number | null
  status?: string | null
  data_hora: string
  duracao_minutos?: number | null
  class_notes?: string | null
  google_event_id?: string | null
  meet_link?: string | null
  motivo_remarcacao?: string | null
  data_hora_solicitada?: string | null
  justificativa_professor?: string | null
  contratos?: LessonAccessContract | LessonAccessContract[] | null
}

type RawLessonAccessLesson = Omit<LessonAccessLesson, 'contratos'> & {
  contratos?: RawLessonAccessContract | RawLessonAccessContract[] | null
}

type OwnershipRow = {
  id: string
  ownerId?: string | null
}

function normalizeLessonContract(rawContract: RawLessonAccessContract | null): LessonAccessContract | null {
  if (!rawContract) return null

  return {
    ...rawContract,
    planos: Array.isArray(rawContract.planos) ? (rawContract.planos[0] ?? null) : (rawContract.planos ?? null),
    profiles: Array.isArray(rawContract.profiles)
      ? (rawContract.profiles[0] ?? null)
      : (rawContract.profiles ?? null),
  }
}

function getOwnedFieldValue(row: unknown, ownerField: string): OwnershipRow {
  if (!row || typeof row !== 'object') {
    return { id: '', ownerId: null }
  }

  const typedRow = row as Record<string, string | number | null | undefined>
  return {
    id: String(typedRow.id ?? ''),
    ownerId: typedRow[ownerField]?.toString() ?? null,
  }
}

const PROFILE_SELECT = 'id, role, email, full_name, nivel'
const LESSON_SELECT = `
  id,
  contrato_id,
  status,
  data_hora,
  duracao_minutos,
  class_notes,
  google_event_id,
  meet_link,
  motivo_remarcacao,
  data_hora_solicitada,
  justificativa_professor,
  contratos(
    id,
    aluno_id,
    aulas_dadas,
    aulas_restantes,
    nivel_atual,
    livro_atual,
    planos(remarca_max_mes, freq_semana),
    profiles(id, email, full_name, nivel, cefr_level, tipo_aula)
  )
`

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    throw new Error('Nao autenticado')
  }
  return user
}

export async function getCurrentProfile() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Perfil do usuario nao encontrado')
  }

  return { user, profile: profile as AuthProfile }
}

export async function requireProfessor() {
  const { user, profile } = await getCurrentProfile()

  if (profile.role !== 'professor') {
    throw new Error('Acesso negado: apenas professores podem realizar esta acao')
  }

  return { user, profile }
}

export async function requireLessonAccess(
  aulaId: number,
  options?: {
    allowProfessor?: boolean
    allowStudentOwner?: boolean
  }
) {
  const { allowProfessor = true, allowStudentOwner = true } = options ?? {}
  const { user, profile } = await getCurrentProfile()
  const serviceSupabase = await createServiceClient()

  const { data: aula, error } = await serviceSupabase
    .from('aulas')
    .select(LESSON_SELECT)
    .eq('id', aulaId)
    .single()

  if (error || !aula) {
    throw new Error('Aula nao encontrada')
  }

  const typedLesson = aula as unknown as RawLessonAccessLesson
  const rawContract = Array.isArray(typedLesson.contratos)
    ? (typedLesson.contratos[0] ?? null)
    : (typedLesson.contratos ?? null)
  const contrato = normalizeLessonContract(rawContract)

  if (!contrato) {
    throw new Error('Contrato da aula nao encontrado')
  }

  const isProfessor = profile.role === 'professor'
  const isOwner = contrato.aluno_id === user.id

  if ((isProfessor && allowProfessor) || (isOwner && allowStudentOwner)) {
    return {
      user,
      profile,
      aula: typedLesson,
      contrato,
      isProfessor,
      isOwner,
      serviceSupabase,
    }
  }

  throw new Error('Sem permissao para acessar esta aula')
}

export async function ensureOwnership(
  resourceId: string,
  table: string,
  ownerField: string = 'aluno_id'
) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professor') {
    return user
  }

  const { data, error } = await supabase
    .from(table)
    .select(`id, ${ownerField}`)
    .eq('id', resourceId)
    .single()

  const ownerData = data
    ? getOwnedFieldValue(data, ownerField)
    : null

  if (error || !ownerData || ownerData.ownerId !== user.id) {
    throw new Error('Sem permissao para acessar este recurso')
  }

  return user
}
