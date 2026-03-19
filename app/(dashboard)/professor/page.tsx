import { createClient } from '@/lib/supabase/server'
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
        <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="w-5 h-5 text-blue-900" /></div>
              <div>
                <p className="text-2xl font-bold">{aulasHoje?.length || 0}</p>
                <p className="text-sm text-gray-500">Aulas hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg"><AlertCircle className="w-5 h-5 text-yellow-700" /></div>
              <div>
                <p className="text-2xl font-bold">{pagamentosPendentes?.length || 0}</p>
                <p className="text-sm text-gray-500">Pagamentos pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg"><Users className="w-5 h-5 text-green-700" /></div>
              <div>
                <p className="text-2xl font-bold">{totalAlunos || 0}</p>
                <p className="text-sm text-gray-500">Alunos ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg"><Clock className="w-5 h-5 text-red-700" /></div>
              <div>
                <p className="text-2xl font-bold">
                  {pagamentosPendentes?.filter(p => p.status === 'atrasado').length || 0}
                </p>
                <p className="text-sm text-gray-500">Em atraso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aulas de hoje */}
      {aulasHoje && aulasHoje.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aulas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {aulasHoje.map((aula: any) => (
                <div key={aula.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{(aula.contratos as any)?.profiles?.full_name}</p>
                    <p className="text-sm text-gray-500">{new Date(aula.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — 45 min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aula.meet_link && (
                      <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-blue-900 text-white px-3 py-1 rounded-full hover:bg-blue-800">
                        Meet
                      </a>
                    )}
                    <Badge variant="secondary">{aula.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alunos ativos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Alunos Ativos</CardTitle>
          <Link href="/professor/alunos" className="text-sm text-blue-900 hover:underline">Ver todos</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Aluno</th>
                  <th className="text-left py-2 font-medium">Plano</th>
                  <th className="text-left py-2 font-medium">Aulas restantes</th>
                  <th className="text-left py-2 font-medium">Pagamento atual</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alunosAtivos?.map((contrato: any) => {
                  const pagAtual = contrato.pagamentos?.find(
                    (p: any) => p.status === 'pendente' || p.status === 'atrasado'
                  )
                  return (
                    <tr key={contrato.id}>
                      <td className="py-3 font-medium">{contrato.profiles?.full_name}</td>
                      <td className="py-3 text-gray-600">{contrato.planos?.freq_semana}x/semana</td>
                      <td className="py-3">{contrato.aulas_restantes}/{contrato.aulas_totais}</td>
                      <td className="py-3">
                        {pagAtual ? (
                          <Badge variant={pagAtual.status === 'atrasado' ? 'destructive' : 'warning'}>
                            {pagAtual.status === 'atrasado' ? 'Atrasado' : 'Pendente'} — {formatCurrency(pagAtual.valor)}
                          </Badge>
                        ) : (
                          <Badge variant="success">Em dia</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <Link href={`/professor/alunos/${contrato.aluno_id}`}
                          className="text-blue-900 hover:underline text-xs">
                          Ver detalhes
                        </Link>
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
  )
}
