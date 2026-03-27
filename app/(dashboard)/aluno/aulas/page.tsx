import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, BookOpen, Layers } from 'lucide-react'
import Link from 'next/link'
import AulasTimeline from '@/components/dashboard/AulasTimeline'
import { getStudentRemarkBlockReason } from '@/lib/insights'

export default async function AlunoAulasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contratos } = await supabase
    .from('contratos')
    .select(
      'id, status, aulas_dadas, aulas_totais, aulas_restantes, data_inicio, data_fim, planos(remarca_max_mes, descricao)'
    )
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')

  const contratosList = (contratos as any[]) || []
  const contratosAtivos = contratosList.filter((contrato) => contrato.status === 'ativo')
  const contratoAtual = contratosAtivos[0] || contratosList[0] || null
  const contratoIds = contratosList.map((contrato) => contrato.id)
  const remarcacaoLimitByContratoId = contratosList.reduce((acc: Record<number, number | null>, contrato: any) => {
    acc[contrato.id] = contrato?.planos?.remarca_max_mes ?? null
    return acc
  }, {})

  const progressPct = contratoAtual
    ? Math.round(((contratoAtual.aulas_dadas || 0) / Math.max(1, contratoAtual.aulas_totais || 1)) * 100)
    : 0

  const { data: remarcacoesMes } = await supabase
    .from('remarcacoes_mes')
    .select('mes, quantidade')
    .eq('aluno_id', user.id)
    .order('mes', { ascending: false })

  const { data: aulas } = await supabase
    .from('aulas')
    .select('*')
    .in('contrato_id', contratoIds)
    .order('data_hora', { ascending: false })

  const aulasComRegras = (aulas || []).map((lesson: any) => ({
    ...lesson,
    remarkBlockReason: getStudentRemarkBlockReason({
      status: lesson.status,
      hasRequestedDate: Boolean(lesson.data_hora_solicitada),
      monthlyRescheduleCount:
        remarcacoesMes?.find((entry: any) => {
          const lessonDate = new Date(lesson.data_hora)
          const lessonMonth = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), 1)
            .toISOString()
            .split('T')[0]
          return entry.mes === lessonMonth
        })?.quantidade || 0,
      monthlyRescheduleLimit: remarcacaoLimitByContratoId[lesson.contrato_id] ?? null,
    }),
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-fade-in pb-20">
      <Link
        href="/aluno"
        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Minhas Aulas</h1>
        <p className="font-medium text-slate-500">Histórico completo de lições, frequências e materiais.</p>
      </div>

      <div className="space-y-8">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Layers className="h-4 w-4 text-blue-500" /> Progresso do contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {contratoAtual ? (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {contratoAtual?.planos?.descricao || 'Plano atual'}
                  </p>
                  <p className="text-3xl font-black tracking-tighter text-slate-900">
                    {contratoAtual.aulas_dadas || 0}
                    <span className="ml-1 text-sm font-bold uppercase tracking-widest text-slate-400">
                      / {contratoAtual.aulas_totais || 0}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    {contratoAtual.aulas_restantes || 0} aula(s) restante(s) no contrato atual.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Concluído</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Período</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {new Date(contratoAtual.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                      {new Date(contratoAtual.data_fim).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarcações</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      Até {contratoAtual?.planos?.remarca_max_mes ?? 0} por mês no plano atual
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-medium text-slate-500">
                Nenhum contrato encontrado para exibir progresso.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-none">
          <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 p-8">
            <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <BookOpen className="h-4 w-4" />
              </div>
              Timeline de Aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AulasTimeline aulas={aulasComRegras || []} isProfessor={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
