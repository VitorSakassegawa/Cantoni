'use server'

import { createClient } from '@/lib/supabase/server'
import { generateLessonAnalysisV2 } from '@/lib/ai'
import { enviarResumoAulaAI } from '@/lib/resend'
import { revalidatePath } from 'next/cache'

export async function getAIAnalysisV2(aulaId: number, content?: string) {
  const supabase = await createClient()

  const { data: aula, error: aulaError } = await supabase
    .from('aulas')
    .select('*, contratos(*, profiles(*))')
    .eq('id', aulaId)
    .single()

  if (aulaError || !aula) throw new Error('Aula não encontrada')

  const student = (aula.contratos as any)?.profiles
  const currentNotes = content || aula.class_notes
  if (!currentNotes) throw new Error('Nenhuma nota encontrada')

  const studentInfo = {
    name: student?.full_name || 'Student',
    level: student?.cefr_level || student?.nivel || 'A1',
    lessonType: student?.tipo_aula || 'General English',
    date: new Date(aula.data_hora).toLocaleDateString('pt-BR')
  }

  return await generateLessonAnalysisV2(currentNotes, studentInfo)
}

export async function enviarResumoAI(aulaId: number, summaries: { pt: string, en: string }, vocabulary?: any[]) {
  const supabase = await createClient()

  // 1. Fetch lesson and student details
  const { data: aula, error: aulaError } = await supabase
    .from('aulas')
    .select('*, contratos(*, profiles(id, full_name, email))')
    .eq('id', aulaId)
    .single()

  if (aulaError || !aula) {
    throw new Error('Aula não encontrada')
  }

  const student = (aula.contratos as any)?.profiles
  if (!student || !student.email) {
    throw new Error('E-mail do aluno não encontrado')
  }

  try {
    // 2. Use provided summaries
    const { pt: summaryPt, en: summaryEn } = summaries

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
      resumoMarkdown: summaryPt
    })

    // 4. Update lesson with summaries and status
    const { error: updateError } = await supabase
      .from('aulas')
      .update({ 
        ai_summary_sent: true,
        ai_summary_pt: summaryPt,
        ai_summary_en: summaryEn
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
    console.error('Error sending AI summary:', error)
    return { success: false, error: error.message }
  }
}
