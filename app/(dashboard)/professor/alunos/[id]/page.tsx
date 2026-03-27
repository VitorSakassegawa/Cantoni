import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  Calendar,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  Fingerprint,
  GraduationCap,
  Mail,
  Phone,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import AulasTimeline from '@/components/dashboard/AulasTimeline'
import StatusContratoSelect from '@/components/dashboard/StatusContratoSelect'
import ContratoForm from '@/components/dashboard/ContratoForm'
import DeleteAlunoBtn from '@/components/dashboard/DeleteAlunoBtn'
import SkillsRadar from '@/components/dashboard/SkillsRadar'
import SkillEvaluationForm from '@/components/dashboard/SkillEvaluationForm'
import NotificationFeed from '@/components/dashboard/NotificationFeed'
import ResendAccessButton from '@/components/dashboard/ResendAccessButton'
import WhatsAppLinkButton from '@/components/dashboard/WhatsAppLinkButton'
import IssueDocumentButton from '@/components/documents/IssueDocumentButton'
import ExternalSignatureGuide from '@/components/documents/ExternalSignatureGuide'
import ExternalSignatureStatusBadge from '@/components/documents/ExternalSignatureStatusBadge'
import { buildAttentionCandidate, buildRenewalCandidate } from '@/lib/insights'
import { withEffectivePaymentStatus } from '@/lib/payments'
import { formatCurrency, formatDate, formatDateOnly, formatDateTime } from '@/lib/utils'
import {
  buildFirstAccessWhatsAppMessage,
  buildGeneralWhatsAppMessage,
  buildPaymentWhatsAppMessage,
  buildWhatsAppUrl,
} from '@/lib/whatsapp'

type RouteParams = Promise<{ id: string }>

export default async function AlunoDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const { data: aluno } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!aluno) notFound()

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', id)
    .order('created_at', { ascending: false })

  const contrato = contratos?.find((entry: any) => entry.status === 'ativo') || contratos?.[0]

  const { data: aulas } = await supabase
    .from('aulas')
    .select('*, contratos!inner(tipo_contrato)')
    .eq('contrato_id', contrato?.id || 0)
    .order('data_hora')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('parcela_num')

  const pagamentosComStatus = (pagamentos || []).map((payment: any) => withEffectivePaymentStatus(payment))
  const paidPaymentsCount = pagamentosComStatus.filter((payment: any) => payment.status === 'pago').length
  const openPaymentsCount = pagamentosComStatus.filter((payment: any) => payment.status !== 'pago').length
  const overduePaymentsCount = pagamentosComStatus.filter((payment: any) => payment.effectiveStatus === 'atrasado').length
  const totalPaymentsCount = pagamentosComStatus.length
  const nextOpenPayment = pagamentosComStatus.find((payment: any) => payment.status !== 'pago')
  const generalWhatsAppHref = buildWhatsAppUrl(aluno.phone, buildGeneralWhatsAppMessage(aluno.full_name))
  const firstAccessWhatsAppHref = buildWhatsAppUrl(aluno.phone, buildFirstAccessWhatsAppMessage(aluno.full_name))
  const paymentWhatsAppHref = nextOpenPayment
    ? buildWhatsAppUrl(
        aluno.phone,
        buildPaymentWhatsAppMessage({
          studentName: aluno.full_name,
          amount: formatCurrency(nextOpenPayment.valor),
          dueDate: formatDateOnly(nextOpenPayment.data_vencimento),
          installmentLabel: `parcela ${nextOpenPayment.parcela_num}/${totalPaymentsCount || 1}`,
        })
      )
    : null

  const { data: remarcacoes } = await supabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', id)
    .order('mes', { ascending: false })
    .limit(3)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes_habilidades')
    .select('*')
    .eq('aluno_id', id)
    .order('mes_referencia', { ascending: false })
    .limit(1)

  const currentAvaliacao = avaliacoes?.[0]
  const renewalCandidate = contrato ? buildRenewalCandidate({ ...contrato, profiles: aluno }) : null
  const attentionCandidate = contrato
    ? buildAttentionCandidate(
        {
          ...contrato,
          profiles: aluno,
          pagamentos: pagamentosComStatus,
        },
        {
          remarcacoesNoMes: remarcacoes?.[0]?.quantidade || 0,
        }
      )
    : null

  const { data: activityLogs } = await supabase
    .from('activity_logs')
    .select('id, title, description, severity, created_at')
    .eq('target_user_id', id)
    .order('created_at', { ascending: false })
    .limit(6)

  const activityItems = (activityLogs || []).map((entry: any) => ({
    id: `prof-student-activity-${entry.id}`,
    title: entry.title,
    description: entry.description,
    severity: entry.severity || 'info',
    meta: formatDateTime(entry.created_at),
  }))

  const contractIds = (contratos || []).map((entry: any) => entry.id)
  const { data: addenda } = contractIds.length
    ? await supabase
        .from('contract_addenda')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] as any[] }

  const { data: documentIssuances } = contrato
    ? await supabase
        .from('document_issuances')
        .select('id, kind, version, status, created_at, external_signature_status')
        .eq('contract_id', contrato.id)
        .order('version', { ascending: false })
    : { data: [] as any[] }

  const latestContractIssuance = (documentIssuances || []).find((entry: any) => entry.kind === 'contract')
  const latestDeclarationIssuance = (documentIssuances || []).find(
    (entry: any) => entry.kind === 'enrollment_declaration'
  )
  const hasIssuedContract = Boolean(latestContractIssuance)
  const hasIssuedDeclaration = Boolean(latestDeclarationIssuance)

  const progresso = contrato ? (contrato.aulas_dadas / contrato.aulas_totais) * 100 : 0
  const currentPlanLabel = contrato?.planos?.freq_semana
    ? `${contrato.planos.freq_semana}x por semana`
    : 'Plano não definido'
  const documentsCount = (hasIssuedContract ? 1 : 0) + (hasIssuedDeclaration ? 1 : 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in">
      <div className="space-y-5">
        <Link
          href="/professor/alunos"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para alunos
        </Link>

        <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-200/40 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] lms-gradient text-3xl font-black text-white shadow-xl shadow-blue-500/20">
                {aluno.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter text-slate-900 md:text-4xl">{aluno.full_name}</h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Painel administrativo do aluno com foco em contrato, documentos, financeiro e histórico.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                    Aluno
                  </Badge>
                  {aluno.data_inscricao ? (
                    <Badge variant="outline" className="border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Inscrito em {formatDateOnly(aluno.data_inscricao)}
                    </Badge>
                  ) : null}
                  {!contrato ? (
                    <Badge variant="destructive" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      Sem contrato ativo
                    </Badge>
                  ) : null}
                  {contrato?.status_financeiro === 'pendente' ? (
                    <Badge variant="warning" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      Pagamento pendente
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 xl:max-w-[540px] xl:justify-end">
              <Link href={`/professor/alunos/${id}/perfil`}>
                <Button variant="outline" className="h-11 rounded-2xl border-slate-200 px-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Editar perfil
                </Button>
              </Link>
              <ResendAccessButton
                alunoId={id}
                className="h-11 rounded-2xl border-slate-200 px-4 text-[10px] font-black uppercase tracking-widest text-slate-600"
              />
              <WhatsAppLinkButton
                href={firstAccessWhatsAppHref}
                label="Avisar no WhatsApp"
                className="h-11 rounded-2xl px-4"
              />
              {contrato ? (
                <>
                  <IssueDocumentButton
                    contractId={contrato.id}
                    kind="contract"
                    label={hasIssuedContract ? 'Reemitir contrato' : 'Emitir contrato'}
                    loadingLabel={hasIssuedContract ? 'Reemitindo...' : 'Emitindo...'}
                    successMessage={
                      hasIssuedContract
                        ? 'Nova versão do contrato emitida com os dados atuais.'
                        : 'Contrato emitido com sucesso.'
                    }
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  />
                  <IssueDocumentButton
                    contractId={contrato.id}
                    kind="enrollment_declaration"
                    label={hasIssuedDeclaration ? 'Reemitir declaração' : 'Emitir declaração'}
                    loadingLabel={hasIssuedDeclaration ? 'Reemitindo...' : 'Emitindo...'}
                    successMessage={
                      hasIssuedDeclaration
                        ? 'Nova versão da declaração emitida com os dados atuais.'
                        : 'Declaração emitida com sucesso.'
                    }
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  />
                </>
              ) : null}
              {contrato && paidPaymentsCount > 0 && openPaymentsCount > 0 ? (
                <Link href={`/professor/alunos/${id}/contrato/renegociar?id=${contrato.id}`}>
                  <Button variant="outline" className="h-11 rounded-2xl border-amber-200 bg-amber-50 px-4 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100">
                    Renegociar saldo
                  </Button>
                </Link>
              ) : null}
              <Link href={`/professor/alunos/${id}/contrato/novo`}>
                <Button className="h-11 rounded-2xl lms-gradient px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">
                  Novo contrato
                </Button>
              </Link>
            </div>
          </div>

          {contrato?.status_financeiro === 'pendente' ? (
            <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Atenção financeira</p>
              <p className="mt-1 text-sm font-medium text-amber-950/80">
                Regularize o financeiro antes de renovar para evitar ruído entre contrato, agenda e pagamentos.
              </p>
            </div>
          ) : null}

          {contrato && (hasIssuedContract || hasIssuedDeclaration) ? (
            <div className="mt-4 rounded-[1.5rem] border border-blue-200 bg-blue-50/90 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Reemissão disponível</p>
              <p className="mt-1 text-sm font-medium text-blue-900/80">
                Se dados do aluno ou do professor forem atualizados, reemita o documento para congelar uma nova versão com as informações atuais do portal.
              </p>
            </div>
          ) : null}
        </div>

        {contrato ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="border-none rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Contrato vigente</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                      {contrato.semestre} {contrato.ano}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">{currentPlanLabel}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso</span>
                    <span className="text-sm font-black text-blue-600">{Math.round(progresso)}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full lms-gradient" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    {contrato.aulas_dadas} de {contrato.aulas_totais} aulas concluídas • faltam {contrato.aulas_restantes}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Financeiro</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                      {overduePaymentsCount > 0 ? `${overduePaymentsCount} em atraso` : `${openPaymentsCount} em aberto`}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {nextOpenPayment
                        ? `Próximo vencimento em ${formatDateOnly(nextOpenPayment.data_vencimento)}`
                        : 'Sem parcelas pendentes no momento'}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant={overduePaymentsCount > 0 ? 'destructive' : 'success'} className="px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                    {overduePaymentsCount > 0 ? 'Ação necessária' : 'Em dia'}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {paidPaymentsCount} paga(s) • {openPaymentsCount} aberta(s)
                  </Badge>
                </div>
                <div className="mt-5">
                  <WhatsAppLinkButton href={paymentWhatsAppHref} label="Cobrar no WhatsApp" className="h-10 rounded-xl px-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Documentos</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{documentsCount} emitido(s)</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {hasIssuedContract ? 'Contrato emitido' : 'Sem contrato emitido'}
                      {hasIssuedDeclaration ? ' • Declaração emitida' : ''}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {latestContractIssuance ? (
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-violet-700">
                      Contrato v{latestContractIssuance.version}
                    </Badge>
                  ) : null}
                  {latestDeclarationIssuance ? (
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-violet-700">
                      Declaração v{latestDeclarationIssuance.version}
                    </Badge>
                  ) : null}
                </div>
                {latestContractIssuance ? (
                  <div className="mt-4">
                    <ExternalSignatureStatusBadge status={latestContractIssuance.external_signature_status} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {contrato ? <ExternalSignatureGuide audience="professor" compact /> : null}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-8">
          <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-500">Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Mail className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">E-mail</p>
                  <p className="truncate text-xs font-bold text-slate-700">{aluno.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500"><Phone className="h-4 w-4" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">WhatsApp</p>
                  <p className="text-xs font-bold text-slate-700">{aluno.phone || 'Não informado'}</p>
                  <div className="mt-3">
                    <WhatsAppLinkButton href={generalWhatsAppHref} label="Abrir conversa" className="h-9 rounded-xl px-3" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-500"><Fingerprint className="h-4 w-4" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">CPF</p>
                  <p className="text-xs font-bold text-slate-700">{aluno.cpf || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><Calendar className="h-4 w-4" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nascimento</p>
                  <p className="text-xs font-bold text-slate-700">{formatDateOnly(aluno.birth_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-indigo-100/40">
            <CardHeader className="border-b border-indigo-100 bg-indigo-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                <BrainCircuit className="h-3 w-3" /> Evolução de skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <SkillsRadar data={avaliacoes || []} />
              <div className="border-t border-slate-100 pt-6">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Atualizar avaliação mensal</p>
                <SkillEvaluationForm alunoId={id} initialData={currentAvaliacao} />
              </div>
            </CardContent>
          </Card>

          {attentionCandidate ? (
            <Card className="border-none overflow-hidden rounded-[2rem] bg-amber-50 shadow-xl shadow-amber-100/40">
              <CardHeader className="border-b border-amber-200 bg-amber-100/60 pb-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Radar de atenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <p className="text-3xl font-black tracking-tight text-amber-900">Score {attentionCandidate.score}</p>
                <div className="space-y-2">
                  {attentionCandidate.reasons.map((reason) => (
                    <div key={reason} className="rounded-xl bg-white/70 px-3 py-2 text-[10px] font-bold text-amber-700">
                      {reason}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-8">
          {contrato ? (
            <Card className="border-none overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-blue-900/10">
              <div className="h-2 lms-gradient shadow-inner" />
              <CardContent className="p-6 md:p-10">
                <div className="flex flex-col gap-8 xl:flex-row xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Semestre ativo</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-2xl font-black tracking-tight text-slate-900">
                            {contrato.semestre} {contrato.ano}
                          </h4>
                          <StatusContratoSelect contrato={contrato} />
                        </div>
                        <Link href={`/professor/alunos/${id}/contrato/editar`}>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl px-0 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-transparent">
                            Editar contrato
                          </Button>
                        </Link>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Programa de estudo</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-none bg-blue-600 px-4 py-1.5 text-[10px] font-black tracking-widest text-white">
                            {contrato.planos?.freq_semana}x / semana
                          </Badge>
                          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-600">
                            <GraduationCap className="h-4 w-4 text-blue-500" /> {contrato.nivel_atual}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-end justify-between gap-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progresso de aulas</p>
                        <p className="text-xl font-black tracking-tight text-blue-600">
                          {contrato.aulas_dadas} <span className="font-medium text-slate-300">/ {contrato.aulas_totais}</span>
                        </p>
                      </div>
                      <div className="h-4 overflow-hidden rounded-2xl bg-slate-100 p-1">
                        <div className="h-full rounded-xl lms-gradient shadow-lg shadow-blue-500/20" style={{ width: `${progresso}%` }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Lecionadas</span>
                        <span>{Math.round(progresso)}% concluído</span>
                        <span>Faltantes: {contrato.aulas_restantes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full rounded-[2rem] bg-slate-50/80 p-6 xl:w-[280px]">
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Aproveitamento</p>
                          <p className="text-xs font-black text-slate-900">{progresso >= 70 ? 'Excelente' : progresso >= 40 ? 'Consistente' : 'Em construção'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Livro atual</p>
                          <p className="text-xs font-black text-slate-900">{contrato.livro_atual || 'Não definido'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horário base</p>
                          <p className="text-xs font-black text-slate-900">{contrato.horario || '--:--'}h</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Período</p>
                        <p className="mt-1 text-xs font-black text-slate-900">
                          {formatDateOnly(contrato.data_inicio)} até {formatDateOnly(contrato.data_fim)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col items-center gap-4 rounded-[2.5rem] border border-amber-100 bg-amber-50 p-10 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <h3 className="text-xl font-black tracking-tight text-amber-900">Finalizar cadastro: novo contrato</h3>
                <p className="max-w-md font-medium text-amber-800/70">
                  Para que o aluno possa acessar aulas, pagamentos e documentos, configure abaixo o contrato inicial.
                </p>
              </div>

              <ContratoForm alunoId={id} defaultNivel={aluno.nivel} />
            </div>
          )}

          {renewalCandidate ? (
            <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-8">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Janela de renovação</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between gap-6 p-8 md:flex-row md:items-center">
                <div className="space-y-2">
                  <p className="text-3xl font-black tracking-tight text-slate-900">{renewalCandidate.daysRemaining} dia(s)</p>
                  <p className="text-sm font-medium text-slate-500">
                    Contrato perto do término com {renewalCandidate.progressPct}% já concluído.
                  </p>
                </div>
                <Link
                  href={`/professor/alunos/${id}/contrato/novo`}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
                >
                  Preparar renovação
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-8 2xl:grid-cols-2">
            <NotificationFeed
              title="Histórico operacional"
              items={activityItems}
              emptyMessage="Sem movimentações registradas para este aluno ainda."
            />

            <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-8">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Histórico de aditivos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100/50">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contrato</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo anterior</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Novo saldo</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Parcelamento</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">1.º vencimento</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(addenda || []).map((entry: any) => (
                        <tr key={entry.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-slate-900">#{entry.contract_id}</p>
                            <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">Aditivo #{entry.id}</p>
                          </td>
                          <td className="px-6 py-5 text-sm font-black text-slate-700">{formatCurrency(Number(entry.previous_open_value || 0))}</td>
                          <td className="px-6 py-5 text-sm font-black text-blue-700">{formatCurrency(Number(entry.new_open_value || 0))}</td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">
                            {entry.previous_open_installments}x {'->'} {entry.new_open_installments}x
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">{formatDateOnly(entry.first_due_date)}</td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">{formatDateTime(entry.created_at)}</td>
                        </tr>
                      ))}
                      {(!addenda || addenda.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                            Nenhum aditivo registrado para este aluno.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 p-8">
              <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                Fluxo de pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Parcela</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimento</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentosComStatus.map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{p.parcela_num}</span>
                          <span className="text-[10px] font-bold text-slate-300"> / {totalPaymentsCount}</span>
                        </td>
                        <td className="px-6 py-5 text-sm font-black text-slate-700">{formatCurrency(p.valor)}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-300" />
                            {formatDate(p.data_vencimento)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant={
                              p.effectiveStatus === 'pago'
                                ? 'success'
                                : p.effectiveStatus === 'atrasado'
                                  ? 'destructive'
                                  : p.effectiveStatus === 'pendente'
                                    ? 'warning'
                                    : 'outline'
                            }
                            className="px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                          >
                            {p.effectiveStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {p.mercadopago_id ? (
                            <Badge className="border-none bg-blue-100 text-[8px] font-black uppercase tracking-tighter text-blue-600">
                              MP: {p.mercadopago_id}
                            </Badge>
                          ) : p.status !== 'pago' ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Aguardando Bricks</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {pagamentosComStatus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                          Nenhuma parcela registrada para o contrato atual.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-8">
              <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                Histórico de contratos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">ID / tipo</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Período</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratos?.map((entry: any) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${
                          entry.status === 'ativo' ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-slate-900">#{entry.id}</p>
                          <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">{entry.tipo_contrato}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-slate-700">
                            {formatDateOnly(entry.data_inicio)} — {formatDateOnly(entry.data_fim)}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400">
                            {entry.semestre} {entry.ano}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="outline" className="border-slate-200 text-[9px] font-black uppercase text-slate-500">
                            {entry.planos?.freq_semana}x/semana
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant={
                              entry.status === 'ativo'
                                ? 'success'
                                : entry.status === 'vencido'
                                  ? 'outline'
                                  : entry.status === 'cancelado'
                                    ? 'destructive'
                                    : 'warning'
                            }
                            className="px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Link href={`/professor/alunos/${id}/contrato/editar?id=${entry.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">
                              Detalhes
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {(!contratos || contratos.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                          Nenhum contrato encontrado para este aluno.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/40">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-8">
              <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <BookOpen className="h-4 w-4" />
                </div>
                Timeline de aulas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AulasTimeline aulas={aulas || []} showStudentName={false} showContractType isProfessor />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 border-t border-slate-100 pt-10 opacity-70 transition-opacity hover:opacity-100 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-rose-600">Zona de perigo</h4>
                <p className="text-xs font-medium text-slate-500">
                  Excluir este aluno apagará permanentemente todos os seus dados e registros.
                </p>
              </div>
            </div>
            <DeleteAlunoBtn alunoId={id} alunoNome={aluno.full_name} />
          </div>
        </div>
      </div>
    </div>
  )
}
