import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Users, BookOpen, AlertCircle, Clock } from 'lucide-react'

export default async function ProfessorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  // Aulas de hoje
  const { data: aulasHoje } = await supabase
    .from('aulas')
    .select('*, contratos(profiles(full_name))')
    .gte('data_hora', todayStart)
    .lt('data_hora', todayEnd)
    .in('status', ['agendada', 'confirmada'])
    .order('data_hora')

  // Pagamentos pendentes/atrasados
  const { data: pagamentosPendentes } = await supabase
    .from('pagamentos')
    .select('*, contratos(profiles(full_name, email))')
    .in('status', ['pendente', 'atrasado'])
    .order('data_vencimento')

  // Total alunos ativos
  const { count: totalAlunos } = await supabase
    .from('contratos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo')

  // Alunos com remarcações perto do limite este mês
  const mesAtual = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const { data: remarcacoesMes } = await supabase
    .from('remarcacoes_mes')
    .select('*, profiles(full_name), aluno_id')
    .eq('mes', mesAtual)
    .gte('quantidade', 1)

  // Lista de alunos com contratos ativos
  const { data: alunosAtivos } = await supabase
    .from('contratos')
    .select('*, profiles(full_name, email), planos(freq_semana, remarca_max_mes), pagamentos(status, parcela_num, valor, data_vencimento)')
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })

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
              Painel de Controle
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="pt-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BookOpen className="w-16 h-16 text-blue-900" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-black text-blue-900 tracking-tighter">{aulasHoje?.length || 0}</p>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Aulas para Hoje</p>
            </div>
            <div className="mt-4 h-1 w-12 bg-blue-600 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="pt-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle className="w-16 h-16 text-amber-900" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-black text-amber-600 tracking-tighter">{pagamentosPendentes?.length || 0}</p>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Faturas Pendentes</p>
            </div>
            <div className="mt-4 h-1 w-12 bg-amber-500 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="pt-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-16 h-16 text-emerald-900" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-black text-emerald-600 tracking-tighter">{totalAlunos || 0}</p>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Alunos Ativos</p>
            </div>
            <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="pt-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="w-16 h-16 text-red-900" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-black text-red-600 tracking-tighter">
                {pagamentosPendentes?.filter((p: any) => p.status === 'atrasado').length || 0}
              </p>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Faturas Atrasadas</p>
            </div>
            <div className="mt-4 h-1 w-12 bg-red-500 rounded-full" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Aulas de hoje */}
        <Card className="glass-card border-none overflow-hidden flex flex-col">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Cronograma de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {aulasHoje && aulasHoje.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {aulasHoje.map((aula: any) => (
                  <div key={aula.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                        {new Date(aula.data_hora).getHours()}h
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-900">
                          {(aula.contratos as any)?.profiles?.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                          {new Date(aula.data_hora).toLocaleTimeString('pt-BR', { minute: '2-digit' })} — 45 MIN
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {aula.meet_link && (
                        <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl lms-gradient text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:translate-y-[-2px] transition-all">
                          Meeting
                        </a>
                      )}
                      <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase px-2 py-0.5">{aula.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                <BookOpen className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest">Tudo livre por hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alunos recentes */}
        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Gestão de Alunos
            </CardTitle>
            <Link href="/professor/alunos" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
              Ver Painel →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="text-left py-6 px-8 font-black text-[10px] uppercase tracking-widest">Aluno</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest text-center">Aulas</th>
                    <th className="text-right py-6 px-8 font-black text-[10px] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alunosAtivos?.slice(0, 5).map((contrato: any) => {
                    const pagAtual = contrato.pagamentos?.find(
                      (p: any) => p.status === 'pendente' || p.status === 'atrasado'
                    )
                    return (
                      <tr key={contrato.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                        <td className="py-6 px-8">
                          <p className="font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-900">
                            {contrato.profiles?.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest italic">
                            {contrato.profiles?.birth_date ? `Nasc: ${new Date(contrato.profiles.birth_date).toLocaleDateString('pt-BR')}` : 'Sem data nasc.'}
                          </p>
                        </td>
                        <td className="py-6 px-4 text-center">
                          <div className="inline-flex flex-col items-center bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100">
                            <span className="font-black text-blue-900 text-sm leading-none">{contrato.aulas_restantes}</span>
                            <span className="text-[9px] text-blue-400 font-black uppercase tracking-tight">lives</span>
                          </div>
                        </td>
                        <td className="py-6 px-8 text-right">
                          {pagAtual ? (
                            <Badge variant={pagAtual.status === 'atrasado' ? 'destructive' : 'warning'} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg">
                              {pagAtual.status}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-lg">Regular</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
