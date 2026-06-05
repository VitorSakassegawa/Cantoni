export const dynamic = 'force-dynamic'

import Image from 'next/image'
import { redirect } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download } from 'lucide-react'
import DocumentShell from '@/components/documents/DocumentShell'
import { createClient } from '@/lib/supabase/server'
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
  const summaryPt = aula.ai_summary_pt as string | null
  const summaryEn = aula.ai_summary_en as string | null
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
          <div className="print:hidden">
            <a
              href={`/api/documentos/relatorio-aula/${aula.id}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </a>
          </div>
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
          <section className="document-section space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Resumo da aula</h3>
            <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:list-disc prose-ul:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryPt}</ReactMarkdown>
            </div>
          </section>
        )}

        {summaryEn && (
          <section className="document-section space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Lesson summary (EN)</h3>
            <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:list-disc prose-ul:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryEn}</ReactMarkdown>
            </div>
          </section>
        )}

        {vocabulary.length > 0 && (
          <section className="document-section space-y-3">
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

        <footer className="document-section border-t border-slate-200 pt-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Cantoni English School · Relatório gerado automaticamente
          </p>
        </footer>
      </div>
    </DocumentShell>
  )
}
