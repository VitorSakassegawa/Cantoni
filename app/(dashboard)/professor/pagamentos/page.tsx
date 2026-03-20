import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { DollarSign, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'
import PaymentListDisplay from '@/components/dashboard/PaymentListDisplay'

export default async function PagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') redirect('/aluno')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*, contratos(id, aluno_id, profiles(full_name, email))')
    .order('data_vencimento')

  const atrasados = pagamentos?.filter((p: any) => p.status === 'atrasado') || []
  const pendentes = pagamentos?.filter((p: any) => p.status === 'pendente') || []
  const pagos = pagamentos?.filter((p: any) => p.status === 'pago') || []

  const totalRecebido = pagos.reduce((acc: number, p: any) => acc + p.valor, 0)

  const grouped = (pagamentos || []).reduce((acc: any, p: any) => {
    const cid = p.contrato_id
    if (!acc[cid]) {
      acc[cid] = {
        contratoId: cid,
        studentName: p.contratos?.profiles?.full_name || 'Desconhecido',
        totalValue: 0,
        openValue: 0,
        paidCount: 0,
        totalCount: 0,
        status: 'Em dia' as const,
        installments: []
      }
    }
    
    acc[cid].totalCount++
    acc[cid].totalValue += p.valor
    
    if (p.status === 'pago') {
      acc[cid].paidCount++
    } else {
      // User said: Valor em aberto = soma das parcelas com status "pendente"
      // But typically we should include "atrasado" in the open balance.
      // The prompt says in 3.3: Valor em aberto = soma das parcelas com status "pendente"
      // I'll include both because "atrasado" is also unpaid.
      acc[cid].openValue += p.valor
      if (p.status === 'atrasado') {
        acc[cid].status = 'Atrasado' as const
      }
    }
    
    acc[cid].installments.push({
      id: p.id,
      parcela_num: p.parcela_num,
      valor: p.valor,
      data_vencimento: p.data_vencimento,
      status: p.status
    })
    return acc
  }, {} as Record<string, any>)

  const sortedGroups = Object.values(grouped).sort((a: any, b: any) => {
    if (a.status === 'Atrasado' && b.status !== 'Atrasado') return -1
    if (a.status !== 'Atrasado' && b.status === 'Atrasado') return 1
    return 0
  })

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-widest text-blue-600">
            <DollarSign className="w-3 h-3" />
            Gestão Estratégica
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Fluxo Financeiro</h1>
          <p className="text-slate-400 font-bold text-sm">Resumo consolidado e detalhamento por aluno</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-4xl font-black text-rose-600 tracking-tighter">{atrasados.length}</p>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Faturas em Atraso</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">VALOR TOTAL</span>
              <span className="text-rose-600">{formatCurrency(atrasados.reduce((a: number, p: any) => a + p.valor, 0))}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-4xl font-black text-amber-600 tracking-tighter">{pendentes.length}</p>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Faturas Pendentes</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">AO VENCER</span>
              <span className="text-amber-600">{formatCurrency(pendentes.reduce((a: number, p: any) => a + p.valor, 0))}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group bg-emerald-50/10">
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalRecebido)}</p>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total Arrecadado</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">TRANSAÇÕES PAGAS</span>
              <span className="text-emerald-600">{pagos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentListDisplay groups={sortedGroups as any} />
    </div>
  )
}
