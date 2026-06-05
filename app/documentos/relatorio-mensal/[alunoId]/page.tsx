export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DocumentShell from '@/components/documents/DocumentShell'
import { createClient } from '@/lib/supabase/server'
import { averageSkillScores, SKILL_KEYS, type SkillScores } from '@/lib/lesson-skills'

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const SKILL_LABELS: Record<string, string> = { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing' }

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  return `${y}-${m}`
}

function normalizeMonth(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth()
}

function monthRange(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const startDate = `${mes}-01`
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`
  // São Paulo is UTC-03:00 (no DST). Offset the timestamptz boundaries so the
  // month window aligns to SP calendar days, not UTC — otherwise events in the
  // last 3h of a month would be counted in the wrong month.
  return {
    startDate,
    endDate,
    startTs: `${startDate}T00:00:00-03:00`,
    endTs: `${endDate}T00:00:00-03:00`,
    year: y,
    month: m,
  }
}

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function resolveContext(alunoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isProfessor = profile?.role === 'professor'
  if (!isProfessor && user.id !== alunoId) redirect('/aluno')

  const { data: aluno } = await supabase.from('profiles').select('full_name').eq('id', alunoId).single()
  return { supabase, isProfessor, aluno: aluno as { full_name?: string | null } | null }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string }>
  searchParams: Promise<{ mes?: string }>
}): Promise<Metadata> {
  const fallback: Metadata = { title: 'Relatório Mensal - Cantoni English School' }
  try {
    const { alunoId } = await params
    const mes = normalizeMonth((await searchParams).mes)
    const { aluno } = await resolveContext(alunoId)
    const [, m] = mes.split('-').map(Number)
    const name = aluno?.full_name || 'Aluno'
    return { title: `CES - Monthly Report (${MONTHS_ABBR[m - 1]}.${mes.split('-')[0]} - ${name})` }
  } catch {
    return fallback
  }
}

export default async function MonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { alunoId } = await params
  const mes = normalizeMonth((await searchParams).mes)
  const { supabase, isProfessor, aluno } = await resolveContext(alunoId)
  const { startDate, endDate, startTs, endTs, month, year } = monthRange(mes)
  const studentName = aluno?.full_name || 'Aluno(a)'

  // Lessons in the month (across the student's contracts).
  const { data: contratos } = await supabase.from('contratos').select('id').eq('aluno_id', alunoId)
  const contractIds = (contratos ?? []).map((c) => c.id)
  const { data: aulas } = contractIds.length
    ? await supabase
        .from('aulas')
        .select('status, data_hora')
        .in('contrato_id', contractIds)
        .gte('data_hora', startTs)
        .lt('data_hora', endTs)
    : { data: [] as Array<{ status: string; data_hora: string }> }
  const lessons = (aulas ?? []) as Array<{ status: string; data_hora: string }>
  const attended = lessons.filter((l) => ['dada', 'finalizado'].includes(l.status)).length
  const cancelled = lessons.filter((l) => l.status === 'cancelada').length
  const totalCounted = attended + cancelled
  const attendanceRate = totalCounted > 0 ? Math.round((attended / totalCounted) * 100) : null

  // Vocabulary added this month.
  const { count: vocabAdded } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('aluno_id', alunoId)
    .gte('created_at', startTs)
    .lt('created_at', endTs)

  // AI skill estimate average for the month (tolerant of missing table).
  const { data: skillRows } = await supabase
    .from('aula_skill_scores')
    .select('speaking, listening, reading, writing, created_at')
    .eq('aluno_id', alunoId)
    .gte('created_at', startTs)
    .lt('created_at', endTs)
  const aiSkills = averageSkillScores((skillRows ?? []) as SkillScores[])

  // Manual monthly evaluation, if the professor filled one for this month.
  const { data: avaliacao } = await supabase
    .from('avaliacoes_habilidades')
    .select('speaking, listening, reading, writing, comentarios')
    .eq('aluno_id', alunoId)
    .gte('mes_referencia', startDate)
    .lt('mes_referencia', endDate)
    .maybeSingle()

  const hasSkillData = SKILL_KEYS.some((k) => aiSkills[k] !== null) || Boolean(avaliacao)
  const monthLabel = `${MONTHS_PT[month - 1]} de ${year}`

  return (
    <DocumentShell
      title="Relatório Mensal"
      subtitle="Documento pronto para impressão e salvamento em PDF."
      backHref={isProfessor ? `/professor/alunos/${alunoId}` : '/aluno'}
    >
      <div className="space-y-10 text-slate-900">
        <header className="document-header space-y-3 border-b border-slate-200 pb-8 text-center">
          <div className="flex justify-center">
            <Image src="/logo-cantoni.svg" alt="Cantoni English School" width={160} height={64} className="h-16 w-auto object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cantoni English School</p>
          <h2 className="text-3xl font-black tracking-tight">Relatório Mensal</h2>
        </header>

        {/* Month navigation (not printed) */}
        <div className="flex items-center justify-between print:hidden">
          <Link href={`?mes=${shiftMonth(mes, -1)}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← Mês anterior
          </Link>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{monthLabel}</span>
          <Link href={`?mes=${shiftMonth(mes, 1)}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Próximo mês →
          </Link>
        </div>

        <section className="document-section grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.25rem] bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aluno(a)</p>
            <p className="mt-2 text-base font-bold">{studentName}</p>
          </div>
          <div className="rounded-[1.25rem] bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Mês de referência</p>
            <p className="mt-2 text-base font-bold">{monthLabel}</p>
          </div>
        </section>

        <section className="document-section grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 text-center">
            <p className="text-3xl font-black text-blue-700">{attended}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">Aulas realizadas</p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 text-center">
            <p className="text-3xl font-black text-emerald-600">{vocabAdded ?? 0}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">Palavras novas</p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 text-center">
            <p className="text-3xl font-black text-indigo-600">{attendanceRate === null ? '—' : `${attendanceRate}%`}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">Presença</p>
          </div>
        </section>

        {cancelled > 0 && (
          <p className="document-section text-sm text-slate-500">
            {cancelled} aula{cancelled === 1 ? '' : 's'} cancelada{cancelled === 1 ? '' : 's'} no mês.
          </p>
        )}

        {hasSkillData && (
          <section className="document-section space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Habilidades</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILL_KEYS.map((key) => {
                const ai = aiSkills[key]
                const manual = avaliacao ? (avaliacao as Record<string, number | null>)[key] : null
                const value = manual ?? ai
                return (
                  <div key={key} className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>{SKILL_LABELS[key]}</span>
                      <span className="text-slate-400">
                        {value === null ? 'sem dados' : `${value}/10`}
                        {manual !== null && manual !== undefined ? ' (prof.)' : ai !== null ? ' (IA)' : ''}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: value === null ? '0%' : `${(value / 10) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {avaliacao?.comentarios ? (
              <p className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">{avaliacao.comentarios}</p>
            ) : null}
          </section>
        )}

        {totalCounted === 0 && (vocabAdded ?? 0) === 0 && !hasSkillData && (
          <section className="document-section rounded-[1.25rem] border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm font-medium text-slate-500">Sem atividade registrada neste mês.</p>
          </section>
        )}

        <footer className="document-section border-t border-slate-200 pt-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Cantoni English School · Relatório gerado automaticamente</p>
        </footer>
      </div>
    </DocumentShell>
  )
}
