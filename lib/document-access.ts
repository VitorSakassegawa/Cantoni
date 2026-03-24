import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getDocumentContext(contractId: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: contract } = await supabase
    .from('contratos')
    .select('*, planos(*), profiles(*)')
    .eq('id', contractId)
    .single()

  if (!contract) {
    redirect(profile?.role === 'professor' ? '/professor' : '/aluno')
  }

  const isProfessor = profile?.role === 'professor'
  if (!isProfessor && contract.aluno_id !== user.id) {
    redirect('/aluno')
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
