import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SkillsRadar from '@/components/dashboard/SkillsRadar'
import { evaluatePlacementEligibility } from '@/lib/placement-eligibility'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'

type PlacementAnswerEntry = {
  question?: string
  options?: string[]
  selected?: number
  correct?: boolean
  correctAnswer?: number
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const dynamic = 'force-dynamic'

export default async function AlunoNivelamentoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, cefr_level, placement_test_completed, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professor') redirect('/professor/nivelamento')

  const [{ data: history }, { data: avaliacoes }, { data: contracts }] = await Promise.all([
    supabase
      .from('placement_results')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('avaliacoes_habilidades')
      .select('*')
      .eq('aluno_id', user.id)
      .order('mes_referencia', { ascending: false })
      .limit(6),
    supabase.from('contratos').select('status, data_inicio, data_fim').eq('aluno_id', user.id).neq('status', 'cancelado'),
  ])

  const latestResult = history?.[0] || null
  const currentCefrIdx = CEFR_LEVELS.indexOf(profile?.cefr_level || 'A1')
  const eligibility = evaluatePlacementEligibility({
    placementTestCompleted: profile?.placement_test_completed,
    latestResultAt: latestResult?.created_at || null,
    contracts: (contracts || []) as Array<{ status?: string | null; data_inicio?: string | null; data_fim?: string | null }>,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-fade-in pb-16">
      <Link
        href="/aluno"
        className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Voltar para dashboard
      </Link>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-10 text-white shadow-2xl shadow-indigo-900/20">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-100">
              <BrainCircuit className="h-3.5 w-3.5" />
              Nivelamento
            </div>
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl">Seu mapeamento de inglês</h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-indigo-100/80">
              Aqui você acompanha o último teste realizado, seu nível CEFR atual e o detalhamento das respostas.
            </p>
          </div>

          {eligibility.allowed ? (
            <Link
              href="/aluno/teste-nivel"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-700 shadow-lg shadow-indigo-900/10 transition-all hover:scale-105"
            >
              {profile?.placement_test_completed ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Refazer teste
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Iniciar teste
                </>
              )}
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80">
              Aguardando liberação
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Trophy className="h-4 w-4 text-indigo-500" /> Resumo atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Nível CEFR</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{profile?.cefr_level || 'A1'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Último teste</p>
                <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
                  {latestResult
                    ? new Date(latestResult.created_at).toLocaleDateString('pt-BR')
                    : 'Ainda não realizado'}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linha de progressão CEFR</p>
              <div className="mt-5 flex items-center justify-between gap-2">
                {CEFR_LEVELS.map((level, idx) => {
                  const isCompleted = idx < currentCefrIdx
                  const isCurrent = idx === currentCefrIdx
                  return (
                    <div key={level} className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-[10px] font-black transition-all ${
                          isCompleted
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                            : isCurrent
                              ? 'scale-110 border-2 border-indigo-600 bg-white text-indigo-600 shadow-xl'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {level}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status do teste</p>
                  <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
                    {profile?.placement_test_completed ? 'Teste concluído' : 'Teste pendente'}
                  </p>
                </div>
                <Badge variant={profile?.placement_test_completed ? 'success' : 'warning'} className="text-[9px] font-black uppercase tracking-widest">
                  {profile?.placement_test_completed ? 'Concluído' : 'Pendente'}
                </Badge>
              </div>
            </div>

            <div className={`rounded-3xl border px-5 py-5 ${eligibility.allowed ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Janela de novo teste</p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{eligibility.title}</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{eligibility.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <BookOpen className="h-4 w-4 text-blue-500" /> Mapeamento de skills
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <SkillsRadar data={avaliacoes || []} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            <Calendar className="h-4 w-4 text-blue-500" /> Histórico de testes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              'Primeiro nivelamento direto no portal.',
              'Início de um novo contrato.',
              'Fechamento de semestre ou encerramento do contrato.',
              'Refação ad hoc somente com liberação do professor.',
            ].map((rule) => (
              <div key={rule} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-medium leading-relaxed text-slate-600">
                {rule}
              </div>
            ))}
          </div>

          {!history || history.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-lg font-black tracking-tight text-slate-900">Nenhum teste realizado ainda</p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Assim que você concluir seu primeiro nivelamento, o histórico aparecerá aqui.
              </p>
              {eligibility.allowed ? (
                <Link
                  href="/aluno/teste-nivel"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                >
                  Iniciar teste
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Aguardando liberação
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {history.map((test: any) => (
                <div key={test.id} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                        {new Date(test.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-2xl font-black tracking-tight text-slate-900">CEFR {test.cefr_level}</p>
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">
                          {test.score}/{test.total_questions} pontos
                        </Badge>
                      </div>
                    </div>

                    {eligibility.allowed ? (
                      <Link
                        href="/aluno/teste-nivel"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                      >
                        Refazer teste
                        <RotateCcw className="h-4 w-4" />
                      </Link>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Aguardando liberação
                      </div>
                    )}
                  </div>

                  {test.answers && test.answers.length > 0 && test.answers[0].question ? (
                    <div className="mt-6 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Detalhamento das respostas
                      </p>
                      <div className="grid gap-3">
                        {(test.answers as PlacementAnswerEntry[]).map((answer, index) => (
                          <div
                            key={`${test.id}-${index}`}
                            className={`rounded-3xl border px-5 py-5 ${
                              answer.correct ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                                  answer.correct ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              >
                                {answer.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                              </div>
                              <div className="space-y-3">
                                <p className="text-sm font-bold leading-relaxed text-slate-900">
                                  {index + 1}. {answer.question || 'Questão sem texto disponível'}
                                </p>
                                <div className="space-y-1 rounded-2xl bg-white/70 p-4">
                                  <p className={`text-xs font-semibold ${answer.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    <span className="mr-2 text-[9px] font-black uppercase tracking-widest opacity-70">Sua resposta:</span>
                                    {typeof answer.selected === 'number' && answer.options
                                      ? answer.options[answer.selected]
                                      : 'Resposta não identificada'}
                                  </p>
                                  {!answer.correct && typeof answer.correctAnswer === 'number' && answer.options ? (
                                    <p className="text-xs font-semibold text-emerald-700">
                                      <span className="mr-2 text-[9px] font-black uppercase tracking-widest opacity-70">Correta:</span>
                                      {answer.options[answer.correctAnswer]}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
