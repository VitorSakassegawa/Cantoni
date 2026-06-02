import { createClient } from '@/lib/supabase/server'
import { FileText } from 'lucide-react'
import ManualTranscriptImportButton from './ManualTranscriptImportButton'
import { formatDateOnly } from '@/lib/utils'

type PendingLessonProfile = { full_name?: string | null }
type PendingLesson = {
  id: number
  data_hora: string
  contratos?: { profiles?: PendingLessonProfile | PendingLessonProfile[] | null } | null
}

function studentName(lesson: PendingLesson) {
  const profile = Array.isArray(lesson.contratos?.profiles)
    ? lesson.contratos?.profiles[0]
    : lesson.contratos?.profiles
  return profile?.full_name || 'Aluno'
}

/**
 * In-app reminder for the professor: lessons that already happened (have a Meet
 * link, no AI summary yet) and need the transcript import run. This stands in
 * for an automatic schedule, which the Vercel Hobby plan can't provide.
 */
export default async function TranscriptImportReminder() {
  const supabase = await createClient()
  const now = new Date()
  const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const until = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('aulas')
    .select('id, data_hora, contratos(profiles(full_name))')
    .not('meet_link', 'is', null)
    .is('ai_summary_pt', null)
    .lte('data_hora', until)
    .gte('data_hora', since)
    .in('status', ['agendada', 'confirmada', 'dada'])
    .order('data_hora', { ascending: false })
    .limit(20)

  const pending = (data || []) as PendingLesson[]
  if (pending.length === 0) {
    return null
  }

  const preview = pending.slice(0, 4)
  const isSingle = pending.length === 1

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm shadow-amber-200/30">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-700">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Transcrições pendentes</p>
          </div>
          <p className="text-sm font-bold text-slate-700">
            {pending.length} aula{isSingle ? '' : 's'} já {isSingle ? 'terminou' : 'terminaram'} e ainda{' '}
            {isSingle ? 'aguarda' : 'aguardam'} a importação da transcrição — gera o resumo, a lição de casa e os
            flashcards.
          </p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {preview.map((lesson) => (
              <li
                key={lesson.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm"
              >
                {studentName(lesson)} · {formatDateOnly(lesson.data_hora)}
              </li>
            ))}
            {pending.length > preview.length ? (
              <li className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-400 shadow-sm">
                +{pending.length - preview.length}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="shrink-0">
          <ManualTranscriptImportButton compact />
        </div>
      </div>
    </div>
  )
}
