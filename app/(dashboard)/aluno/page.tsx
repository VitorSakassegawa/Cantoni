import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import AulaRow from '@/components/dashboard/AulaRow'
import CopiarPixBtn from '@/components/dashboard/CopiarPixBtn'
import { Video, BookOpen } from 'lucide-react'

export default async function AlunoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professor') redirect('/professor')

  const { data: contrato } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', user.id)
    .eq('status', 'ativo')
    .single()

  const now = new Date().toISOString()

  const { data: proximaAula } = await supabase
    .from('aulas')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', now)
    .order('data_hora')
    .limit(1)
    .maybeSingle()

  const { data: pagamentoPendente } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .in('status', ['pendente', 'atrasado'])
    .order('parcela_num')
    .limit(1)
    .maybeSingle()

  const { data: ultimasAulas } = await supabase
    .from('aulas')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('data_hora', { ascending: false })
    .limit(5)

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('parcela_num')

  const progressPct = contrato
    ? Math.round((contrato.aulas_dadas / contrato.aulas_totais) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Olá, {profile?.full_name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mt-1">Bem-vindo ao seu painel de aulas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próxima aula */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Próxima Aula
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximaAula ? (
              <div className="space-y-3">
                <p className="text-xl font-bold text-blue-900">{formatDateTime(proximaAula.data_hora)}</p>
                {proximaAula.meet_link && (
                  <a
                    href={proximaAula.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Entrar no Google Meet
                  </a>
                )}
                {proximaAula.homework && !proximaAula.homework_completed && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                    <span className="font-medium text-yellow-800">Lição pendente:</span>
                    <p className="text-yellow-700 mt-1">{proximaAula.homework}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  ⚠️ Cancelamentos precisam de <strong>2 horas de antecedência</strong>
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma aula agendada.</p>
            )}
          </CardContent>
        </Card>

        {/* Pagamento atual */}
        <Card className={pagamentoPendente?.status === 'atrasado' ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader>
            <CardTitle className="text-sm">Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentoPendente ? (
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(pagamentoPendente.valor)}</p>
                  <p className="text-sm text-gray-500">
                    Parcela {pagamentoPendente.parcela_num}/6 • Vence em {formatDate(pagamentoPendente.data_vencimento)}
                  </p>
                  <Badge className="mt-1" variant={pagamentoPendente.status === 'atrasado' ? 'destructive' : 'warning'}>
                    {pagamentoPendente.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                  </Badge>
                </div>

                {pagamentoPendente.pix_qrcode_base64 && (
                  <div className="flex flex-col items-start gap-3">
                    <img
                      src={pagamentoPendente.pix_qrcode_base64}
                      alt="QR Code PIX"
                      className="w-40 h-40 border rounded"
                    />
                    {pagamentoPendente.pix_copia_cola && (
                      <CopiarPixBtn codigo={pagamentoPendente.pix_copia_cola} />
                    )}
                  </div>
                )}

                {!pagamentoPendente.pix_qrcode_base64 && (
                  <p className="text-xs text-gray-500">QR Code PIX será enviado por e-mail em breve.</p>
                )}
              </div>
            ) : (
              <div>
                <Badge variant="success">Pagamento em dia</Badge>
                <p className="text-sm text-gray-500 mt-2">Nenhuma parcela pendente.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progresso do semestre */}
      {contrato && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso do Semestre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{contrato.aulas_dadas} aulas realizadas</span>
              <span className="text-gray-600">{contrato.aulas_restantes} restantes de {contrato.aulas_totais}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-900 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatDate(contrato.data_inicio)}</span>
              <span className="font-medium text-blue-900">{progressPct}% concluído</span>
              <span>{formatDate(contrato.data_fim)}</span>
            </div>
            {contrato.livro_atual && (
              <p className="text-sm text-gray-600">Livro: <strong>{contrato.livro_atual}</strong></p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de aulas recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de Aulas</CardTitle>
        </CardHeader>
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
                {ultimasAulas?.map((aula: any, i: number) => (
                  <AulaRow key={aula.id} aula={aula} index={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Parcela</th>
                  <th className="text-left py-2 font-medium">Valor</th>
                  <th className="text-left py-2 font-medium">Vencimento</th>
                  <th className="text-left py-2 font-medium">Pago em</th>
                  <th className="text-left py-2 font-medium">Status</th>
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
                        'warning'
                      }>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
