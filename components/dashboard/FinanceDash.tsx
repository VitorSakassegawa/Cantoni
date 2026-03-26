'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface FinanceDashProps {
  mrr: number
  arrecadadoMes: number
  pendenteTotal: number
  projectionData: { month: string; value: number }[]
}

function formatPercentage(current: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((current / total) * 100)
}

function formatTooltipValue(value: number | string | ReadonlyArray<number | string> | undefined) {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0)
  }

  return Number(value ?? 0)
}

export default function FinanceDash({ mrr, arrecadadoMes, pendenteTotal, projectionData }: FinanceDashProps) {
  const percentageCollected = formatPercentage(arrecadadoMes, mrr)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="group relative overflow-hidden rounded-[2rem] border-none bg-[#312e81] text-white shadow-2xl shadow-indigo-900/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <TrendingUp className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-100">
              <TrendingUp className="w-3 h-3" /> Receita Mensal (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter">{formatCurrency(mrr)}</p>
            <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-200">
              <ArrowUpRight className="w-3 h-3" /> Baseado em contratos ativos
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden rounded-[2rem] border-none bg-[#065f46] text-white shadow-2xl shadow-emerald-900/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <DollarSign className="w-16 h-16 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-50">
              <DollarSign className="w-3 h-3" /> Arrecadado no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency(arrecadadoMes)}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all"
                  style={{ width: `${Math.min(100, percentageCollected)}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-white">{percentageCollected}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden rounded-[2rem] border-none bg-[#9a3412] text-white shadow-2xl shadow-orange-900/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <AlertCircle className="w-16 h-16 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-50">
              <AlertCircle className="w-3 h-3" /> Em Aberto (Pendente/Atrasado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency(pendenteTotal)}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-tight text-orange-200">
              Total a receber ou em atraso
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Projeção de Ganhos (6 Meses)
          </CardTitle>
          <Badge className="border-none bg-blue-50 px-3 text-[8px] font-black uppercase tracking-widest text-blue-600">
            Previsão
          </Badge>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                  formatter={(value: number | string | ReadonlyArray<number | string> | undefined) => [
                    formatCurrency(formatTooltipValue(value)),
                    'Projeção',
                  ]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {projectionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
