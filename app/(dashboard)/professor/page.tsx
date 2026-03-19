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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[#1e3a5f] tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium italic">
          {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <Card className="glass-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50/50 rounded-xl"><BookOpen className="w-6 h-6 text-blue-900" /></div>
              <div>
                <p className="text-3xl font-bold text-blue-900">{aulasHoje?.length || 0}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Aulas hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-50/50 rounded-xl"><AlertCircle className="w-6 h-6 text-yellow-700" /></div>
              <div>
                <p className="text-3xl font-bold text-yellow-700">{pagamentosPendentes?.length || 0}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50/50 rounded-xl"><Users className="w-6 h-6 text-green-700" /></div>
              <div>
                <p className="text-3xl font-bold text-green-700">{totalAlunos || 0}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alunos ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50/50 rounded-xl"><Clock className="w-6 h-6 text-red-700" /></div>
              <div>
                <p className="text-3xl font-bold text-red-700">
                  {pagamentosPendentes?.filter((p: any) => p.status === 'atrasado').length || 0}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Em atraso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Aulas de hoje */}
        <Card className="glass-card border-none flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
              Aulas de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {aulasHoje && aulasHoje.length > 0 ? (
              <div className="divide-y divide-gray-100/50">
                {aulasHoje.map((aula: any) => (
                  <div key={aula.id} className="py-4 flex items-center justify-between group">
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-blue-900 transition-colors">
                        {(aula.contratos as any)?.profiles?.full_name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(aula.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — 45 min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {aula.meet_link && (
                        <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-widest bg-blue-900 text-white px-4 py-1.5 rounded-lg hover:bg-blue-800 transition-all font-bold">
                          Join Meet
                        </a>
                      )}
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0.5">{aula.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-12 text-gray-400">
                <BookOpen className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm font-medium">Nenhuma aula para hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alunos ativos */}
        <Card className="glass-card border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
              Alunos Recentes
            </CardTitle>
            <Link href="/professor/alunos" className="text-xs font-bold text-blue-900 hover:text-blue-700 underline underline-offset-4 decoration-blue-900/30">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100/50 text-gray-400">
                    <th className="text-left py-3 font-semibold text-[10px] uppercase tracking-wider">Aluno</th>
                    <th className="text-left py-3 font-semibold text-[10px] uppercase tracking-wider">Aulas</th>
                    <th className="text-left py-3 font-semibold text-[10px] uppercase tracking-wider">Status Financeiro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {alunosAtivos?.slice(0, 5).map((contrato: any) => {
                    const pagAtual = contrato.pagamentos?.find(
                      (p: any) => p.status === 'pendente' || p.status === 'atrasado'
                    )
                    return (
                      <tr key={contrato.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="py-4">
                          <p className="font-semibold text-gray-800">{contrato.profiles?.full_name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">{contrato.planos?.freq_semana}x/semana</p>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-blue-900">{contrato.aulas_restantes}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">restantes</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {pagAtual ? (
                            <Badge variant={pagAtual.status === 'atrasado' ? 'destructive' : 'warning'} className="text-[10px] uppercase font-bold">
                              {pagAtual.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px] uppercase font-bold">Em dia</Badge>
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
