import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CopiarPixBtn from '@/components/dashboard/CopiarPixBtn'
import NotificationFeed from '@/components/dashboard/NotificationFeed'
import { buildStudentNotifications, getDaysRemaining } from '@/lib/insights'
import { withEffectivePaymentStatus } from '@/lib/payments'
import { getStreakSummary } from '@/lib/streak-utils'
import { formatCurrency, formatDate, formatDateOnly, formatDateTime } from '@/lib/utils'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  Flame,
  Layers,
  Target,
  Umbrella,
  User,
  Video,
  type LucideIcon,
} from 'lucide-react'

type PriorityCard = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  href: string
  actionLabel: string
  tone: string
  buttonTone: string
  fullWidth?: boolean
}

export default async function AlunoDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role === 'professor') redirect('/professor')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')
    .order('data_inicio', { ascending: false })

  const contratosVigentes = contratos || []
  const contrato = contratosVigentes.find((item: any) => item.status === 'ativo') || contratosVigentes[0] || null
  const contratoIds = contratosVigentes.map((item: any) => item.id)
  const now = new Date().toISOString()

  const [
    { data: proximaAula },
    { data: pagamentos },
    { data: aulasPendentes },
    { data: flashcardsDue },
    { data: activityLogs },
  ] = await Promise.all([
    supabase
      .from('aulas')
      .select('*')
      .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
      .in('status', ['agendada', 'confirmada'])
      .gte('data_hora', now)
      .order('data_hora')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pagamentos')
      .select('*')
      .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
      .order('data_vencimento', { ascending: true })
      .order('parcela_num', { ascending: true }),
    supabase
      .from('aulas')
      .select('id, status, data_hora_solicitada')
      .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
      .or(`status.eq.pendente_remarcacao,and(data_hora.gte.${now})`)
      .order('data_hora', { ascending: true })
      .limit(10),
    supabase.from('flashcards').select('id').eq('aluno_id', user.id).lte('next_review', now),
    supabase
      .from('activity_logs')
      .select('id, title, description, severity, created_at')
      .or(`target_user_id.eq.${user.id},actor_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pagamentosComStatus = ((pagamentos || []) as any[]).map((payment) => withEffectivePaymentStatus(payment))
  const pagamentosPendentes = pagamentosComStatus.filter((payment) => payment.effectiveStatus !== 'pago')
  const pagamentoPendenteComStatus = pagamentosPendentes[0] || null
  const totalParcelasPorContrato = pagamentosComStatus.reduce((acc: Record<number, number>, payment: any) => {
    acc[payment.contrato_id] = (acc[payment.contrato_id] || 0) + 1
    return acc
  }, {})

  const temRemarcacaoPendente = (aulasPendentes || []).some(
    (aula: any) => aula.status === 'pendente_remarcacao' && !aula.data_hora_solicitada
  )
  const homeworkPendenteProximaAula = Boolean(proximaAula?.homework && !proximaAula?.homework_completed)
  const homeworkPreview = proximaAula?.homework
    ? `${String(proximaAula.homework).trim().slice(0, 90)}${String(proximaAula.homework).trim().length > 90 ? '...' : ''}`
    : null

  const daysRemaining = getDaysRemaining(contrato?.data_fim)
  const studentNotifications = buildStudentNotifications({
    daysRemaining,
    hasPendingPayment: Boolean(pagamentoPendenteComStatus),
    hasOverduePayment: pagamentoPendenteComStatus?.effectiveStatus === 'atrasado',
    hasPendingReschedule: temRemarcacaoPendente,
    hasUpcomingHomework: homeworkPendenteProximaAula,
    upcomingHomeworkLabel: homeworkPreview,
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

  const streakSummary = getStreakSummary({
    streakCount: profile?.streak_count || 0,
    bestStreak: profile?.best_streak || 0,
    lastActivityDate: profile?.last_activity_date,
  })

  const priorityCards = [
    pagamentoPendenteComStatus?.effectiveStatus === 'atrasado'
      ? {
          id: 'payment-overdue',
          icon: CreditCard,
          title: 'Pagamento em atraso',
          description: `Parcela ${pagamentoPendenteComStatus.parcela_num} venceu em ${formatDateOnly(
            pagamentoPendenteComStatus.data_vencimento
          )}. Regularize agora para evitar interrupções e manter sua renovação em dia.`,
          href: '/aluno/pagamentos',
          actionLabel: 'Pagar agora',
          tone: 'border-rose-100 bg-rose-50 text-rose-700',
          buttonTone: 'bg-rose-600 hover:bg-rose-700',
          fullWidth: true,
        }
      : null,
    temRemarcacaoPendente
      ? {
          id: 'pending-reschedule',
          icon: Calendar,
          title: 'Remarcação pendente',
          description: 'Existe uma remarcação aberta aguardando sua sugestão de nova data.',
          href: '/aluno/aulas',
          actionLabel: 'Sugerir datas',
          tone: 'border-amber-100 bg-amber-50 text-amber-700',
          buttonTone: 'bg-amber-600 hover:bg-amber-700',
        }
      : null,
  ].filter(Boolean) as PriorityCard[]

  return (
    <div className="animate-fade-in space-y-8 pb-16 lg:space-y-10">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1e3a8a] p-6 text-white shadow-2xl shadow-blue-900/20 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-[50%] bg-gradient-to-l from-white/10 to-transparent" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Portal do Aluno
            </div>
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl">
              Olá, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <div className="flex flex-wrap items-center gap-3 font-medium text-blue-100/80">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                <Badge className="border-none bg-blue-500 text-[10px] font-black uppercase text-white">
                  {profile?.nivel || 'Nível não definido'}
                </Badge>
              </div>
              {profile?.birth_date ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Nasc: <span className="font-bold text-white">{formatDateOnly(profile.birth_date)}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                {contrato?.planos?.descricao || 'Plano regular'}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/20 px-3 py-1.5 text-xs text-amber-200">
                <Flame className="h-3.5 w-3.5 fill-current" />
                Streak: <span className="font-black text-white">{profile?.streak_count || 0} dias</span>
              </div>
            </div>
          </div>

          <Link
            href="/aluno/perfil"
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-white px-6 py-3 text-sm font-bold text-blue-900 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          >
            <User className="h-4 w-4" />
            Ver perfil
          </Link>
        </div>
      </div>

      {priorityCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {priorityCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                className={`flex flex-col gap-4 rounded-[2rem] border p-5 shadow-xl md:flex-row md:items-center md:justify-between ${
                  card.tone
                } ${card.fullWidth ? 'xl:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900">{card.title}</p>
                    <p className="text-xs font-medium text-current/80">{card.description}</p>
                  </div>
                </div>
                <Link
                  href={card.href}
                  className={`inline-flex h-10 items-center justify-center rounded-xl px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${card.buttonTone}`}
                >
                  {card.actionLabel}
                </Link>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="glass-card group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
            <Video className="h-24 w-24 text-blue-900" />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Próxima aula</CardTitle>
          </CardHeader>
          <CardContent>
            {proximaAula ? (
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-black leading-tight tracking-tighter text-blue-900">
                    {formatDateTime(proximaAula.data_hora)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Duração: 45 minutos
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {proximaAula.meet_link ? (
                    <a
                      href={proximaAula.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lms-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-[2px] hover:shadow-xl hover:shadow-blue-500/20 active:translate-y-0"
                    >
                      <Video className="h-4 w-4" />
                      Entrar no Meet
                    </a>
                  ) : null}
                  <Link
                    href="/aluno/aulas"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-50"
                  >
                    Ver detalhes
                  </Link>
                </div>

                {proximaAula.homework && !proximaAula.homework_completed ? (
                  <div className="relative overflow-hidden rounded-2xl border border-blue-100/50 bg-blue-50/50 p-5">
                    <div className="absolute top-0 right-0 h-full w-1 bg-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                      Tarefa pendente
                    </span>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-blue-900/80">
                      {proximaAula.homework}
                    </p>
                  </div>
                ) : null}

                {(flashcardsDue?.length || 0) > 0 ? (
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-100/60 bg-indigo-50/60 p-5">
                    <div className="absolute top-0 right-0 h-full w-1 bg-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      Revisão recomendada
                    </span>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-indigo-900/80">
                      Você tem {flashcardsDue?.length || 0} flashcard(s) para revisar antes da próxima aula.
                    </p>
                    <Link
                      href="/aluno/flashcards"
                      className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                    >
                      Abrir flashcards
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="lms-gradient-soft rounded-3xl border border-dashed border-blue-200 py-12 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-blue-400/60">Sem aulas agendadas</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`glass-card transition-all duration-500 ${
            pagamentoPendenteComStatus?.effectiveStatus === 'atrasado' ? 'ring-2 ring-red-500/20' : ''
          }`}
        >
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {pagamentoPendenteComStatus ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-tighter text-slate-900">
                      {formatCurrency(pagamentoPendenteComStatus.valor)}
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Parcela {pagamentoPendenteComStatus.parcela_num}/
                      {totalParcelasPorContrato[pagamentoPendenteComStatus.contrato_id] || 1} • Vence em{' '}
                      {formatDate(pagamentoPendenteComStatus.data_vencimento)}
                    </p>
                  </div>
                  <Badge
                    variant={pagamentoPendenteComStatus.effectiveStatus === 'atrasado' ? 'destructive' : 'warning'}
                    className="rounded-lg px-3 py-1 text-[10px] font-black uppercase"
                  >
                    {pagamentoPendenteComStatus.effectiveStatus === 'atrasado' ? 'Em atraso' : 'Pendente'}
                  </Badge>
                </div>

                {pagamentoPendenteComStatus.pix_qrcode_base64 ? (
                  <div className="flex flex-col items-center gap-8 rounded-3xl border border-slate-100 bg-slate-50/50 p-6 shadow-inner sm:flex-row">
                    <div className="group/qr relative">
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur transition group-hover/qr:opacity-40" />
                      <img
                        src={
                          pagamentoPendenteComStatus.pix_qrcode_base64.startsWith('data:')
                            ? pagamentoPendenteComStatus.pix_qrcode_base64
                            : `data:image/png;base64,${pagamentoPendenteComStatus.pix_qrcode_base64}`
                        }
                        alt="QR Code PIX"
                        className="relative h-36 w-36 rounded-2xl border-4 border-white bg-white shadow-xl"
                      />
                    </div>
                    <div className="w-full flex-1 space-y-4">
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 sm:text-left">
                        QR Code PIX gerado
                      </p>
                      <p className="text-center text-xs font-bold text-slate-500 sm:text-left">
                        O pagamento ainda está pendente. Assim que o Mercado Pago confirmar a compensação, o status será atualizado.
                      </p>
                      {pagamentoPendenteComStatus.pix_copia_cola ? (
                        <CopiarPixBtn codigo={pagamentoPendenteComStatus.pix_copia_cola} />
                      ) : null}
                      {pagamentoPendenteComStatus.mercadopago_status ? (
                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-blue-500 sm:text-left">
                          Mercado Pago: {pagamentoPendenteComStatus.mercadopago_status}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold uppercase leading-tight tracking-tight text-amber-700">
                      O código PIX será enviado para seu e-mail em breve.
                    </p>
                  </div>
                )}

                <Link
                  href="/aluno/pagamentos"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                >
                  Ver detalhes financeiros
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/30 py-12">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                  <Badge variant="success" className="border-none p-0">
                    OK
                  </Badge>
                </div>
                <p className="text-sm font-black uppercase tracking-widest text-emerald-700">Tudo em dia!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <NotificationFeed
          title="Central do Aluno"
          items={studentNotifications}
          emptyMessage="Tudo certo por aqui. Nenhuma ação urgente no momento."
        />

        {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30 ? (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                <Layers className="h-4 w-4 text-blue-500" /> Renovação do contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <p className="text-3xl font-black tracking-tighter text-slate-900">{daysRemaining} dia(s)</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  restantes até o fim do contrato atual
                </p>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                Seu contrato entrou na janela ideal de renovação para manter agenda e financeiro organizados.
              </p>
              <Link
                href="/aluno/pagamentos"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
              >
                Ver financeiro e contrato
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <NotificationFeed
            id="historico-recente"
            title="Seu Histórico Recente"
            items={activityItems}
            emptyMessage="Sem movimentações recentes no seu portal."
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Umbrella className="h-4 w-4 text-orange-500" /> Próximas pausas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-5 text-center">
              <p className="text-[10px] font-medium tracking-tight text-slate-500">
                Consulte o calendário para planejar suas aulas em feriados e recessos.
              </p>
              <Link
                href="/aluno/calendario"
                className="inline-block rounded-xl bg-orange-50 px-6 py-2 text-[9px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-orange-600 hover:text-white"
              >
                Ver calendário completo
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <FileText className="h-4 w-4 text-blue-500" /> Seus documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <p className="text-lg font-black tracking-tight text-slate-900">Contrato e declaração prontos para PDF</p>
              <p className="text-sm font-medium text-slate-500">
                Abra seus documentos acadêmicos, confira as informações vigentes no portal e salve uma versão em PDF
                quando precisar.
              </p>
            </div>
            <Link
              href="/aluno/documentos"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
            >
              Abrir documentos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Target className="h-4 w-4 text-indigo-500" /> Nivelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between gap-6 pt-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <p className="text-lg font-black tracking-tight text-slate-900">
                Veja seu último teste, respostas certas e erradas e histórico técnico
              </p>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                O detalhamento pedagógico do professor fica separado, mas você pode acompanhar seu próprio desempenho e
                evolução.
              </p>
            </div>
            <Link
              href="/aluno/nivelamento"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
            >
              Abrir nivelamento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Flame className="h-4 w-4 text-amber-500" /> Jornada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-amber-500 px-4 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">Sequência atual</p>
              <p className="text-3xl font-black tracking-tight">{profile?.streak_count || 0} dias</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Status de hoje</p>
              <p className="mt-2 text-sm font-black tracking-tight text-blue-900">{streakSummary.headline}</p>
            </div>
            <Link
              href="/aluno/jornada"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600"
            >
              Abrir jornada
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
