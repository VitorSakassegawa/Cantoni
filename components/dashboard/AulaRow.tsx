'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { Aula } from '@/lib/types'
import { Video, RotateCcw, X, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cancelarAula, remarcarAula } from '@/lib/actions/aulas'
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

interface Props {
  aula: Aula
  index: number
  isProfessor?: boolean
}

const STATUS_BADGE: Record<string, any> = {
  agendada: 'secondary',
  confirmada: 'default',
  dada: 'success',
  cancelada: 'outline',
  remarcada: 'warning',
}

export default function AulaRow({ aula, index, isProfessor }: Props) {
  const [status, setStatus] = useState(aula.status)
  const [loading, setLoading] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [novaData, setNovaData] = useState('')

  const canCancel = ['agendada', 'confirmada'].includes(status)
  const canRemark = ['agendada', 'confirmada', 'cancelada'].includes(status)

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await cancelarAula(aula.id)
      if (res.success) {
        setStatus(res.status as any)
        toast.success(res.status === 'cancelada' ? 'Aula cancelada!' : 'Aula contabilizada como dada.')
        setShowCancelModal(false)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar aula')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemark() {
    if (!novaData) return toast.error('Selecione uma data e hora')
    setLoading(true)
    try {
      const res = await remarcarAula(aula.id, novaData)
      if (res.success) {
        setStatus('remarcada')
        toast.success('Aula remarcada com sucesso!')
        setShowRemarkModal(false)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remarcar aula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors group">
        <td className="py-4 text-gray-400 text-xs pl-2">{index}</td>
        <td className="py-4 font-medium text-sm">{formatDateTime(aula.data_hora)}</td>
        <td className="py-4">
          <Badge variant={STATUS_BADGE[status] || 'outline'} className="capitalize">
            {status}
          </Badge>
        </td>
        <td className="py-4">
          {aula.meet_link ? (
            <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-900 hover:text-blue-700 font-medium text-xs transition-colors">
              <Video className="w-3.5 h-3.5" /> Google Meet
            </a>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="py-4 text-xs text-gray-500 max-w-[200px] truncate">
          {aula.homework || <span className="text-gray-300">Nenhuma</span>}
          {aula.homework && (
            <span className={`ml-1.5 ${aula.homework_completed ? 'text-green-600' : 'text-yellow-600'}`}>
              {aula.homework_completed ? '✓' : '⏳'}
            </span>
          )}
        </td>
        <td className="py-4 pr-2">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {canRemark && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-900" onClick={() => setShowRemarkModal(true)} title="Remarcar">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            {canCancel && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowCancelModal(true)} title="Cancelar">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Modal de Remarcação */}
      <Dialog open={showRemarkModal} onOpenChange={setShowRemarkModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remarcar Aula</DialogTitle>
            <DialogDescription>
              Escolha uma nova data e hora para esta aula. Verifique a disponibilidade do professor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="datetime">Nova Data e Hora</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-500">
              * Sujeito ao limite de remarcações mensais do seu plano.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemarkModal(false)}>Cancelar</Button>
            <Button onClick={handleRemark} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Aula</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta aula?<br/>
              <strong>Atenção:</strong> Cancelamentos com menos de 2 horas de antecedência serão contabilizados como aula dada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

