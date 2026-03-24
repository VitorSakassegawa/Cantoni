'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Calendar, CreditCard, FileText, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatCurrency, formatDateOnly, maskCurrency } from '@/lib/utils'

interface ContratoRenegociacaoFormProps {
  alunoId: string
  contractId: number
  paidValue: number
  currentOpenValue: number
  currentOpenInstallments: number
  currentPaymentMethod: string | null
  firstOpenDueDate: string
}

export default function ContratoRenegociacaoForm({
  alunoId,
  contractId,
  paidValue,
  currentOpenValue,
  currentOpenInstallments,
  currentPaymentMethod,
  firstOpenDueDate,
}: ContratoRenegociacaoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [newOpenValue, setNewOpenValue] = useState(maskCurrency((currentOpenValue * 100).toFixed(0)))
  const [newInstallments, setNewInstallments] = useState(String(currentOpenInstallments))
  const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod || 'pix')
  const [dueDate, setDueDate] = useState(firstOpenDueDate)
  const [notes, setNotes] = useState('')

  const parsedOpenValue = useMemo(
    () => Number.parseFloat((newOpenValue.replace(/\D/g, '') || '0')) / 100,
    [newOpenValue]
  )
  const parsedInstallments = useMemo(
    () => Math.max(1, Number.parseInt(newInstallments || '1', 10) || 1),
    [newInstallments]
  )
  const previewInstallmentValue = useMemo(
    () => parsedInstallments > 0 ? parsedOpenValue / parsedInstallments : parsedOpenValue,
    [parsedInstallments, parsedOpenValue]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!dueDate) {
      toast.error('Informe a data da primeira parcela.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/professor/contratos/renegociar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          alunoId,
          newOpenValue: parsedOpenValue,
          newInstallments: parsedInstallments,
          firstDueDate: dueDate,
          paymentMethod,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível concluir a renegociação.')
      }

      toast.success('Renegociação registrada com sucesso.')
      router.push(`/professor/alunos/${alunoId}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Falha ao renegociar saldo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest">Aditivo financeiro</h4>
          <p className="text-amber-800/80 text-sm font-medium leading-relaxed">
            Esta operação preserva o histórico já pago e recria apenas as parcelas em aberto. O contrato original continua como referência, mas o saldo restante passa a seguir este novo acordo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-[2rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Já pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(paidValue)}</p>
            <p className="text-xs font-medium text-slate-400 mt-2">Esse valor é mantido sem alterações.</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-[2rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo atual em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(currentOpenValue)}</p>
            <p className="text-xs font-medium text-slate-400 mt-2">
              {currentOpenInstallments} parcela(s) aberta(s), a partir de {formatDateOnly(firstOpenDueDate)}.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-blue-50 shadow-xl shadow-blue-100/40 rounded-[2rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-500">Novo cenário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-700 tracking-tight">{formatCurrency(parsedOpenValue)}</p>
            <p className="text-xs font-medium text-blue-600/80 mt-2">
              {parsedInstallments} parcela(s) de aproximadamente {formatCurrency(previewInstallmentValue || 0)}.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none overflow-hidden bg-white shadow-2xl shadow-blue-900/10 rounded-[2.5rem]">
        <div className="lms-gradient h-2" />
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5" />
            </div>
            Renegociação de Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1">
                  Novo saldo em aberto
                </Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  value={newOpenValue}
                  onChange={(e) => setNewOpenValue(maskCurrency(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1">
                  Novo número de parcelas
                </Label>
                <Select
                  value={newInstallments}
                  onChange={(e) => setNewInstallments(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((option) => (
                    <option key={option} value={String(option)}>
                      {option === 1 ? '1x (à vista)' : `${option}x parcelado`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Primeira nova parcela
                </Label>
                <Input
                  type="date"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Forma de pagamento
                </Label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                >
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="boleto">Boleto</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Observações do aditivo
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-200 focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="Ex.: ajuste de cronograma, concessão comercial, mudança temporária de frequência..."
              />
            </div>

            <Button
              type="submit"
              className="w-full h-16 rounded-[2rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Aplicando aditivo...' : 'Concluir renegociação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
