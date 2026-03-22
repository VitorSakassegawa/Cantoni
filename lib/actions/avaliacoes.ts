'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarAvaliacao(alunoId: string, speaking: number, listening: number, reading: number, writing: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if professor
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') throw new Error('Unauthorized')

  const mesReferencia = new Date().toISOString().substring(0, 7) + '-01' // First day of current month

  const { error } = await supabase.from('avaliacoes_habilidades').upsert({
    aluno_id: alunoId,
    mes_referencia: mesReferencia,
    speaking,
    listening,
    reading,
    writing
  }, {
    onConflict: 'aluno_id, mes_referencia'
  })

  if (error) throw error
  revalidatePath(`/professor/alunos/${alunoId}`)
  return { success: true }
}
