import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, formatDate, formatDateOnly } from '@/lib/utils'
import CopiarPixBtn from '@/components/dashboard/CopiarPixBtn'
import { Video, BookOpen, Calendar, User, CreditCard, Umbrella, Flame, Trophy, Layers, BrainCircuit, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import SkillsRadar from '@/components/dashboard/SkillsRadar'
import NotificationFeed from '@/components/dashboard/NotificationFeed'
import { buildStudentNotifications, getDaysRemaining } from '@/lib/insights'
import { withEffectivePaymentStatus } from '@/lib/payments'
import { STUDENT_STREAK_RULES } from '@/lib/streak-utils'

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

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', user.id)
    .eq('status', 'ativo')
    .order('data_inicio', { ascending: false })

  const contratosAtivos = contratos || []
  const contrato = contratosAtivos[0] || null
  const contratoIds = contratosAtivos.map((item: any) => item.id)
  const now = new Date().toISOString()

  const { data: proximaAula } = await supabase
    .from('aulas')
    .select('*')
    .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', now)
    .order('data_hora')
    .limit(1)
    .maybeSingle()

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
    .order('data_vencimento', { ascending: true })
    .order('parcela_num', { ascending: true })

  const pagamentosComStatus = (pagamentos || []).map((payment: any) => withEffectivePaymentStatus(payment))
  const pagamentosPendentes = pagamentosComStatus.filter((payment: any) => payment.effectiveStatus !== 'pago')
  const pagamentoPendenteComStatus = pagamentosPendentes[0] || null
  const totalParcelasPorContrato = pagamentosComStatus.reduce((acc: Record<number, number>, payment: any) => {
    acc[payment.contrato_id] = (acc[payment.contrato_id] || 0) + 1
    return acc
  }, {})

  const { data: aulasPendentes } = await supabase
    .from('aulas')
    .select('id, status, data_hora_solicitada')
    .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
    .or(`status.eq.pendente_remarcacao,and(data_hora.gte.${now})`)
    .order('data_hora', { ascending: true })
    .limit(10)

  const temRemarcacaoPendente = aulasPendentes?.some((a: any) => a.status === 'pendente_remarcacao' && !a.data_hora_solicitada)

  const progressPct = contrato
    ? Math.round((contrato.aulas_dadas / contrato.aulas_totais) * 100)
    : 0

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const currentCefrIdx = cefrLevels.indexOf(profile?.cefr_level || 'A1')

  const { data: flashcardsDue } = await supabase
    .from('flashcards')
    .select('id')
    .eq('aluno_id', user.id)
    .lte('next_review', now)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes_habilidades')
    .select('*')
    .eq('aluno_id', user.id)
    .order('mes_referencia', { ascending: false })
    .limit(2)

  const { data: activityLogs } = await supabase
    .from('activity_logs')
    .select('id, title, description, severity, created_at')
    .or(`target_user_id.eq.${user.id},actor_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(5)

  const daysRemaining = getDaysRemaining(contrato?.data_fim)
  const studentNotifications = buildStudentNotifications({
    daysRemaining,
    hasPendingPayment: Boolean(pagamentoPendenteComStatus),
    hasOverduePayment: pagamentoPendenteComStatus?.effectiveStatus === 'atrasado',
    hasPendingReschedule: temRemarcacaoPendente,
    flashcardsDue: flashcardsDue?.length || 0,
    recentActivityCount: activityLogs?.length || 0,
  })

  const activityItems = (activityLogs || []).map((entry: any) => ({
    id: `student-activity-${entry.id}`,
    title: entry.title,
    description: entry.description,
    severity: entry.severity || 'info',
    meta: formatDateTime(entry.created_at),
  }))

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
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
              <div className="flex items-center gap-2 bg-amber-400/20 px-3 py-1.5 rounded-xl border border-amber-400/30 text-xs text-amber-200">
                <Flame className="w-3.5 h-3.5 fill-current" />
                Streak: <span className="font-black text-white">{profile?.streak_count || 0} dias</span>
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

      {pagamentoPendenteComStatus?.effectiveStatus === 'atrasado' && (
        <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-500/5">
          <div className="flex items-center gap-4 text-rose-600">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-rose-900 text-sm uppercase tracking-tight">Pagamento em Atraso</p>
              <p className="text-xs text-rose-700/70 font-medium">A parcela {pagamentoPendenteComStatus.parcela_num} de {formatCurrency(pagamentoPendenteComStatus.valor)} venceu em {formatDateOnly(pagamentoPendenteComStatus.data_vencimento)}.</p>
            </div>
          </div>
          <Link href="/aluno/pagamentos" className="h-10 px-8 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center">
            PAGAR AGORA
          </Link>
        </div>
      )}

      {temRemarcacaoPendente && (
        <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/5">
          <div className="flex items-center gap-4 text-amber-600">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-amber-900 text-sm uppercase tracking-tight">Ação Necessária: Remarcação</p>
              <p className="text-xs text-amber-700/70 font-medium">Você tem aulas que precisam de uma nova data sugerida por você.</p>
            </div>
          </div>
          <Link href="/aluno/aulas" className="h-10 px-8 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 flex items-center">
            Sugerir Datas
          </Link>
        </div>
      )}

      {!profile?.placement_test_completed && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-indigo-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-300/30 transition-all duration-700" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-indigo-900 text-lg tracking-tight leading-tight">Mapeamento de Nível com IA ✨</p>
              <p className="text-sm text-indigo-700/70 font-medium mt-1">Bem-vindo! Vamos mapear seu nível de inglês para personalizar suas aulas?</p>
            </div>
          </div>
          <Link
            href="/aluno/teste-nivel"
            className="h-14 px-10 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 relative z-10"
          >
            INICIAR TESTE AGORA
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NotificationFeed
          title="Central do Aluno"
          items={studentNotifications}
          emptyMessage="Tudo certo por aqui. Nenhuma ação urgente no momento."
        />

        {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30 ? (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Layers className="w-4 h-4 text-blue-500" /> Renovação do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{daysRemaining} dia(s)</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  restantes até o fim do contrato atual
                </p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Seu contrato entra agora na janela ideal de renovação. Isso ajuda a manter a agenda organizada e evita interrupções no plano de aulas.
              </p>
              <Link
                href="/aluno/pagamentos"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Ver financeiro e contrato
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <NotificationFeed
            title="Seu Histórico Recente"
            items={activityItems}
            emptyMessage="Sem movimentações recentes no seu portal."
          />
        )}
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
            <Flame className="w-4 h-4 text-amber-500" /> Como Funciona Seu Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {STUDENT_STREAK_RULES.map((rule) => (
              <div key={rule} className="rounded-2xl bg-amber-50/70 border border-amber-100 px-4 py-3 text-sm font-medium text-amber-900/80">
                {rule}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card group relative overflow-hidden">
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
                  <Link
                    href="/aluno/aulas"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all"
                  >
                    Ver detalhes
                  </Link>
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

        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Umbrella className="w-4 h-4 text-orange-500" /> Próximas Pausas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-5 text-center space-y-4">
              <p className="text-[10px] text-slate-500 font-medium tracking-tight">Consulte o calendário para planejar suas aulas em feriados e recessos.</p>
              <Link href="/aluno/calendario" className="inline-block px-6 py-2 rounded-xl bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all">
                Ver Calendário Completo
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative group cursor-pointer">
          <Link href="/aluno/flashcards" className="absolute inset-0 z-20" />
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <BrainCircuit className="w-24 h-24 text-blue-900" />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-indigo-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Seu Banco de Palavras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">
                  {flashcardsDue?.length || 0}
                </span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">palavras para revisar</span>
              </div>
              <div className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 group-hover:bg-indigo-700 transition-all">
                PRATICAR AGORA
                <BrainCircuit className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-card group transition-all duration-500 ${pagamentoPendenteComStatus?.effectiveStatus === 'atrasado' ? 'ring-2 ring-red-500/20' : ''}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentoPendenteComStatus ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                      {formatCurrency(pagamentoPendenteComStatus.valor)}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
                      Parcela {pagamentoPendenteComStatus.parcela_num}/{totalParcelasPorContrato[pagamentoPendenteComStatus.contrato_id] || 1} • Vence em {formatDate(pagamentoPendenteComStatus.data_vencimento)}
                    </p>
                  </div>
                  <Badge variant={pagamentoPendenteComStatus.effectiveStatus === 'atrasado' ? 'destructive' : 'warning'} className="text-[10px] font-black uppercase px-3 py-1 rounded-lg">
                    {pagamentoPendenteComStatus.effectiveStatus === 'atrasado' ? 'Em Atraso' : 'Pendente'}
                  </Badge>
                </div>

                {pagamentoPendenteComStatus.pix_qrcode_base64 && (
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="relative group/qr">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover/qr:opacity-40 transition" />
                      <img
                        src={pagamentoPendenteComStatus.pix_qrcode_base64.startsWith('data:')
                          ? pagamentoPendenteComStatus.pix_qrcode_base64
                          : `data:image/png;base64,${pagamentoPendenteComStatus.pix_qrcode_base64}`}
                        alt="QR Code PIX"
                        className="relative w-36 h-36 border-4 border-white rounded-2xl bg-white shadow-xl"
                      />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Scan para pagar PIX</p>
                      {pagamentoPendenteComStatus.pix_copia_cola && (
                        <CopiarPixBtn codigo={pagamentoPendenteComStatus.pix_copia_cola} />
                      )}
                    </div>
                  </div>
                )}

                {!pagamentoPendenteComStatus.pix_qrcode_base64 && (
                  <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-amber-700 leading-tight uppercase tracking-tight">O código PIX será enviado para seu e-mail em breve.</p>
                  </div>
                )}

                <Link
                  href="/aluno/pagamentos"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                >
                  Ver detalhes financeiros
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-card overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Trophy className="w-4 h-4" /> Mapeamento de Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <SkillsRadar data={avaliacoes || []} />

            <div className="flex justify-between items-center px-2 pt-6 border-t border-slate-100">
              {cefrLevels.map((level, idx) => {
                const isCompleted = idx < currentCefrIdx
                const isCurrent = idx === currentCefrIdx
                return (
                  <div key={level} className="flex flex-col items-center gap-3 relative">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all duration-500
                      ${isCompleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 scale-100' :
                        isCurrent ? 'bg-white border-2 border-blue-600 text-blue-600 shadow-xl scale-125 z-10' :
                        'bg-slate-100 text-slate-400'}
                    `}>
                      {level}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
              Progresso do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Concluído</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-blue-900 tracking-tighter">{contrato?.aulas_dadas || 0}</span>
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">/ {contrato?.aulas_totais || 20}</span>
                </div>
              </div>
              <Badge className="bg-blue-900 text-white border-none font-black text-[8px] uppercase px-2 py-1 rounded-lg">
                {progressPct}%
              </Badge>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
