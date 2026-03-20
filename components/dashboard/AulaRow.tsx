'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { Aula } from '@/lib/types'
import { Video, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { cancelarAula, remarcarAula, solicitarRemarcacao } from '@/lib/actions/aulas'
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
  pendente_remarcacao: 'warning',
}

export default function AulaRow({ aula, index, isProfessor }: Props) {
  const [status, setStatus] = useState<any>(aula.status)
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
      if (isProfessor) {
        const res = await remarcarAula(aula.id, novaData)
        if (res.success) {
          setStatus('remarcada')
          toast.success('Aula remarcada com sucesso!')
          setShowRemarkModal(false)
        }
      } else {
        const res = await solicitarRemarcacao(aula.id, novaData)
        if (res.success) {
          setStatus('pendente_remarcacao')
          toast.success('Solicitação de remarcação enviada ao professor!')
          setShowRemarkModal(false)
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar remarcação')
    } finally {
      setLoading(false)
    }
  }

  const aulasSemana = (aula as any).contratos?.planos?.aulas_semana || 1
  const regraTexto = aulasSemana === 1 
    ? "Você tem direito a 1 remarcação por mês."
    : `Você tem direito a ${aulasSemana} remarcações por mês.`

  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors group">
        <td className="py-4 text-gray-400 text-xs pl-2">{index}</td>
        <td className="py-4 font-medium text-sm">
          {formatDateTime(aula.data_hora)}
          {aula.data_hora_solicitada && status === 'pendente_remarcacao' && (
            <div className="text-[10px] text-amber-600 font-bold mt-1">
              Solicitado para: {formatDateTime(aula.data_hora_solicitada)}
            </div>
          )}
        </td>
        <td className="py-4">
          <Badge variant={STATUS_BADGE[status] || 'outline'} className="capitalize text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
            {status.replace('_', ' ')}
          </Badge>
        </td>
        <td className="py-4">
          {aula.meet_link ? (
            <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-900 hover:text-blue-700 font-bold text-xs transition-colors">
              <Video className="w-3.5 h-3.5" /> Google Meet
            </a>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="py-4 text-xs text-gray-500 max-w-[200px] truncate font-medium">
          {aula.homework || <span className="text-gray-300 italic">Aula sem conteúdo registrado</span>}
          {aula.homework && (
            <span className={`ml-1.5 ${aula.homework_completed ? 'text-green-600' : 'text-yellow-600'}`}>
              {aula.homework_completed ? '✓' : '⏳'}
            </span>
          )}
        </td>
        <td className="py-4 pr-2">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {canRemark && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-900 hover:bg-blue-50" onClick={() => setShowRemarkModal(true)} title="Remarcar">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            {canCancel && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowCancelModal(true)} title="Cancelar">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            {isProfessor && status === 'pendente_remarcacao' && (
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => {
                setNovaData(aula.data_hora_solicitada?.split('.')[0] || '')
                setShowRemarkModal(true)
              }}>
                Analisar
              </Button>
            )}
          </div>
        </td>
      </tr>

      <Dialog open={showRemarkModal} onOpenChange={setShowRemarkModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Remarcar Aula</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {isProfessor 
                ? "Confirme a nova data solicitada pelo aluno ou sugira um novo horário." 
                : "Escolha uma nova data e hora para esta aula. Sua solicitação será enviada para aprovação do professor."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="datetime" className="text-xs font-black uppercase tracking-widest text-slate-400">Nova Data e Hora Sugerida</Label>
              <Input
                id="datetime"
                type="datetime-local"
                className="h-12 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-500 font-bold"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
              />
            </div>
            
            {!isProfessor && (
              <div className="space-y-4">
                <div className="p-5 rounded-[1.5rem] bg-blue-50 border border-blue-100 text-blue-900 text-xs leading-relaxed">
                  <p className="font-bold flex items-center gap-2 mb-1 uppercase tracking-tight text-blue-700">
                    <RotateCcw className="w-3.5 h-3.5" /> Regras de Remarcação
                  </p>
                  {regraTexto} Conforme o contrato semestral, para quem faz {aulasSemana} aula(s) por semana.
                </div>
                
                <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-600 text-[11px] leading-relaxed italic">
                  "Nota: Mesmo após solicitada a remarcação, o professor irá avaliar e aceitar o horário de acordo com a disponibilidade da agenda. Agradecemos a compreensão!"
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400" onClick={() => setShowRemarkModal(false)}>Cancelar</Button>
            <Button className="h-12 px-8 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20" onClick={handleRemark} disabled={loading}>
              {loading ? 'Processando...' : isProfessor ? 'Confirmar Remarcação' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Cancelar Aula</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Tem certeza que deseja cancelar esta aula?<br/>
              <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-xs">
                <strong>Atenção:</strong> Cancelamentos com menos de <span className="font-black underline">2 horas</span> de antecedência serão automaticamente contabilizados como aula dada.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="ghost" className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400" onClick={() => setShowCancelModal(false)}>Voltar</Button>
            <Button variant="destructive" className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20" onClick={handleCancel} disabled={loading}>
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
