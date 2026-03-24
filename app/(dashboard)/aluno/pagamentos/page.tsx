import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatDateOnly } from '@/lib/utils'
import { CreditCard, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import PaymentWrapper from '@/components/dashboard/PaymentWrapper'
import { withEffectivePaymentStatus } from '@/lib/payments'

export default async function AlunoPagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id')
    .eq('aluno_id', user.id)
    .eq('status', 'ativo')
    .single()

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('parcela_num')

  const pagamentosComStatus = (pagamentos || []).map((payment: any) => withEffectivePaymentStatus(payment))

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href="/aluno" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Financeiro</h1>
        <p className="text-slate-500 font-medium">Controle suas parcelas, datas de vencimento e pagamentos realizados.</p>
      </div>

      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="p-8 bg-slate-100/50 border-b border-slate-200">
          <CardTitle className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20"><CreditCard className="w-4 h-4" /></div>
            Extrato Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Parcela</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">Valor</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">Vencimento</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest">Data de Pago</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">Ação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagamentosComStatus.map((p: any) => (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-all duration-300">

                    <td className="py-6 px-8">
                      <span className="text-sm font-black text-slate-900">{p.parcela_num}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter"> / 06</span>
                    </td>
                    <td className="py-6 px-4 font-black text-slate-900 text-sm tracking-tighter">{formatCurrency(p.valor)}</td>
                    <td className="py-6 px-4 text-xs font-bold text-slate-500">{formatDate(p.data_vencimento)}</td>
                    <td className="py-6 px-4 text-xs font-bold text-slate-600">
                      {p.data_pagamento ? formatDate(p.data_pagamento) : <span className="text-slate-400 opacity-60 italic font-medium">Aguardando</span>}
                    </td>
                    <td className="py-6 px-8 text-right flex justify-end">
                      {p.effectiveStatus !== 'pago' ? (
                        <PaymentWrapper 
                          paymentId={p.id} 
                          amount={Number(p.valor)} 
                          email={profile?.email || ''} 
                          nome={profile?.full_name || ''} 
                        />
                      ) : (
                        <Badge variant={
                          p.effectiveStatus === 'pago' ? 'success' :
                          p.effectiveStatus === 'atrasado' ? 'destructive' :
                          'warning'
                        } className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                          {p.effectiveStatus}
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
    </div>
  )
}
