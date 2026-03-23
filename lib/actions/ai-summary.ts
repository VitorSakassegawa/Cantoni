'use server'

import { createClient } from '@/lib/supabase/server'
import { generateLessonAnalysis } from '@/lib/ai'
import { enviarResumoAulaAI } from '@/lib/resend'
import { revalidatePath } from 'next/cache'

export async function enviarResumoAI(aulaId: number, content?: string) {
  const supabase = await createClient()

  // 1. Fetch lesson and student details
  const { data: aula, error: aulaError } = await supabase
    .from('aulas')
    .select('*, contratos(*, profiles(full_name, email))')
    .eq('id', aulaId)
    .single()

  if (aulaError || !aula) {
    throw new Error('Aula não encontrada')
  }

  const student = (aula.contratos as any)?.profiles
  if (!student || !student.email) {
    throw new Error('E-mail do aluno não encontrado')
  }

  const currentNotes = content || aula.class_notes
  if (!currentNotes) {
    throw new Error('Nenhuma nota de aula encontrada para gerar o resumo')
  }

  try {
    // 2. Generate summary and vocabulary via Gemini
    const { summary, vocabulary } = await generateLessonAnalysis(currentNotes)

    // 3. Send email via Resend
    const dataFmt = new Date(aula.data_hora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    await enviarResumoAulaAI({
      to: student.email,
      nomeAluno: student.full_name,
      dataHora: dataFmt,
      resumoMarkdown: summary
    })

    // 4. Update lesson with summary and status
    const { error: updateError } = await supabase
      .from('aulas')
      .update({ 
        ai_summary_sent: true,
        ai_summary: summary
      })
      .eq('id', aulaId)

    if (updateError) throw updateError

    // 5. Add new vocabulary to student's flashcards
    if (vocabulary && Array.isArray(vocabulary) && vocabulary.length > 0) {
      const flashcardsToInsert = vocabulary.map((v: any) => ({
        aluno_id: student.id,
        word: v.word,
        translation: v.translation,
        example: v.example || '',
        next_review: new Date().toISOString()
      }))

      await supabase.from('flashcards').insert(flashcardsToInsert)
    }

    revalidatePath('/professor')
    return { success: true }
  } catch (error: any) {
    console.error('Error generating/sending AI summary:', error)
    return { success: false, error: error.message }
  }
}
