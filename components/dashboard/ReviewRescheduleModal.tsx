'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { remarcarAula, rejeitarRemarcacao } from '@/lib/actions/aulas'
import { toast } from 'sonner'

export interface RescheduleModalLesson {
  id: number
  data_hora: string
  data_hora_solicitada?: string | null
}

interface Props {
  aula: RescheduleModalLesson
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onSuggestAlternative?: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function ReviewRescheduleModal({ aula, open, onOpenChange, onSuccess, onSuggestAlternative }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [justificativa, setJustificativa] = useState('')

  async function handleApprove() {
    if (!aula.data_hora_solicitada) return
    
    setLoading(true)
    try {
      const res = await remarcarAula(aula.id, aula.data_hora_solicitada)
      if (res.success) {
        toast.success('Aula remarcada com sucesso!')
        onOpenChange(false)
        if (onSuccess) onSuccess()
        router.refresh()
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao processar remarcação'))
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await rejeitarRemarcacao(aula.id, justificativa)
      toast.success('Solicitação rejeitada. O aluno será notificado.')
      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao rejeitar remarcação'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
        <div className="bg-amber-500 h-2 w-full" />
        <div className="p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Analisar Remarcação</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              O aluno sugeriu uma nova data e horário. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex flex-col items-center text-center gap-2">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nova Data Sugerida</p>
              <p className="text-xl font-black text-slate-900">{aula?.data_hora_solicitada ? formatDateTime(aula.data_hora_solicitada) : '—'}</p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2">
                <Clock className="w-3.5 h-3.5" />
                Aula Original: {aula ? formatDateTime(aula.data_hora) : '—'}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Justificativa (em caso de rejeição)</Label>
              <textarea 
                className="w-full h-24 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-slate-900 outline-none text-xs resize-none"
                placeholder="Explique porque não pode aceitar este horário..."
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:flex-row">
            <Button 
              variant="ghost" 
              className="col-span-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-600 hover:bg-red-50 hover:text-red-700" 
              onClick={handleReject}
              disabled={loading}
            >
              Rejeitar
            </Button>
            <Button 
              className="col-span-1 h-12 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700" 
              onClick={handleApprove} 
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Aprovar Data'}
            </Button>
            {onSuggestAlternative && (
              <Button 
                variant="outline"
                className="col-span-2 h-12 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={onSuggestAlternative}
              >
                Escolher outro horário
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}



