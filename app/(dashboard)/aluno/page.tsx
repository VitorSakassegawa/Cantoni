import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
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
    <div className="space-y-8 pb-10">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-extrabold text-[#1e3a5f] tracking-tight">
          Olá, {profile?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-medium italic">Bem-vindo ao seu portal de estudos exclusivo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in [animation-delay:200ms]">
        {/* Próxima aula */}
        <Card className="glass-card border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-16 h-16 text-blue-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-4 bg-blue-900 rounded-full" />
              Próxima Aula
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximaAula ? (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-black text-blue-900 tracking-tight">{formatDateTime(proximaAula.data_hora)}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Duração: 45 minutos</p>
                </div>
                
                {proximaAula.meet_link && (
                  <a
                    href={proximaAula.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[0px]"
                  >
                    <Video className="w-4 h-4" />
                    Entrar no Google Meet
                  </a>
                )}
                
                {proximaAula.homework && !proximaAula.homework_completed && (
                  <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4">
                    <span className="text-[10px] font-black text-yellow-800 uppercase tracking-tighter">Lição de casa disponível</span>
                    <p className="text-sm text-yellow-700 mt-1 font-medium leading-relaxed">{proximaAula.homework}</p>
                  </div>
                )}
                <div className="pt-2 flex items-center gap-2 text-[10px] text-red-500 font-bold uppercase">
                  <span>⚠️</span>
                  <span>Cancelamentos: mínimo 2h de antecedência</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-400">Nenhuma aula agendada no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagamento atual */}
        <Card className={`glass-card border-none overflow-hidden relative group ${pagamentoPendente?.status === 'atrasado' ? 'bg-red-50/30' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-4 bg-blue-900 rounded-full" />
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentoPendente ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(pagamentoPendente.valor)}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                      Parcela {pagamentoPendente.parcela_num} de 6 • Vencimento: {formatDate(pagamentoPendente.data_vencimento)}
                    </p>
                  </div>
                  <Badge variant={pagamentoPendente.status === 'atrasado' ? 'destructive' : 'warning'} className="text-[10px] font-black uppercase px-2 py-0.5">
                    {pagamentoPendente.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                  </Badge>
                </div>

                {pagamentoPendente.pix_qrcode_base64 && (
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/50 p-4 rounded-2xl border border-white/50 shadow-sm">
                    <img
                      src={pagamentoPendente.pix_qrcode_base64}
                      alt="QR Code PIX"
                      className="w-32 h-32 border-2 border-white rounded-xl shadow-sm bg-white"
                    />
                    <div className="flex-1 space-y-3 w-full">
                      <p className="text-[10px] font-black text-gray-400 uppercase text-center sm:text-left">Pagamento via PIX</p>
                      {pagamentoPendente.pix_copia_cola && (
                        <CopiarPixBtn codigo={pagamentoPendente.pix_copia_cola} />
                      )}
                    </div>
                  </div>
                )}

                {!pagamentoPendente.pix_qrcode_base64 && (
                  <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <p className="text-xs font-medium text-blue-700">O código PIX será enviado para seu e-mail em breve.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center bg-green-50/30 rounded-xl border border-dashed border-green-200">
                <Badge variant="success" className="mb-2 text-[10px] font-black px-3">Tudo em dia!</Badge>
                <p className="text-sm font-medium text-green-700">Nenhuma pendência financeira.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progresso do semestre */}
      {contrato && (
        <Card className="glass-card border-none animate-fade-in [animation-delay:400ms]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-4 bg-blue-900 rounded-full" />
              Progresso do Semestre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-2xl font-black text-blue-900">{contrato.aulas_dadas}</span>
                <span className="text-xs font-bold text-gray-500 ml-1.5 uppercase tracking-tighter">aulas realizadas</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Meta: {contrato.aulas_totais} aulas</span>
              </div>
            </div>
            
            <div className="relative h-4 bg-gray-100/50 rounded-full overflow-hidden border border-gray-100">
              <div
                className="h-full bg-gradient-to-r from-blue-800 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Início: {formatDate(contrato.data_inicio)}</span>
              <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">{progressPct}% completado</span>
              <span>Término: {formatDate(contrato.data_fim)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8 animate-fade-in [animation-delay:600ms]">
        {/* Histórico de aulas recentes */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-4 bg-blue-900 rounded-full" />
              Cronograma de Aulas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100/50 text-gray-400">
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider pl-2">#</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Data e Hora</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Meet</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Lição</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {ultimasAulas?.map((aula: any, i: number) => (
                    <AulaRow key={aula.id} aula={aula} index={ultimasAulas.length - i} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de pagamentos */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-4 bg-blue-900 rounded-full" />
              Histórico Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100/50 text-gray-400">
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider pl-2">Parcela</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Valor</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Vencimento</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Data Pagto</th>
                    <th className="text-left py-4 font-bold text-[10px] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {pagamentos?.map((p: any) => (
                    <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-bold text-gray-700 pl-2">{p.parcela_num}/6</td>
                      <td className="py-4 font-black text-gray-900 tracking-tighter">{formatCurrency(p.valor)}</td>
                      <td className="py-4 font-medium text-gray-500">{formatDate(p.data_vencimento)}</td>
                      <td className="py-4 font-medium text-gray-500">{p.data_pagamento ? formatDate(p.data_pagamento) : <span className="text-gray-200">Em aberto</span>}</td>
                      <td className="py-4">
                        <Badge variant={
                          p.status === 'pago' ? 'success' :
                          p.status === 'atrasado' ? 'destructive' :
                          'warning'
                        } className="text-[10px] font-black uppercase tracking-tight">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
