import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, formatDate, formatDateOnly } from '@/lib/utils'
import AulaRow from '@/components/dashboard/AulaRow'
import CopiarPixBtn from '@/components/dashboard/CopiarPixBtn'
import { Video, BookOpen, Calendar, User, CreditCard } from 'lucide-react'
import Link from 'next/link'

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
    .gte('data_hora', now)
    .order('data_hora', { ascending: true })
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
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-10 bg-[#1e3a8a] text-white shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Portal do Aluno
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Olá, {profile?.full_name?.split(' ')[0]}! ✨
            </h1>
            <div className="flex flex-wrap gap-4 items-center text-blue-100/80 font-medium">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Badge className="bg-blue-500 text-white border-none text-[10px] uppercase font-black">{profile?.nivel || 'Nível não definido'}</Badge>
              </div>
              {profile?.birth_date && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  Nasc: <span className="font-bold text-white">{formatDateOnly(profile.birth_date)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                {contrato?.planos?.descricao || 'Plano Regular'}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Link 
              href="/aluno/perfil"
              className="px-6 py-3 rounded-2xl bg-white text-blue-900 font-bold text-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Ver Perfil
            </Link>
          </div>
        </div>
      </div>
      
      {/* Alerta de Pagamento em Atraso */}
      {pagamentoPendente?.status === 'atrasado' && (
        <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-500/5 animate-bounce-slow">
          <div className="flex items-center gap-4 text-rose-600">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-rose-900 text-sm uppercase tracking-tight">Pagamento em Atraso</p>
              <p className="text-xs text-rose-700/70 font-medium">A parcela {pagamentoPendente.parcela_num} de {formatCurrency(pagamentoPendente.valor)} venceu em {formatDateOnly(pagamentoPendente.data_vencimento)}.</p>
            </div>
          </div>
          <button className="h-10 px-8 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">
            PAGAR AGORA
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próxima aula */}
        <Card className="glass-card border-none group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Video className="w-24 h-24 text-blue-900" />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Próxima Aula
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximaAula ? (
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-black text-blue-900 tracking-tighter leading-tight">
                    {formatDateTime(proximaAula.data_hora)}
                  </p>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Duração: 45 minutos
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {proximaAula.meet_link && (
                    <a
                      href={proximaAula.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 lms-gradient text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:shadow-xl hover:shadow-blue-500/20 hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
                    >
                      <Video className="w-4 h-4" />
                      ENTRAR NO MEET
                    </a>
                  )}
                </div>
                
                {proximaAula.homework && !proximaAula.homework_completed && (
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 relative overflow-hidden group/hw">
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tarefa Pendente</span>
                    <p className="text-sm text-blue-900/80 mt-2 font-semibold leading-relaxed">{proximaAula.homework}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center lms-gradient-soft rounded-3xl border border-dashed border-blue-200">
                <p className="text-sm font-bold text-blue-400/60 uppercase tracking-widest">Sem aulas agendadas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagamento atual */}
        <Card className={`glass-card border-none group transition-all duration-500 ${pagamentoPendente?.status === 'atrasado' ? 'ring-2 ring-red-500/20' : ''}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentoPendente ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                      {formatCurrency(pagamentoPendente.valor)}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
                      Parcela {pagamentoPendente.parcela_num}/6 • Vence em {formatDate(pagamentoPendente.data_vencimento)}
                    </p>
                  </div>
                  <Badge variant={pagamentoPendente.status === 'atrasado' ? 'destructive' : 'warning'} className="text-[10px] font-black uppercase px-3 py-1 rounded-lg">
                    {pagamentoPendente.status === 'atrasado' ? 'Em Atraso' : 'Pendente'}
                  </Badge>
                </div>

                {pagamentoPendente.pix_qrcode_base64 && (
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="relative group/qr">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover/qr:opacity-40 transition" />
                      <img
                        src={pagamentoPendente.pix_qrcode_base64}
                        alt="QR Code PIX"
                        className="relative w-36 h-36 border-4 border-white rounded-2xl bg-white shadow-xl"
                      />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Scan para pagar PIX</p>
                      {pagamentoPendente.pix_copia_cola && (
                        <CopiarPixBtn codigo={pagamentoPendente.pix_copia_cola} />
                      )}
                    </div>
                  </div>
                )}

                {!pagamentoPendente.pix_qrcode_base64 && (
                  <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-amber-700 leading-tight uppercase tracking-tight">O código PIX será enviado para seu e-mail em breve.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center bg-emerald-50/30 rounded-3xl border border-dashed border-emerald-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Badge variant="success" className="p-0 border-none">✅</Badge>
                </div>
                <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Tudo em dia!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progresso do semestre */}
      {contrato && (
        <Card className="glass-card border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Jornada de Aprendizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Concluído</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-900 tracking-tighter">{contrato.aulas_dadas}</span>
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">/ {contrato.aulas_totais} aulas</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-900 text-white border-none font-black text-[10px] uppercase px-3 py-1 rounded-lg shadow-lg shadow-blue-900/10">
                  {progressPct}% COMPLETO
                </Badge>
              </div>
            </div>
            
            <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/30"
                style={{ width: `${progressPct}%` }}
              >
                <div className="w-full h-full bg-gradient-to-t from-black/10 to-transparent" />
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Início: {formatDate(contrato.data_inicio)}
              </div>
              <div className="flex items-center gap-2">
                Fim: {formatDate(contrato.data_fim)}
                <Calendar className="w-3 h-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs / Bottom Sections */}
      <div className="grid grid-cols-1 gap-10">
        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Próximas Aulas
            </CardTitle>

          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="text-center py-6 px-8 font-black text-[10px] uppercase tracking-widest">Aula #</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Data e Horário</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Status</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Google Meet</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Conteúdo</th>
                    <th className="py-6 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ultimasAulas?.map((aula: any, i: number) => (
                    <AulaRow key={aula.id} aula={aula} index={i + 1} />
                  ))}

                </tbody>
              </table>
              {(!ultimasAulas || ultimasAulas.length === 0) && (
                <div className="py-20 text-center">
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Nenhuma aula registrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Extrato Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="text-left py-6 px-8 font-black text-[10px] uppercase tracking-widest">Parcela</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Valor</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Vencimento</th>
                    <th className="text-left py-6 px-4 font-black text-[10px] uppercase tracking-widest">Data de Pago</th>
                    <th className="text-left py-6 px-8 font-black text-[10px] uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagamentos?.map((p: any) => (
                    <tr key={p.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="py-6 px-8">
                        <span className="font-black text-slate-900 tracking-tighter">{p.parcela_num}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter"> / 06</span>
                      </td>
                      <td className="py-6 px-4 font-black text-slate-900 tracking-tighter">{formatCurrency(p.valor)}</td>
                      <td className="py-6 px-4 font-bold text-slate-500">{formatDate(p.data_vencimento)}</td>
                      <td className="py-6 px-4 font-bold text-slate-500">
                        {p.data_pagamento ? formatDate(p.data_pagamento) : <span className="text-slate-200">Aguardando</span>}
                      </td>
                      <td className="py-6 px-8 text-right">
                        <Badge variant={
                          p.status === 'pago' ? 'success' :
                          p.status === 'atrasado' ? 'destructive' :
                          'warning'
                        } className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
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
