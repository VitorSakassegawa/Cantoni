'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FinanceDashProps {
  mrr: number
  arrecadadoMes: number
  pendenteTotal: number
  projectionData: { month: string; value: number }[]
}

export default function FinanceDash({ mrr, arrecadadoMes, pendenteTotal, projectionData }: FinanceDashProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MRR Card */}
        <Card className="glass-card border-none bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-100 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Receita Mensal (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tighter">{formatCurrency(mrr)}</p>
            <p className="text-[10px] font-bold text-indigo-200 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Baseado em contratos ativos
            </p>
          </CardContent>
        </Card>

        {/* Realized Revenue */}
        <Card className="glass-card border-none bg-emerald-50 border-emerald-100 shadow-xl shadow-emerald-500/5 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <DollarSign className="w-3 h-3" /> Arrecadado no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-900 tracking-tighter">{formatCurrency(arrecadadoMes)}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-emerald-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (arrecadadoMes / mrr) * 100)}%` }} 
                />
              </div>
              <span className="text-[10px] font-black text-emerald-600">
                {Math.round((arrecadadoMes / mrr) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Revenue */}
        <Card className="glass-card border-none bg-amber-50 border-amber-100 shadow-xl shadow-amber-500/5 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-16 h-16 text-amber-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> Em Aberto (Pendente/Atrasado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-amber-900 tracking-tighter">{formatCurrency(pendenteTotal)}</p>
            <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-tight">Total a receber ou em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card className="glass-card border-none shadow-2xl shadow-slate-200/50">
        <CardHeader className="pb-4 border-b border-slate-100/50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
             Projeção de Ganhos (6 Meses)
          </CardTitle>
          <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase tracking-widest px-3">Previsão</Badge>
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
                    fontWeight: 800
                  }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Projeção']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {projectionData.map((entry, index) => (
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
