'use server'

import { revalidatePath } from 'next/cache'
import { requireLessonAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { generateLessonAnalysisV2 } from '@/lib/ai'
import { enviarResumoAulaAI } from '@/lib/resend'
import { syncFlashcardsFromVocabulary } from '@/lib/flashcards-auto'
import type { VocabularyEntry } from '@/lib/dashboard-types'

type StudentSummary = {
  id: string
  email?: string | null
  full_name?: string | null
  cefr_level?: string | null
  nivel?: string | null
  tipo_aula?: string | null
}

function getContractStudent(contrato: { profiles?: unknown } | null | undefined) {
  const student = contrato?.profiles
  if (Array.isArray(student)) {
    return (student[0] || null) as StudentSummary | null
  }

  return (student || null) as StudentSummary | null
}

export async function getAIAnalysisV2(aulaId: number, content?: string) {
  const { aula, contrato, isProfessor } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: false,
  })

  if (!isProfessor) {
    throw new Error('Apenas professores podem gerar resumos por IA')
  }

  const student = getContractStudent(contrato)
  const currentNotes = content || aula.class_notes
  if (!currentNotes) {
    throw new Error('Nenhuma nota encontrada')
  }

  const studentInfo = {
    name: student?.full_name || 'Student',
    level: student?.cefr_level || student?.nivel || 'A1',
    lessonType: student?.tipo_aula || 'General English',
    date: new Date(aula.data_hora).toLocaleDateString('pt-BR'),
    durationMinutes: aula?.duracao_minutos || 45,
  }

  return generateLessonAnalysisV2(currentNotes, studentInfo)
}

export async function enviarResumoAI(
  aulaId: number,
  summaries: { pt: string; en: string },
  vocabulary?: VocabularyEntry[]
) {
  const { aula, contrato, isProfessor } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: false,
  })

  if (!isProfessor) {
    throw new Error('Apenas professores podem enviar resumos por IA')
  }

  const supabase = await createClient()
  const student = getContractStudent(contrato)

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
      nomeAluno: student.full_name || 'Aluno(a)',
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
      try {
        await syncFlashcardsFromVocabulary(student.id, vocabulary)
      } catch (flashError) {
        console.error('Error syncing flashcards:', flashError)
      }
    }

    revalidatePath('/professor')
    revalidatePath('/aluno')
    revalidatePath('/aluno/flashcards')
    return { success: true }
  } catch (error) {
    console.error('Error sending AI summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar resumo por IA',
    }
  }
}
