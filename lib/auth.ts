import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    throw new Error('Não autenticado')
  }
  return user
}

export async function requireProfessor() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    throw new Error('Acesso negado: apenas professores podem realizar esta ação')
  }

  return { user, profile }
}

export async function ensureOwnership(resourceId: string, table: string, ownerField: string = 'aluno_id') {
  const user = await requireAuth()
  const supabase = await createClient()
  
  // First check if user is professor (they have bypass)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role === 'professor') return user

  // Check ownership
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
