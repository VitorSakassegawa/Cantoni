import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { AlertCircle, Calendar, CheckCircle2, DollarSign } from 'lucide-react'
import PaymentListDisplay from '@/components/dashboard/PaymentListDisplay'
import WhatsAppLinkButton from '@/components/dashboard/WhatsAppLinkButton'
import { withEffectivePaymentStatus } from '@/lib/payments'
import { getEscalationTier, ESCALATION_META } from '@/lib/payment-escalation'
import { buildPaymentReminderMessage, buildWhatsAppUrl } from '@/lib/whatsapp'
import type { PaymentWithEffectiveStatus, StudentPaymentGroup } from '@/lib/dashboard-types'

export default async function PagamentosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') redirect('/aluno')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*, contratos(id, aluno_id, profiles(full_name, email, phone))')
    .order('data_vencimento')

  const pagamentosComStatus = ((pagamentos || []) as PaymentWithEffectiveStatus[]).map((payment) =>
    withEffectivePaymentStatus(payment as PaymentWithEffectiveStatus)
  ) as PaymentWithEffectiveStatus[]

  const atrasados = pagamentosComStatus.filter((payment) => payment.effectiveStatus === 'atrasado')
  const pendentes = pagamentosComStatus.filter((payment) => payment.effectiveStatus === 'pendente')
  const pagos = pagamentosComStatus.filter((payment) => payment.effectiveStatus === 'pago')

  const totalRecebido = pagos.reduce((acc, payment) => acc + payment.valor, 0)

  const grouped = pagamentosComStatus.reduce<Record<number, StudentPaymentGroup>>((acc, payment) => {
    const contractId = payment.contrato_id

    if (!acc[contractId]) {
      acc[contractId] = {
        contratoId: contractId,
        alunoId: payment.contratos?.aluno_id,
        studentName: payment.contratos?.profiles?.full_name || 'Desconhecido',
        studentPhone: payment.contratos?.profiles?.phone || null,
        totalValue: 0,
        openValue: 0,
        paidCount: 0,
        totalCount: 0,
        status: 'Em dia',
        installments: [],
      }
    }

    acc[contractId].totalCount++
    acc[contractId].totalValue += payment.valor

    if (payment.effectiveStatus === 'pago') {
      acc[contractId].paidCount++
    } else {
      acc[contractId].openValue += payment.valor
      if (payment.effectiveStatus === 'atrasado') {
        acc[contractId].status = 'Atrasado'
      }
    }

    acc[contractId].installments.push({
      id: payment.id,
      parcela_num: payment.parcela_num,
      valor: payment.valor,
      data_vencimento: payment.data_vencimento,
      status: payment.effectiveStatus,
      mercadopago_status: payment.mercadopago_status,
    })

    return acc
  }, {})

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (a.status === 'Atrasado' && b.status !== 'Atrasado') return -1
    if (a.status !== 'Atrasado' && b.status === 'Atrasado') return 1
    return 0
  })

  // Dunning ladder: classify each overdue payment by days late + pre-fill a
  // WhatsApp message the professor reviews and sends (nothing is auto-sent).
  // São Paulo calendar day (en-CA → YYYY-MM-DD), so the tier doesn't shift a day
  // near midnight BRT vs UTC.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const escalationRows = atrasados
    .map((payment) => {
      const esc = getEscalationTier(payment.data_vencimento, today)
      if (!esc) return null
      const studentName = payment.contratos?.profiles?.full_name || 'Aluno(a)'
      const amount = formatCurrency(payment.valor)
      const dueDate = formatDateOnly(payment.data_vencimento)
      const message = buildPaymentReminderMessage({ tier: esc.tier, studentName, amount, dueDate, daysOverdue: esc.days })
      return {
        id: payment.id,
        studentName,
        amount,
        dueDate,
        parcela: payment.parcela_num,
        tier: esc.tier,
        days: esc.days,
        href: buildWhatsAppUrl(payment.contratos?.profiles?.phone, message),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.days - a.days)

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-600">
            <DollarSign className="h-3 w-3" />
            Gestão estratégica
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Fluxo Financeiro</h1>
          <p className="text-sm font-bold text-slate-400">
            Resumo consolidado e detalhamento por aluno
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter text-rose-600">
                  {atrasados.length}
                </p>
                <p className="text-xs font-black uppercase tracking-widest text-rose-400">
                  Faturas em atraso
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">VALOR TOTAL</span>
              <span className="text-rose-600">
                {formatCurrency(atrasados.reduce((acc, payment) => acc + payment.valor, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter text-amber-600">
                  {pendentes.length}
                </p>
                <p className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Faturas pendentes
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">AO VENCER</span>
              <span className="text-amber-600">
                {formatCurrency(pendentes.reduce((acc, payment) => acc + payment.valor, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group bg-emerald-50/10">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter text-emerald-600">
                  {formatCurrency(totalRecebido)}
                </p>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Total arrecadado
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">TRANSAÇÕES PAGAS</span>
              <span className="text-emerald-600">{pagos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {escalationRows.length > 0 && (
        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Régua de cobrança</h2>
              <p className="text-xs font-bold text-slate-400">
                Sugestão de abordagem por tempo de atraso — você revisa a mensagem e envia.
              </p>
            </div>
            <div className="space-y-2">
              {escalationRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-black uppercase tracking-widest ${ESCALATION_META[row.tier].badgeClass}`}>
                      {ESCALATION_META[row.tier].label}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{row.studentName}</p>
                      <p className="text-xs text-slate-400">
                        Parcela {row.parcela} · {row.amount} · venceu {row.dueDate} · {row.days} dia{row.days === 1 ? '' : 's'} de atraso
                      </p>
                    </div>
                  </div>
                  <WhatsAppLinkButton
                    href={row.href}
                    label="Cobrar via WhatsApp"
                    className="h-9 shrink-0 rounded-xl px-3"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentListDisplay groups={sortedGroups} />
    </div>
  )
}
