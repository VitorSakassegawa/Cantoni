import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function mergeTeacherProfile(primary: any, fallback: any) {
  if (!primary && !fallback) return null
  if (!primary) return fallback
  if (!fallback) return primary

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
  options?: { redirectOnFail?: boolean }
) {
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

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: contract } = await supabase
    .from('contratos')
    .select('*, planos(*), profiles(*)')
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
    .select('*')
    .eq('contrato_id', contractId)
    .order('parcela_num', { ascending: true })

  const { data: addenda } = await supabase
    .from('contract_addenda')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })

  let student = contract.profiles

  if (!student && contract.aluno_id) {
    const { data: fallbackStudent } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', contract.aluno_id)
      .maybeSingle()

    student = fallbackStudent || null
  }

  const { data: teacher } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'professor')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const fallbackTeacher = profile?.role === 'professor' ? profile : null
  const resolvedTeacher = mergeTeacherProfile(teacher, fallbackTeacher)

  return {
    viewer: profile,
    student,
    teacher: resolvedTeacher,
    contract,
    payments: payments || [],
    addenda: addenda || [],
    isProfessor,
  }
}
