import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { subDays } from 'date-fns'
import { generateLessonAnalysisV2 } from '@/lib/ai'
import {
  extractImportedTranscriptName,
  hasImportedTranscript,
  importMeetTranscriptForLesson,
  mergeTranscriptIntoLessonNotes,
  truncateTranscriptForAI,
} from '@/lib/google-meet'

type LessonRow = {
  id: number
  data_hora: string
  status: string
  meet_link?: string | null
  class_notes?: string | null
  ai_summary_pt?: string | null
  ai_summary_en?: string | null
  homework?: string | null
  homework_due_date?: string | null
  contratos?: {
    profiles?:
      | {
          full_name?: string | null
          email?: string | null
          cefr_level?: string | null
          nivel?: string | null
          tipo_aula?: string | null
        }
      | Array<{
          full_name?: string | null
          email?: string | null
          cefr_level?: string | null
          nivel?: string | null
          tipo_aula?: string | null
        }>
      | null
  } | null
}

export type MeetTranscriptImportResult = {
  checked: number
  imported: number
  skipped: number
  failed: number
  details: Array<{ lessonId: number; status: string; reason?: string }>
}

function normalizeStudentProfile(lesson: LessonRow) {
  const profile = Array.isArray(lesson.contratos?.profiles)
    ? lesson.contratos?.profiles[0]
    : lesson.contratos?.profiles

  return {
    name: profile?.full_name || 'Student',
    level: profile?.cefr_level || profile?.nivel || 'A1',
    lessonType: profile?.tipo_aula || 'General English',
    date: new Date(lesson.data_hora).toLocaleDateString('pt-BR'),
  }
}

function inferDurationMinutes(
  transcriptStartedAt?: string | null,
  transcriptEndedAt?: string | null,
  fallbackMinutes = 45
) {
  if (transcriptStartedAt && transcriptEndedAt) {
    const startTime = new Date(transcriptStartedAt).getTime()
    const endTime = new Date(transcriptEndedAt).getTime()

    if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
      return Math.max(1, Math.round((endTime - startTime) / 60000))
    }
  }

  return fallbackMinutes
}

export async function runMeetTranscriptImport({
  limit = 20,
  lookbackDays = 7,
  force = false,
}: {
  limit?: number
  lookbackDays?: number
  force?: boolean
}): Promise<MeetTranscriptImportResult> {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const safeLookbackDays = Math.min(Math.max(Number(lookbackDays) || 7, 1), 30)
  const supabase = await createServiceClient()

  const importableSince = subDays(new Date(), safeLookbackDays).toISOString()
  const importableUntil = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: lessons, error } = await supabase
    .from('aulas')
    .select(
      'id, data_hora, status, meet_link, class_notes, ai_summary_pt, ai_summary_en, homework, homework_due_date, contratos(profiles(full_name, email, cefr_level, nivel, tipo_aula))'
    )
    .not('meet_link', 'is', null)
    .lte('data_hora', importableUntil)
    .gte('data_hora', importableSince)
    .in('status', ['agendada', 'confirmada', 'dada'])
    .order('data_hora', { ascending: false })
    .limit(safeLimit)

  if (error) {
    throw new Error(error.message)
  }

  let checked = 0
  let imported = 0
  let skipped = 0
  let failed = 0
  const details: Array<{ lessonId: number; status: string; reason?: string }> = []

  for (const lesson of (lessons || []) as LessonRow[]) {
    checked += 1

    try {
      const importedTranscript = await importMeetTranscriptForLesson({
        meetLink: lesson.meet_link,
        scheduledAt: lesson.data_hora,
      })

      if (!importedTranscript) {
        skipped += 1
        details.push({ lessonId: lesson.id, status: 'skipped', reason: 'no_transcript_available' })
        continue
      }

      const sameTranscriptAlreadyImported =
        !force &&
        lesson.ai_summary_pt &&
        hasImportedTranscript(lesson.class_notes) &&
        extractImportedTranscriptName(lesson.class_notes) === importedTranscript.transcriptName

      if (sameTranscriptAlreadyImported) {
        skipped += 1
        details.push({ lessonId: lesson.id, status: 'skipped', reason: 'already_imported' })
        continue
      }

      const mergedNotes = mergeTranscriptIntoLessonNotes(lesson.class_notes, importedTranscript)
      const analysis = await generateLessonAnalysisV2(
        truncateTranscriptForAI(importedTranscript.transcriptText),
        {
          ...normalizeStudentProfile(lesson),
          durationMinutes: inferDurationMinutes(
            importedTranscript.transcriptStartedAt,
            importedTranscript.transcriptEndedAt
          ),
        }
      )

      const nextHomework =
        analysis.homework && analysis.homework !== 'Not defined'
          ? analysis.homework
          : lesson.homework || null

      const updatePayload = {
        class_notes: mergedNotes,
        ai_summary_pt: analysis.summary_pt || lesson.ai_summary_pt || null,
        ai_summary_en: analysis.summary_en || lesson.ai_summary_en || null,
        vocabulary_json: Array.isArray(analysis.vocabulary) ? analysis.vocabulary : null,
        homework: nextHomework,
        homework_due_date: analysis.due_date || lesson.homework_due_date || null,
      }

      const { error: updateError } = await supabase.from('aulas').update(updatePayload).eq('id', lesson.id)

      if (updateError) {
        throw updateError
      }

      imported += 1
      details.push({ lessonId: lesson.id, status: 'imported' })
    } catch (importError) {
      failed += 1
      const reason = importError instanceof Error ? importError.message : 'unknown_error'
      console.error('MEET_IMPORT: Failed for lesson', lesson.id, importError)
      details.push({ lessonId: lesson.id, status: 'failed', reason })
    }
  }

  return {
    checked,
    imported,
    skipped,
    failed,
    details,
  }
}
