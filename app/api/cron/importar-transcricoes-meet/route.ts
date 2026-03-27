import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { subDays } from 'date-fns'
import { generateLessonAnalysisV2 } from '@/lib/ai'
import {
  hasImportedTranscript,
  importMeetTranscriptForLesson,
  mergeTranscriptIntoLessonNotes,
  truncateTranscriptForAI,
} from '@/lib/google-meet'
import { getCronSecret } from '@/lib/env'

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

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true'
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

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-cron-secret')
  if (token !== getCronSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50)
  const lookbackDays = Math.min(Number(url.searchParams.get('days') || '7'), 30)
  const force = parseBoolean(url.searchParams.get('force'))

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const importableSince = subDays(new Date(), lookbackDays).toISOString()
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
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let checked = 0
  let imported = 0
  let skipped = 0
  let failed = 0
  const details: Array<{ lessonId: number; status: string; reason?: string }> = []

  for (const lesson of (lessons || []) as LessonRow[]) {
    checked += 1

    if (!force && lesson.ai_summary_pt && hasImportedTranscript(lesson.class_notes)) {
      skipped += 1
      details.push({ lessonId: lesson.id, status: 'skipped', reason: 'already_imported' })
      continue
    }

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

      const mergedNotes = mergeTranscriptIntoLessonNotes(lesson.class_notes, importedTranscript)
      const analysis = await generateLessonAnalysisV2(
        truncateTranscriptForAI(importedTranscript.transcriptText),
        normalizeStudentProfile(lesson)
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

  return NextResponse.json({
    checked,
    imported,
    skipped,
    failed,
    details,
  })
}
