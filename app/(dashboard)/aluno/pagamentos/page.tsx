import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatDateOnly } from '@/lib/utils'
import { AlertCircle, CheckCircle2, ChevronLeft, Clock3, CreditCard } from 'lucide-react'
import Link from 'next/link'
import PaymentWrapper from '@/components/dashboard/PaymentWrapper'
import { withEffectivePaymentStatus } from '@/lib/payments'
import type { PaymentContractSummary, PaymentWithEffectiveStatus } from '@/lib/dashboard-types'

type ProfileSummary = {
  full_name: string
  email: string
}

export default async function AlunoPagamentosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, data_inicio, data_fim, status')
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')
    .order('data_inicio', { ascending: false })

  const contractRows = (contratos || []) as PaymentContractSummary[]
  const contratoIds = contractRows.map((contrato) => contrato.id)

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .in('contrato_id', contratoIds.length > 0 ? contratoIds : [-1])
    .order('data_vencimento', { ascending: true })
    .order('parcela_num', { ascending: true })

  const pagamentosComStatus = ((pagamentos || []) as Array<any>).map((payment) =>
    withEffectivePaymentStatus(payment)
  ) as PaymentWithEffectiveStatus[]

  const totalPorContrato = pagamentosComStatus.reduce<Record<number, number>>((acc, payment) => {
    acc[payment.contrato_id] = (acc[payment.contrato_id] || 0) + 1
    return acc
  }, {})

  const pagamentosAgrupados = contractRows
    .map((contrato) => ({
      contrato,
      pagamentos: pagamentosComStatus.filter((payment) => payment.contrato_id === contrato.id),
    }))
    .filter((grupo) => grupo.pagamentos.length > 0)

  const overdueCount = pagamentosComStatus.filter(
    (payment) => payment.effectiveStatus === 'atrasado'
  ).length
  const pendingCount = pagamentosComStatus.filter(
    (payment) => payment.effectiveStatus === 'pendente'
  ).length
  const paidCount = pagamentosComStatus.filter((payment) => payment.effectiveStatus === 'pago').length
  const openAmount = pagamentosComStatus
    .filter((payment) => payment.effectiveStatus !== 'pago')
    .reduce((acc, payment) => acc + payment.valor, 0)

  const userProfile = profile as ProfileSummary | null

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link
        href="/aluno"
        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Financeiro</h1>
        <p className="font-medium text-slate-500">
          Controle suas parcelas, datas de vencimento e pagamentos realizados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Em aberto
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {formatCurrency(openAmount)}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  Pendentes
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-amber-700">
                  {pendingCount}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Atrasados
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-rose-700">
                  {overdueCount}
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  Pagas
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                  {paidCount}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {pagamentosAgrupados.map(({ contrato, pagamentos }) => (
          <Card key={contrato.id} className="glass-card border-none overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-slate-100/50 p-8">
              <CardTitle className="flex flex-col gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-600 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span>Contrato #{contrato.id}</span>
                </div>
                <span className="text-[10px] normal-case tracking-normal text-slate-400">
                  {formatDateOnly(contrato.data_inicio)} - {formatDateOnly(contrato.data_fim)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">
                        Parcela
                      </th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">
                        Valor
                      </th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">
                        Vencimento
                      </th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">
                        Data de pagamento
                      </th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest">
                        Ação / Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagamentos.map((payment) => (
                      <tr
                        key={payment.id}
                        className="group transition-all duration-300 hover:bg-slate-50/50"
                      >
                        <td className="px-8 py-6">
                          <span className="text-sm font-black text-slate-900">{payment.parcela_num}</span>
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                            {' '}
                            /{' '}
                            {String(totalPorContrato[payment.contrato_id] || pagamentos.length).padStart(
                              2,
                              '0'
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-sm font-black tracking-tighter text-slate-900">
                          {formatCurrency(payment.valor)}
                        </td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500">
                          {formatDate(payment.data_vencimento)}
                        </td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-600">
                          {payment.data_pagamento ? (
                            formatDate(payment.data_pagamento)
                          ) : (
                            <span className="font-medium italic text-slate-400 opacity-60">
                              Aguardando
                            </span>
                          )}
                        </td>
                        <td className="flex justify-end px-8 py-6 text-right">
                          {payment.effectiveStatus !== 'pago' ? (
                            <PaymentWrapper
                              paymentId={String(payment.id)}
                              amount={Number(payment.valor)}
                              email={userProfile?.email || ''}
                              nome={userProfile?.full_name || ''}
                            />
                          ) : (
                            <Badge
                              variant="success"
                              className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                            >
                              {payment.effectiveStatus}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
