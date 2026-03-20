'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { ChevronDown, ChevronRight, DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Installment {
  id: string
  parcela_num: number
  valor: number
  data_vencimento: string
  status: 'pago' | 'pendente' | 'atrasado'
}

interface StudentGroup {
  contratoId: string
  studentName: string
  totalValue: number
  openValue: number
  paidCount: number
  totalCount: number
  status: 'Em dia' | 'Atrasado'
  installments: Installment[]
}

interface PaymentListDisplayProps {
  groups: StudentGroup[]
}

export default function PaymentListDisplay({ groups }: PaymentListDisplayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'todos' | 'em_dia' | 'atrasado'>('todos')

  const filteredGroups = groups.filter(g => {
    if (filter === 'todos') return true
    if (filter === 'em_dia') return g.status === 'Em dia'
    if (filter === 'atrasado') return g.status === 'Atrasado'
    return true
  })

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('todos')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
            filter === 'todos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Todos ({groups.length})
        </button>
        <button
          onClick={() => setFilter('em_dia')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
            filter === 'em_dia' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Em Dia ({groups.filter(g => g.status === 'Em dia').length})
        </button>
        <button
          onClick={() => setFilter('atrasado')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
            filter === 'atrasado' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Atrasados ({groups.filter(g => g.status === 'Atrasado').length})
        </button>
      </div>

      <div className="grid gap-4">
        {filteredGroups.map((group) => (
          <div key={group.contratoId} className="group overflow-hidden rounded-[2rem] border border-slate-100 bg-white transition-all hover:shadow-xl hover:shadow-blue-900/5">
            {/* Header / Summary Row */}
            <div 
              onClick={() => toggleExpand(group.contratoId)}
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl transition-all ${expandedId === group.contratoId ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-white'}`}>
                  {expandedId === group.contratoId ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{group.studentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200 text-slate-400">
                      {group.paidCount}/{group.totalCount} parcelas pagas
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 text-right invisible md:visible">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total</p>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(group.totalValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Em Aberto</p>
                  <p className={`text-sm font-black ${group.openValue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {formatCurrency(group.openValue)}
                  </p>
                </div>
                <div className="min-w-[100px]">
                  <Badge className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none shadow-sm ${
                    group.status === 'Atrasado' 
                      ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' 
                      : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                  }`}>
                    {group.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Detail Section (Accordion) */}
            {expandedId === group.contratoId && (
              <div className="border-t border-slate-50 bg-slate-50/30 p-8 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {group.installments.map((inst) => (
                    <div key={inst.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcela {inst.parcela_num}/{group.totalCount}</span>
                        <div className={`p-1.5 rounded-lg ${
                          inst.status === 'pago' ? 'bg-emerald-50 text-emerald-600' :
                          inst.status === 'atrasado' ? 'bg-rose-50 text-rose-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {inst.status === 'pago' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                           inst.status === 'atrasado' ? <AlertCircle className="w-3.5 h-3.5" /> :
                           <Calendar className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      
                      <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(inst.valor)}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Vencimento</p>
                          <p className="text-[10px] font-bold text-slate-700">{formatDateOnly(inst.data_vencimento)}</p>
                        </div>
                        <Badge className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none ${
                          inst.status === 'pago' ? 'bg-emerald-500 text-white' :
                          inst.status === 'atrasado' ? 'bg-rose-500 text-white' :
                          'bg-amber-400 text-white'
                        }`}>
                          {inst.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
