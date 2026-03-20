import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatCurrency, formatDateTime, formatDateOnly } from '@/lib/utils'
import { Users, BookOpen, AlertCircle, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, DollarSign } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RotateCcw } from 'lucide-react'


interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProfessorDashboard({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  // Week navigation logic
  const weekParam = typeof resolvedParams.week === 'string' ? resolvedParams.week : null
  const selectedDate = weekParam ? parseISO(weekParam) : new Date()
  
  // Start of week (Monday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  const weekStartISO = weekStart.toISOString()
  const weekEndISO = weekEnd.toISOString()

  // Navigation URLs
  const prevWeek = format(subWeeks(weekStart, 1), 'yyyy-MM-dd')
  const nextWeek = format(addWeeks(weekStart, 1), 'yyyy-MM-dd')

  // Fetch classes for the whole week - only for active contracts
  const { data: aulasSemana } = await supabase
    .from('aulas')
    .select('*, contratos!inner(status, profiles(full_name))')
    .eq('contratos.status', 'ativo')
    .gte('data_hora', weekStartISO)
    .lte('data_hora', weekEndISO)
    .order('data_hora')


  // Group classes by day (Monday to Sunday)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    return day
  })

  const aulasPorDia = daysOfWeek.map(day => ({
    day,
    aulas: aulasSemana?.filter((aula: any) => isSameDay(new Date(aula.data_hora), day)) || []
  }))

  // Rest of the data
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
  const { data: aulasHoje } = await supabase
    .from('aulas')
    .select('id, contratos!inner(status)')
    .eq('contratos.status', 'ativo')
    .gte('data_hora', todayStart)
    .lt('data_hora', todayEnd)
    .in('status', ['agendada', 'confirmada'])


  // Fetch all relevant payments (Paid, Pending, Overdue)
  const { data: allPayments } = await supabase
    .from('pagamentos')
    .select('*, contratos(profiles(full_name, email))')
    .in('status', ['pago', 'pendente', 'atrasado'])
    .order('data_vencimento', { ascending: false })

  const pagamentosPagos = allPayments?.filter((p: any) => p.status === 'pago') || []
  const pagamentosPendentes = allPayments?.filter((p: any) => p.status === 'pendente') || []
  const pagamentosAtrasados = allPayments?.filter((p: any) => p.status === 'atrasado') || []

  // Calculate monthly total (collected)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const totalArrecadadoMes = pagamentosPagos
    .filter((p: any) => p.data_pagamento && p.data_pagamento >= startOfMonth)
    .reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0)

  const { count: totalAlunos } = await supabase
    .from('contratos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo')

  const { data: alunosAtivos } = await supabase
    .from('contratos')
    .select('*, profiles(full_name, email, birth_date, nivel), planos(freq_semana, remarca_max_mes), pagamentos(status, parcela_num, valor, data_vencimento)')
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })

  const { data: solicitacoesRemarcacao } = await supabase
    .from('aulas')
    .select('*, contratos!inner(profiles(full_name))')
    .eq('status', 'pendente_remarcacao')
    .order('data_hora_solicitada')


  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-10 bg-[#1e3a8a] text-white shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Gabriel Cantoni LMS
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Bom dia, Gabriel! 🍎
            </h1>
            <p className="text-blue-100/70 font-bold text-sm tracking-wide uppercase">
              {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link 
              href="/professor/alunos/novo"
              className="px-6 py-3 rounded-2xl bg-white text-blue-900 font-bold text-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Novo Aluno
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card border-none overflow-hidden group p-8 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen className="w-16 h-16 text-blue-900" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-blue-900 tracking-tighter">{aulasHoje?.length || 0}</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Aulas para Hoje</p>
          </div>
          <div className="mt-4 h-1 w-12 bg-blue-600 rounded-full" />
        </div>

        <Link href="/professor/alunos?status=ativo" className="glass-card border-none overflow-hidden group p-8 relative hover:ring-2 hover:ring-emerald-200 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-16 h-16 text-emerald-900" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-emerald-600 tracking-tighter">{totalAlunos || 0}</p>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Alunos Ativos</p>
          </div>
          <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full" />
        </Link>

        {/* Financial KPIs */}
        <Link href="/professor/pagamentos?status=pago" className="glass-card border-none overflow-hidden group p-8 relative hover:ring-2 hover:ring-blue-200 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-blue-900" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-blue-600 tracking-tighter">{pagamentosPagos.length}</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Faturas Pagas</p>
          </div>
          <div className="mt-4 h-1 w-12 bg-blue-500 rounded-full" />
        </Link>

        <Link href="/professor/pagamentos?status=pendente" className="glass-card border-none overflow-hidden group p-8 relative hover:ring-2 hover:ring-amber-200 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-16 h-16 text-amber-900" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-amber-600 tracking-tighter">{pagamentosPendentes.length}</p>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Faturas Pendentes</p>
          </div>
          <div className="mt-4 h-1 w-12 bg-amber-500 rounded-full" />
        </Link>

        <Link href="/professor/pagamentos?status=atrasado" className="glass-card border-none overflow-hidden group p-8 relative hover:ring-2 hover:ring-red-200 transition-all cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-16 h-16 text-red-900" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-red-600 tracking-tighter">{pagamentosAtrasados.length}</p>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Faturas Atrasadas</p>
          </div>
          <div className="mt-4 h-1 w-12 bg-red-500 rounded-full" />
        </Link>
      </div>

      {/* Financial Pulse Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Fluxo Recente</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Últimas transações e atualizações</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Arrecadado este mês</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalArrecadadoMes)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {allPayments?.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-white transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    p.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 
                    p.status === 'atrasado' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                      {(p.contratos as any)?.profiles?.full_name}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      {p.status === 'pago' ? `Pago em ${formatDateOnly(p.data_pagamento)}` : `Vence em ${formatDateOnly(p.data_vencimento)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">{formatCurrency(p.valor)}</p>
                  <Badge variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'destructive' : 'warning'} className="text-[7px] px-1.5 py-0">
                    {p.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
            {(!allPayments || allPayments.length === 0) && (
              <div className="text-center py-10 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                Nenhuma transação registrada
              </div>
            )}
          </div>
          
          <Link href="/professor/pagamentos" className="block text-center py-3 rounded-xl border border-dashed border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">
            Ver Relatório Financeiro Completo
          </Link>
        </div>

        <div className="glass-card p-8 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CheckCircle2 className="w-32 h-32" />
          </div>
          <div className="space-y-6 relative z-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Status de Recebíveis</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pendentes</span>
                <span className="text-2xl font-black text-white">{formatCurrency(pagamentosPendentes.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0))}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Em Atraso</span>
                <span className="text-2xl font-black text-rose-500">{formatCurrency(pagamentosAtrasados.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0))}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Pago</span>
                <span className="text-3xl font-black text-emerald-500">{formatCurrency(pagamentosPagos.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0))}</span>
              </div>
            </div>
          </div>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-10 pointer-events-none">Atualizado via Mercado Pago Real-time</p>
        </div>
      </div>


      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Cronograma Semanal */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between bg-white/50 p-4 rounded-[2rem] border border-white/40 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest leading-none">Minha Semana</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {format(weekStart, 'dd/MM', { locale: ptBR })} — {format(weekEnd, 'dd/MM', { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/professor?week=${prevWeek}`} className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100">
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <Link href="/professor" className="px-5 py-2 rounded-xl bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                Hoje
              </Link>
              <Link href={`/professor?week=${nextWeek}`} className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {aulasPorDia.map(({ day, aulas }) => {
              const isActive = isToday(day)
              return (
                <div key={day.toISOString()} className={`flex flex-col gap-3 p-4 rounded-3xl transition-all duration-300 ${isActive ? 'bg-blue-50/50 ring-2 ring-blue-100' : 'bg-slate-50/30 hover:bg-white/50 border border-slate-100'}`}>
                  <div className="text-center pb-2 border-b border-slate-100">
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                      {format(day, 'eee', { locale: ptBR })}
                    </p>
                    <p className={`text-xl font-black mt-1 ${isActive ? 'text-blue-900' : 'text-slate-600'}`}>
                      {format(day, 'dd')}
                    </p>
                  </div>

                  <div className="flex-1 space-y-3 min-h-[100px]">
                    {aulas.length > 0 ? (
                      aulas.map((aula: any) => {
                        const isDada = aula.status === 'dada'
                        return (
                          <div key={aula.id} className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${isDada ? 'bg-slate-100/50 border-slate-100 opacity-60' : 'bg-white border-blue-50 shadow-sm hover:shadow-md hover:border-blue-100'}`}>
                            {isDada && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              </div>
                            )}
                            <p className={`text-[10px] font-black leading-tight ${isDada ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-blue-900'}`}>
                              {(aula.contratos as any)?.profiles?.full_name?.split(' ')[0]}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">
                              {format(new Date(aula.data_hora), 'HH:mm')}
                            </p>
                            {!isDada && aula.meet_link && (
                              <a href={aula.meet_link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                Meet
                              </a>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                        Livre
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar Rights: Alunos Recentes & Solicitações */}
        <div className="xl:col-span-4 space-y-6">
          {solicitacoesRemarcacao && solicitacoesRemarcacao.length > 0 && (
            <Card className="glass-card border-none overflow-hidden bg-amber-50/30 border-amber-100 ring-2 ring-amber-500/10">
              <CardHeader className="pb-4 bg-amber-50/50 border-b border-amber-100/50">
                <CardTitle className="text-xs font-black text-amber-600 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <RotateCcw className="w-4 h-4" /> Solicitações de Remarcação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-amber-100/50">
                  {solicitacoesRemarcacao.map((sol: any) => (
                    <div key={sol.id} className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                          {sol.contratos?.profiles?.full_name}
                        </p>
                        <Badge variant="warning" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Solicitado</Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">De:</span> {formatDateTime(sol.data_hora)}
                        </div>
                        <div className="flex items-center gap-2 text-amber-700">
                          <span className="text-amber-500">Para:</span> {formatDateTime(sol.data_hora_solicitada)}
                        </div>
                      </div>
                      <Link href={`/professor/alunos/${sol.contrato_id}`} className="block w-full text-center py-2.5 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all">
                        Analisar Pedido
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card border-none overflow-hidden">

            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                Meus Alunos
              </CardTitle>
              <Link href="/professor/alunos" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                Ver Todos
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {alunosAtivos?.slice(0, 8).map((contrato: any) => (
                  <Link key={contrato.id} href={`/professor/alunos/${contrato.aluno_id}`} className="p-5 flex items-center justify-between group hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        {contrato.profiles?.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-900 truncate">
                          {contrato.profiles?.full_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge className="bg-blue-50/50 text-blue-600 border-none text-[8px] font-black uppercase px-1.5 py-0">
                            {contrato.profiles?.nivel || 'N/D'}
                          </Badge>
                          <span className="text-[9px] font-bold text-slate-400">{contrato.aulas_restantes} aulas</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-all transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
