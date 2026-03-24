'use server'

import { revalidatePath } from 'next/cache'
import { requireLessonAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { generateLessonAnalysisV2 } from '@/lib/ai'
import { enviarResumoAulaAI } from '@/lib/resend'

export async function getAIAnalysisV2(aulaId: number, content?: string) {
  const { aula, contrato, isProfessor } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: false,
  })

  if (!isProfessor) {
    throw new Error('Apenas professores podem gerar resumos por IA')
  }

  let student = contrato?.profiles
  if (Array.isArray(student)) {
    student = student[0]
  }

  const currentNotes = content || aula.class_notes
  if (!currentNotes) {
    throw new Error('Nenhuma nota encontrada')
  }

  const studentInfo = {
    name: student?.full_name || 'Student',
    level: student?.cefr_level || student?.nivel || 'A1',
    lessonType: student?.tipo_aula || 'General English',
    date: new Date(aula.data_hora).toLocaleDateString('pt-BR'),
  }

  return generateLessonAnalysisV2(currentNotes, studentInfo)
}

export async function enviarResumoAI(
  aulaId: number,
  summaries: { pt: string; en: string },
  vocabulary?: any[]
) {
  const { aula, contrato, isProfessor } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: false,
  })

  if (!isProfessor) {
    throw new Error('Apenas professores podem enviar resumos por IA')
  }

  const supabase = await createClient()
  let student = contrato?.profiles
  if (Array.isArray(student)) {
    student = student[0]
  }

  if (!student || !student.email) {
    throw new Error('E-mail do aluno não encontrado')
  }

  try {
    const { pt: summaryPt, en: summaryEn } = summaries
    const dataFmt = new Date(aula.data_hora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    await enviarResumoAulaAI({
      to: student.email,
      nomeAluno: student.full_name,
      dataHora: dataFmt,
      resumoMarkdown: summaryPt,
    })

    const { error: updateError } = await supabase
      .from('aulas')
      .update({
        ai_summary_sent: true,
        ai_summary_pt: summaryPt,
        ai_summary_en: summaryEn,
        vocabulary_json: vocabulary,
      })
      .eq('id', aulaId)

    if (updateError) {
      throw updateError
    }

    if (vocabulary && Array.isArray(vocabulary) && vocabulary.length > 0) {
      const flashcardsToInsert = vocabulary.map((item: any) => ({
        aluno_id: student.id,
        word: item.word,
        translation: item.translation,
        example: item.example || '',
        next_review: new Date().toISOString(),
      }))

      const { error: flashError } = await supabase.from('flashcards').insert(flashcardsToInsert)
      if (flashError) {
        console.error('Error inserting flashcards:', flashError)
      }
    }

    revalidatePath('/professor')
    return { success: true }
  } catch (error: any) {
    console.error('Error sending AI summary:', error)
    return { success: false, error: error.message }
  }
}
