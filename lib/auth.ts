import 'server-only'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from './supabase/server'

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
    throw new Error('Não autenticado')
  }
  return user
}

export async function getCurrentProfile() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Perfil do usuário não encontrado')
  }

  return { user, profile }
}

export async function requireProfessor() {
  const { user, profile } = await getCurrentProfile()

  if (profile.role !== 'professor') {
    throw new Error('Acesso negado: apenas professores podem realizar esta ação')
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
    .select('*, contratos(*, planos(*), profiles(*))')
    .eq('id', aulaId)
    .single()

  if (error || !aula) {
    throw new Error('Aula não encontrada')
  }

  const contrato = aula.contratos as any
  const isProfessor = profile.role === 'professor'
  const isOwner = contrato?.aluno_id === user.id

  if ((isProfessor && allowProfessor) || (isOwner && allowStudentOwner)) {
    return {
      user,
      profile,
      aula,
      contrato,
      isProfessor,
      isOwner,
      serviceSupabase,
    }
  }

  throw new Error('Sem permissão para acessar esta aula')
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
    .select(ownerField)
    .eq('id', resourceId)
    .single()

  if (error || !data || data[ownerField] !== user.id) {
    throw new Error('Sem permissão para acessar este recurso')
  }

  return user
}
