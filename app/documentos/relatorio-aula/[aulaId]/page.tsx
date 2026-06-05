export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocumentShell from '@/components/documents/DocumentShell'
import { createClient } from '@/lib/supabase/server'
import { stripTeacherOnlySections } from '@/lib/lesson-summary-filter'
import type { VocabularyEntry } from '@/lib/dashboard-types'

function formatLessonDate(value: string | null) {
  if (!value) return 'Data não informada'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(value))
  } catch {
    return 'Data não informada'
  }
}

const MONTHS_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// DD.MMM.YYYY (e.g. 02.JUN.2026) — used for the print/save filename.
function formatShortDate(value: string | null) {
  if (!value) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date(value))
    const dd = parts.find((p) => p.type === 'day')?.value ?? ''
    const mm = Number(parts.find((p) => p.type === 'month')?.value ?? 0)
    const yyyy = parts.find((p) => p.type === 'year')?.value ?? ''
    if (dd && mm && yyyy) return `${dd}.${MONTHS_ABBR[mm - 1]}.${yyyy}`
  } catch {
    /* ignore */
  }
  return ''
}

function buildPrintTitle(studentName: string, dataHora: string | null) {
  const shortDate = formatShortDate(dataHora)
  return shortDate ? `CES - English Class (${shortDate} - ${studentName})` : `CES - English Class (${studentName})`
}

// Sets the page <title> server-side so the browser's "Save as PDF" uses it as
// the default filename. RLS scopes the lookup, so an unauthorized request just
// gets the generic fallback (no data leak).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ aulaId: string }>
}): Promise<Metadata> {
  const fallback: Metadata = { title: 'Relatório de Aula - Cantoni English School' }
  try {
    const { aulaId } = await params
    const id = Number(aulaId)
    if (!Number.isFinite(id)) return fallback
    const supabase = await createClient()
    const { data: aula } = await supabase
      .from('aulas')
      .select('data_hora, contratos(profiles:aluno_id(full_name))')
      .eq('id', id)
      .single()
    if (!aula) return fallback
    const contrato = (aula.contratos ?? null) as { profiles?: { full_name?: string | null } | null } | null
    const studentName = contrato?.profiles?.full_name || 'Aluno(a)'
    return { title: buildPrintTitle(studentName, aula.data_hora as string | null) }
  } catch {
    return fallback
  }
}

export default async function LessonReportPage({
  params,
}: {
  params: Promise<{ aulaId: string }>
}) {
  const { aulaId } = await params
  const id = Number(aulaId)
  if (!Number.isFinite(id)) redirect('/aluno/aulas')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isProfessor = profile?.role === 'professor'

  const { data: aula } = await supabase
    .from('aulas')
    .select('id, data_hora, ai_summary_pt, ai_summary_en, vocabulary_json, contratos(aluno_id, profiles:aluno_id(full_name))')
    .eq('id', id)
    .single()

  if (!aula) redirect(isProfessor ? '/professor/aulas' : '/aluno/aulas')

  const contrato = (aula.contratos ?? null) as { aluno_id?: string; profiles?: { full_name?: string | null } | null } | null
  const ownerId = contrato?.aluno_id

  // Ownership: a student may only open their own lesson report.
  if (!isProfessor && ownerId !== user.id) redirect('/aluno')

  const studentName = contrato?.profiles?.full_name || 'Aluno(a)'
  // Students don't see the corrections / error-pattern sections — teacher-only.
  const rawPt = aula.ai_summary_pt as string | null
  const rawEn = aula.ai_summary_en as string | null
  const summaryPt = isProfessor ? rawPt : rawPt ? stripTeacherOnlySections(rawPt) : rawPt
  const summaryEn = isProfessor ? rawEn : rawEn ? stripTeacherOnlySections(rawEn) : rawEn
  const vocabulary = (aula.vocabulary_json ?? []) as VocabularyEntry[]
  const lessonDate = formatLessonDate(aula.data_hora as string | null)
  const hasSummary = Boolean(summaryPt || summaryEn)

  return (
    <DocumentShell
      title="Relatório de Aula"
      subtitle="Documento pronto para impressão e salvamento em PDF."
      backHref={isProfessor ? '/professor/aulas' : '/aluno/aulas'}
    >
      <div className="space-y-10 text-slate-900">
        <header className="document-header space-y-3 border-b border-slate-200 pb-8 text-center">
          <div className="flex justify-center">
            <Image src="/logo-cantoni.svg" alt="Cantoni English School" width={160} height={64} className="h-16 w-auto object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cantoni English School</p>
          <h2 className="text-3xl font-black tracking-tight">Relatório de Aula</h2>
        </header>

        <section className="document-section grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.25rem] bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aluno(a)</p>
            <p className="mt-2 text-base font-bold">{studentName}</p>
          </div>
          <div className="rounded-[1.25rem] bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Data da aula</p>
            <p className="mt-2 text-base font-bold">{lessonDate}</p>
          </div>
        </section>

        {!hasSummary && (
          <section className="document-section rounded-[1.25rem] border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              O resumo desta aula ainda não foi gerado. Volte após a importação da transcrição.
            </p>
          </section>
        )}

        {summaryPt && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Resumo da aula</h3>
            <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:list-disc prose-ul:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryPt}</ReactMarkdown>
            </div>
          </section>
        )}

        {summaryEn && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Lesson summary (EN)</h3>
            <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:list-disc prose-ul:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryEn}</ReactMarkdown>
            </div>
          </section>
        )}

        {vocabulary.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Vocabulário da aula</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {vocabulary.map((entry, index) => (
                <div key={`${entry.word}-${index}`} className="document-card rounded-[1rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{entry.word}</p>
                  <p className="text-sm text-slate-600">{entry.translation}</p>
                  {entry.example && <p className="mt-1 text-xs italic text-slate-500">“{entry.example}”</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-slate-200 pt-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Cantoni English School · Relatório gerado automaticamente
          </p>
        </footer>
      </div>
    </DocumentShell>
  )
}
