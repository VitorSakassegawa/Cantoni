'use server'

import { createClient } from '@/lib/supabase/server'
import { generateLessonSummary } from '@/lib/ai'
import { enviarResumoAulaAI } from '@/lib/resend'
import { revalidatePath } from 'next/cache'

export async function enviarResumoAI(aulaId: number) {
  const supabase = await createClient()

  // 1. Fetch lesson and student details
  const { data: aula, error: aulaError } = await supabase
    .from('aulas')
    .select('*, contratos(alunos(nome, email))')
    .eq('id', aulaId)
    .single()

  if (aulaError || !aula) {
    throw new Error('Aula não encontrada')
  }

  const student = (aula.contratos as any)?.alunos
  if (!student || !student.email) {
    throw new Error('E-mail do aluno não encontrado')
  }

  if (!aula.class_notes) {
    throw new Error('Nenhuma nota de aula encontrada para gerar o resumo')
  }

  try {
    // 2. Generate summary via Gemini
    const summaryMarkdown = await generateLessonSummary(aula.class_notes)

    // 3. Send email via Resend
    const dataFmt = new Date(aula.data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    await enviarResumoAulaAI({
      to: student.email,
      nomeAluno: student.nome,
      dataHora: dataFmt,
      resumoMarkdown: summaryMarkdown
    })

    // 4. Update lesson status
    const { error: updateError } = await supabase
      .from('aulas')
      .update({ ai_summary_sent: true })
      .eq('id', aulaId)

    if (updateError) throw updateError

    revalidatePath('/professor/alunos/[id]', 'page')
    return { success: true }
  } catch (error: any) {
    console.error('Error generating/sending AI summary:', error)
    return { success: false, error: error.message }
  }
}
