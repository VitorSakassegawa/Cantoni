import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import Link from 'next/link'
import AulaRow from '@/components/dashboard/AulaRow'
import GerarCobrancaBtn from '@/components/dashboard/GerarCobrancaBtn'

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const { data: aluno } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!aluno) notFound()

  const { data: contrato } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', id)
    .eq('status', 'ativo')
    .single()

  const { data: aulas } = await supabase
    .from('aulas')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('data_hora')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('parcela_num')

  const { data: remarcacoes } = await supabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', id)
    .order('mes', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/professor/alunos" className="text-gray-400 hover:text-gray-600 text-sm">← Alunos</Link>
        <h1 className="text-2xl font-bold text-blue-900">{aluno.full_name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info aluno */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Dados do Aluno</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-gray-500">E-mail:</span> {aluno.email}</div>
            {aluno.phone && <div><span className="text-gray-500">Telefone:</span> {aluno.phone}</div>}
            {aluno.nivel && <div><span className="text-gray-500">Nível:</span> {aluno.nivel}</div>}
            {aluno.tipo_aula && <div><span className="text-gray-500">Tipo:</span> {aluno.tipo_aula}</div>}
          </CardContent>
        </Card>

        {/* Contrato */}
        {contrato && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Contrato Ativo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-gray-500">Semestre:</span> {contrato.semestre} {contrato.ano}</div>
              <div><span className="text-gray-500">Plano:</span> {contrato.planos?.freq_semana}x/semana</div>
              <div><span className="text-gray-500">Período:</span> {formatDate(contrato.data_inicio)} a {formatDate(contrato.data_fim)}</div>
              <div><span className="text-gray-500">Aulas:</span> {contrato.aulas_dadas} dadas / {contrato.aulas_restantes} restantes de {contrato.aulas_totais}</div>
              {contrato.nivel_atual && <div><span className="text-gray-500">Nível atual:</span> {contrato.nivel_atual}</div>}
              {contrato.livro_atual && <div><span className="text-gray-500">Livro:</span> {contrato.livro_atual}</div>}

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-900 rounded-full"
                    style={{ width: `${(contrato.aulas_dadas / contrato.aulas_totais) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {Math.round((contrato.aulas_dadas / contrato.aulas_totais) * 100)}% concluído
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remarcações */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Remarcações (meses recentes)</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {remarcacoes?.length ? (
              <div className="space-y-1">
                {remarcacoes.map((r: any) => (
                  <div key={r.id} className="flex justify-between">
                    <span className="text-gray-500">{new Date(r.mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <span className={r.quantidade >= (contrato?.planos?.remarca_max_mes || 1) ? 'text-red-600 font-medium' : ''}>
                      {r.quantidade}/{contrato?.planos?.remarca_max_mes || 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Nenhuma remarcação este semestre.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pagamentos */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pagamentos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Parcela</th>
                  <th className="text-left py-2 font-medium">Valor</th>
                  <th className="text-left py-2 font-medium">Vencimento</th>
                  <th className="text-left py-2 font-medium">Pagamento</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagamentos?.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.parcela_num}/6</td>
                    <td className="py-2">{formatCurrency(p.valor)}</td>
                    <td className="py-2">{formatDate(p.data_vencimento)}</td>
                    <td className="py-2">{p.data_pagamento ? formatDate(p.data_pagamento) : '—'}</td>
                    <td className="py-2">
                      <Badge variant={
                        p.status === 'pago' ? 'success' :
                        p.status === 'atrasado' ? 'destructive' :
                        p.status === 'pendente' ? 'warning' : 'outline'
                      }>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {p.status !== 'pago' && !p.infinitepay_invoice_id && (
                        <GerarCobrancaBtn pagamentoId={p.id} />
                      )}
                      {p.pix_copia_cola && (
                        <span className="text-xs text-green-600">PIX gerado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Aulas */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Aulas do Semestre</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">#</th>
                  <th className="text-left py-2 font-medium">Data/Hora</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Meet</th>
                  <th className="text-left py-2 font-medium">Lição</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aulas?.map((aula: any, i: number) => (
                  <AulaRow key={aula.id} aula={aula} index={i + 1} isProfessor />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
