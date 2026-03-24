import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: teacher } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'professor')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    viewer: profile,
    student: contract.profiles,
    teacher,
    contract,
    payments: payments || [],
    addenda: addenda || [],
    isProfessor,
  }
}
