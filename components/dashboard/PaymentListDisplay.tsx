'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import type { StudentPaymentGroup } from '@/lib/dashboard-types'
import WhatsAppLinkButton from '@/components/dashboard/WhatsAppLinkButton'
import { buildPaymentWhatsAppMessage, buildWhatsAppUrl } from '@/lib/whatsapp'

interface PaymentListDisplayProps {
  groups: StudentPaymentGroup[]
}

export default function PaymentListDisplay({ groups }: PaymentListDisplayProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'todos' | 'em_dia' | 'atrasado'>('todos')

  const filteredGroups = groups.filter((group) => {
    if (filter === 'todos') return true
    if (filter === 'em_dia') return group.status === 'Em dia'
    if (filter === 'atrasado') return group.status === 'Atrasado'
    return true
  })

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const getWhatsAppHref = (group: StudentPaymentGroup) => {
    const firstOpenInstallment = group.installments.find((installment) => installment.status !== 'pago')

    if (!firstOpenInstallment) {
      return null
    }

    return buildWhatsAppUrl(
      group.studentPhone,
      buildPaymentWhatsAppMessage({
        studentName: group.studentName,
        amount: formatCurrency(firstOpenInstallment.valor),
        dueDate: formatDateOnly(firstOpenInstallment.data_vencimento),
        installmentLabel: `parcela ${firstOpenInstallment.parcela_num}/${group.totalCount}`,
      })
    )
  }

  return (
    <div className="space-y-6">
      <div className="w-fit rounded-2xl bg-slate-100 p-1">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
              filter === 'todos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Todos ({groups.length})
          </button>
          <button
            onClick={() => setFilter('em_dia')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
              filter === 'em_dia'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Em dia ({groups.filter((group) => group.status === 'Em dia').length})
          </button>
          <button
            onClick={() => setFilter('atrasado')}
            className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
              filter === 'atrasado'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Atrasados ({groups.filter((group) => group.status === 'Atrasado').length})
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredGroups.map((group) => {
          const whatsappHref = getWhatsAppHref(group)

          return (
          <div
            key={group.contratoId}
            className="group overflow-hidden rounded-[2rem] border border-slate-100 bg-white transition-all hover:shadow-xl hover:shadow-blue-900/5"
          >
            <div
              onClick={() => toggleExpand(group.contratoId)}
              className="cursor-pointer p-6 transition-colors hover:bg-slate-50"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-6">
                  <div
                    className={`rounded-2xl p-4 transition-all ${
                      expandedId === group.contratoId
                        ? 'rotate-180 bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-400 group-hover:bg-white'
                    }`}
                  >
                    {expandedId === group.contratoId ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                      {group.studentName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-400"
                      >
                        {group.paidCount}/{group.totalCount} parcelas pagas
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[8px] font-black uppercase tracking-widest ${
                          group.status === 'Atrasado'
                            ? 'border-rose-200 bg-rose-50 text-rose-600'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {group.status}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <WhatsAppLinkButton
                        href={whatsappHref}
                        label="Cobrar no WhatsApp"
                        className="h-9 rounded-xl px-3"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:min-w-[340px] lg:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatCurrency(group.totalValue)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                      Em aberto
                    </p>
                    <p className="mt-1 text-sm font-black text-amber-700">
                      {formatCurrency(group.openValue)}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-blue-50 px-4 py-3 lg:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                      Contrato
                    </p>
                    <p className="mt-1 text-sm font-black text-blue-700">#{group.contratoId}</p>
                  </div>
                </div>
              </div>
            </div>

            {expandedId === group.contratoId ? (
              <div className="animate-in slide-in-from-top-4 border-t border-slate-50 bg-slate-50/30 p-8 duration-300">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {group.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Parcela {installment.parcela_num}/{group.totalCount}
                        </span>
                        <div
                          className={`rounded-lg p-1.5 ${
                            installment.status === 'pago'
                              ? 'bg-emerald-50 text-emerald-600'
                              : installment.status === 'atrasado'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {installment.status === 'pago' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : installment.status === 'atrasado' ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5" />
                          )}
                        </div>
                      </div>

                      <p className="text-xl font-black leading-none text-slate-900">
                        {formatCurrency(installment.valor)}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-tight text-slate-400">
                            Vencimento
                          </p>
                          <p className="text-[10px] font-bold text-slate-700">
                            {formatDateOnly(installment.data_vencimento)}
                          </p>
                        </div>
                        <Badge
                          className={`border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                            installment.status === 'pago'
                              ? 'bg-emerald-500 text-white'
                              : installment.status === 'atrasado'
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-400 text-white'
                          }`}
                        >
                          {installment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          )
        })}
      </div>
    </div>
  )
}
