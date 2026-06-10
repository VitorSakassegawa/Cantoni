import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Clock } from 'lucide-react'
import { formatDateOnly } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type AtribuicaoListRow = {
  id: string
  status: 'pendente' | 'entregue' | 'corrigida'
  due_date: string | null
  nota: number | null
  acertos: number | null
  total_objetivas: number | null
  assigned_at: string
  atividades: { titulo: string; nivel: string | null } | null
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendente: { label: 'Para fazer', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  entregue: { label: 'Aguardando correção', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  corrigida: { label: 'Corrigida', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

export default async function AlunoAtividadesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Service-role read, strictly scoped to this student: the `atividades` table
  // is professor-only under RLS (it holds answer keys), so an RLS-bound join
  // would return null and hide every assignment. We only select safe columns
  // (titulo/nivel) — never `questoes`.
  const serviceSupabase = await createServiceClient()
  const { data } = await serviceSupabase
    .from('atividade_atribuicoes')
    .select('id, status, due_date, nota, acertos, total_objetivas, assigned_at, atividades(titulo, nivel)')
    .eq('aluno_id', user.id)
    .order('assigned_at', { ascending: false })

  const atribuicoes = ((data as unknown as AtribuicaoListRow[]) || []).filter((a) => a.atividades)
  const pendentes = atribuicoes.filter((a) => a.status === 'pendente')

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-8 pb-16">
      <Link
        href="/aluno"
        className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Voltar para dashboard
      </Link>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-2xl shadow-indigo-900/20">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-100">
            <ClipboardList className="h-3.5 w-3.5" /> Atividades
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Seus exercícios</h1>
          <p className="text-sm font-medium text-indigo-100/80">
            {pendentes.length > 0
              ? `Você tem ${pendentes.length} atividade(s) esperando por você.`
              : 'Tudo em dia! Novas atividades aparecem aqui quando o professor atribuir.'}
          </p>
        </div>
      </div>

      {atribuicoes.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <p className="text-lg font-black tracking-tight text-slate-900">Nenhuma atividade ainda</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Quando o professor atribuir um exercício, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {atribuicoes.map((atr) => {
            const meta = STATUS_META[atr.status] || STATUS_META.pendente
            return (
              <Link
                key={atr.id}
                href={`/aluno/atividades/${atr.id}`}
                className="group flex items-center justify-between gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-base font-black tracking-tight text-slate-900">
                    {atr.atividades?.titulo}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`border text-[11px] font-black uppercase tracking-widest ${meta.cls}`}>
                      {meta.label}
                    </Badge>
                    {atr.atividades?.nivel ? (
                      <Badge variant="outline" className="text-[11px] font-bold text-slate-500">
                        {atr.atividades.nivel}
                      </Badge>
                    ) : null}
                    {atr.due_date && atr.status === 'pendente' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                        <Clock className="h-3 w-3" /> até {formatDateOnly(atr.due_date)}
                      </span>
                    ) : null}
                    {atr.status !== 'pendente' && atr.total_objetivas ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> {atr.acertos}/{atr.total_objetivas}
                        {atr.nota !== null ? ` • nota ${Number(atr.nota).toFixed(1)}` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
