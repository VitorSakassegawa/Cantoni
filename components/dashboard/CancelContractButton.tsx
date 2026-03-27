'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Calendar, CreditCard, FileWarning, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  calculateCancellationSummary,
  cancellationReasonOptions,
  type CancellationCreditAction,
  type CancellationLessonAction,
  type CancellationOutstandingAction,
  type CancellationReasonCode,
} from '@/lib/contract-cancellation'
import { formatCurrency, formatDateOnly } from '@/lib/utils'

type CancelContractButtonProps = {
  contractId: number
  studentId: string
  studentName: string
  contractStatus: string
  contractValue: number
  totalLessons: number
  completedLessons: number
  futureLessons: number
  paidAmount: number
  openAmount: number
  contractEndDate: string
}

export default function CancelContractButton(props: CancelContractButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode>('schedule_conflict')
  const [reasonDetails, setReasonDetails] = useState('')
  const [notes, setNotes] = useState('')
  const [lessonAction, setLessonAction] = useState<CancellationLessonAction>('auto_cancel_future')
  const [outstandingAction, setOutstandingAction] =
    useState<CancellationOutstandingAction>('keep_open_balance')
  const [creditAction, setCreditAction] = useState<CancellationCreditAction>('no_credit')

  const summary = useMemo(
    () =>
      calculateCancellationSummary({
        contractValue: props.contractValue,
        totalLessons: props.totalLessons,
        paidAmount: props.paidAmount,
        openAmount: props.openAmount,
        completedLessons: props.completedLessons,
        futureLessons: props.futureLessons,
      }),
    [props.completedLessons, props.contractValue, props.futureLessons, props.openAmount, props.paidAmount, props.totalLessons]
  )

  const reasonDescription =
    cancellationReasonOptions.find((option) => option.value === reasonCode)?.description || ''

  async function handleSubmit() {
    setLoading(true)
    try {
      const response = await fetch('/api/professor/contratos/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: props.contractId,
          studentId: props.studentId,
          effectiveDate,
          reasonCode,
          reasonDetails,
          notes,
          lessonAction,
          outstandingAction,
          creditAction,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel cancelar o contrato.')
      }

      if (data.emailWarning) {
        toast.warning(data.emailWarning)
      }
      toast.success('Contrato cancelado com sucesso.')
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Falha ao cancelar contrato.')
    } finally {
      setLoading(false)
    }
  }

  if (props.contractStatus === 'cancelado') {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className="h-10 rounded-xl border-rose-200 px-4 text-[10px] font-black uppercase tracking-widest text-rose-400"
      >
        Contrato cancelado
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 rounded-xl border-rose-200 bg-rose-50 px-4 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100"
      >
        Cancelar contrato
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl rounded-[2rem] border-none bg-white p-0 shadow-2xl">
          <div className="h-2 rounded-t-[2rem] bg-rose-500" />
          <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Ban className="h-5 w-5" />
                </div>
                Cancelamento assistido
              </DialogTitle>
              <DialogDescription className="text-sm font-medium leading-relaxed text-slate-500">
                Revise o impacto acadêmico e financeiro do contrato de {props.studentName} antes de confirmar o cancelamento.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pago</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(summary.paidAmount)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consumido</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(summary.consumedValue)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Saldo em aberto</p>
                <p className="mt-2 text-2xl font-black text-amber-700">{formatCurrency(summary.openAmount)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Credito estimado</p>
                <p className="mt-2 text-2xl font-black text-blue-700">{formatCurrency(summary.creditValue)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas concluidas</p>
                <p className="mt-2 text-xl font-black text-slate-900">{summary.completedLessons}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas futuras</p>
                <p className="mt-2 text-xl font-black text-slate-900">{summary.futureLessons}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data final atual</p>
                <p className="mt-2 text-xl font-black text-slate-900">{formatDateOnly(props.contractEndDate)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-sm font-medium leading-relaxed text-rose-900/80">
                  O cancelamento encerra o vínculo, interrompe novas aulas e exige registro do motivo e da decisão financeira. Use esta ação apenas quando o contrato realmente precisar ser encerrado.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Data efetiva</Label>
                <Input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="h-12 rounded-xl border-slate-200 font-bold" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Motivo do cancelamento</Label>
                <Select value={reasonCode} onChange={(event) => setReasonCode(event.target.value as CancellationReasonCode)} className="h-12 rounded-xl border-slate-200 font-bold">
                  {cancellationReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs font-medium text-slate-500">{reasonDescription}</p>
              </div>
            </div>

            {reasonCode === 'other' ? (
              <div className="mt-6 space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Descreva o motivo</Label>
                <Textarea
                  value={reasonDetails}
                  onChange={(event) => setReasonDetails(event.target.value)}
                  rows={3}
                  className="rounded-[1.25rem] border-slate-200 px-4 py-3"
                  placeholder="Explique objetivamente o motivo do encerramento."
                />
              </div>
            ) : null}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Aulas futuras</p>
                </div>
                <Select
                  value={lessonAction}
                  onChange={(event) => setLessonAction(event.target.value as CancellationLessonAction)}
                  className="mt-4 h-12 rounded-xl border-slate-200 font-bold"
                >
                  <option value="auto_cancel_future">Cancelar aulas futuras automaticamente</option>
                  <option value="keep_future_for_review">Manter aulas futuras para revisão manual</option>
                </Select>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Recomendado: cancelar automaticamente os {summary.futureLessons} agendamentos futuros para não deixar Meet ativo no calendário.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Saldo em aberto</p>
                </div>
                <Select
                  value={outstandingAction}
                  onChange={(event) => setOutstandingAction(event.target.value as CancellationOutstandingAction)}
                  className="mt-4 h-12 rounded-xl border-slate-200 font-bold"
                  disabled={summary.openAmount <= 0}
                >
                  <option value="keep_open_balance">Manter saldo em aberto</option>
                  <option value="waive_open_balance">Perdoar saldo em aberto</option>
                </Select>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {summary.openAmount > 0
                    ? 'Escolha se as parcelas ainda não pagas permanecem como dívida ou se serão baixadas.'
                    : 'Nao ha parcelas em aberto para este contrato.'}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Credito do aluno</p>
              </div>
              <Select
                value={creditAction}
                onChange={(event) => setCreditAction(event.target.value as CancellationCreditAction)}
                className="mt-4 h-12 rounded-xl border-slate-200 font-bold"
                disabled={summary.creditValue <= 0}
              >
                <option value="no_credit">Sem acao financeira adicional</option>
                <option value="refund_manual">Registrar que havera reembolso manual</option>
                <option value="convert_to_credit">Registrar que o valor vira credito administrativo</option>
              </Select>
              <p className="mt-3 text-xs font-medium text-slate-500">
                {summary.creditValue > 0
                  ? 'Use isto para documentar o destino do valor ja pago e ainda nao consumido.'
                  : 'Nao ha credito estimado a favor do aluno neste cancelamento.'}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Observacoes internas</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="rounded-[1.25rem] border-slate-200 px-4 py-3"
                placeholder="Ex.: combinado com a familia, prazo de reembolso, acao comercial ou pontos de acompanhamento."
              />
            </div>

            <DialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-xl border-slate-200 px-5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="h-11 rounded-xl bg-rose-600 px-5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-700"
              >
                {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
