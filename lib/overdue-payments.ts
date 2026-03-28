import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

export async function runMarkOverduePayments() {
  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pagamentos')
    .update({ status: 'atrasado' })
    .eq('status', 'pendente')
    .lt('data_vencimento', today)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return {
    updated: data?.length || 0,
  }
}
