'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AulasTimeline from '@/components/dashboard/AulasTimeline'
import { formatDateTime, formatDateOnly } from '@/lib/utils'

import type { Aula } from '@/lib/types'
import { Video, RotateCcw, X, AlertCircle, Settings2, Upload, FileCheck, ExternalLink, ImageIcon, Clock } from 'lucide-react'

import ManageAulaModal from './ManageAulaModal'
import { uploadHomeworkImage } from '@/lib/actions/homework'


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
  studentName?: string
}

const STATUS_BADGE: Record<string, any> = {
  agendada: 'secondary',
  confirmada: 'default',
  dada: 'success',
  cancelada: 'outline',
  remarcada: 'warning',
  pendente_remarcacao: 'warning',
}

export default function AulaRow({ aula, index, isProfessor, studentName }: Props) {
  const [status, setStatus] = useState<any>(aula.status)
  const [loading, setLoading] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [novaData, setNovaData] = useState('')
  const [uploading, setUploading] = useState(false)


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
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadHomeworkImage(aula.id, file)
      toast.success('Exercício enviado com sucesso!')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload')
    } finally {
      setUploading(false)
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
        <td className="py-4 text-xs text-gray-500 max-w-[250px] font-medium">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {aula.homework || <span className="text-gray-300 italic">Aula sem conteúdo registrado</span>}
              {aula.homework && (
                <span className={`shrink-0 ${aula.homework_completed ? 'text-green-600' : 'text-amber-600'}`}>
                  {aula.homework_completed ? <FileCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </span>
              )}
            </div>
            
            {studentName && (
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-tight">Aluno</span>
                <span className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                  {studentName}
                </span>
              </div>
            )}
            
            <div className="mt-1 flex items-center gap-2">
              {(aula as any).homework_type && (
                <Badge variant="outline" className={`text-[8px] font-black tracking-tighter uppercase ${
                  (aula as any).homework_type === 'esl_brains' ? 'border-blue-100 text-blue-600' : 
                  (aula as any).homework_type === 'evolve' ? 'border-indigo-100 text-indigo-600' : 
                  'border-slate-100 text-slate-500'
                }`}>
                  {(aula as any).homework_type.replace('_', ' ')}
                </Badge>
              )}
              
              {(aula as any).homework_image_url ? (
                <a href={(aula as any).homework_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-blue-500 hover:underline font-bold">
                  <ImageIcon className="w-3 h-3" /> Ver Anexo
                </a>
              ) : (
                <label className="flex items-center gap-1 text-[9px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold">
                  <Upload className="w-3 h-3" /> 
                  {uploading ? 'Enviando...' : isProfessor ? 'Subir Print' : 'Anexar Print'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {(aula as any).homework_type === 'evolve' && (aula as any).homework_link && (
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] font-black tracking-tighter border-indigo-100 text-indigo-600">EVOLVE WORKBOOK</Badge>
                  <a href={(aula as any).homework_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-indigo-500 hover:underline font-bold">
                    <ExternalLink className="w-3 h-3" /> Abrir Cambridge One
                  </a>
                </div>
                {(aula as any).homework_due_date && (
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                    Entrega até: {formatDateOnly((aula as any).homework_due_date)}
                  </p>
                )}
              </div>
            )}
          </div>
        </td>

        <td className="py-4 pr-2">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {isProfessor && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => setShowManageModal(true)} title="Gerenciar Aula">
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            )}
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
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
          <div className="bg-blue-600 h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Remarcar Aula</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base">
                {isProfessor 
                  ? "Confirme a nova data solicitada pelo aluno ou sugira um novo horário." 
                  : "Escolha uma nova data e hora. Sua solicitação será analisada pelo professor."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8 py-4">
              <div className="space-y-4">
                <Label htmlFor="datetime" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Nova Data e Hora Sugerida</Label>
                <div className="relative group">
                  <Input
                    id="datetime"
                    type="datetime-local"
                    className="h-16 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-lg px-6 transition-all"
                    value={novaData}
                    onChange={e => setNovaData(e.target.value)}
                  />
                </div>
              </div>
              
              {!isProfessor && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                  <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100/50 text-blue-900 text-sm leading-relaxed relative overflow-hidden group/card shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/card:scale-110 transition-transform">
                      <RotateCcw className="w-12 h-12" />
                    </div>
                    <p className="font-black flex items-center gap-2 mb-2 uppercase tracking-widest text-[10px] text-blue-600">
                      Regras de Remarcação
                    </p>
                    <p className="font-medium">
                      {regraTexto} Conforme o contrato semestral (quem faz {aulasSemana} aula/semana).
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-500 text-[11px] leading-snug font-medium italic">
                    "Nota: O professor irá validar a solicitação de acordo com a disponibilidade da agenda acadêmica."
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex-1" onClick={() => setShowRemarkModal(false)}>Voltar</Button>
              <Button className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5]" onClick={handleRemark} disabled={loading}>
                {loading ? 'Processando...' : isProfessor ? 'Confirmar Remarcação' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
          <div className="bg-red-600 h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Cancelar Aula</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base">
                Tem certeza que deseja cancelar esta aula? Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="p-8 rounded-[2rem] bg-orange-50/50 border border-orange-100/50 text-orange-900 text-sm leading-relaxed relative overflow-hidden group/cancel">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/cancel:rotate-12 transition-transform">
                <AlertCircle className="w-12 h-12" />
              </div>
              <p className="font-black uppercase tracking-widest text-[10px] text-orange-600 mb-2">Aviso de Política</p>
              <p className="font-medium">
                Cancelamentos com menos de <span className="text-red-600 font-black underline underline-offset-4 Decoration-2">2 horas</span> de antecedência serão contabilizados como aula dada.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex-1" onClick={() => setShowCancelModal(false)}>Voltar</Button>
              <Button variant="destructive" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5]" onClick={handleCancel} disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ManageAulaModal
        aula={aula}
        open={showManageModal}
        onOpenChange={setShowManageModal}
        onSuccess={() => window.location.reload()}
      />
    </>

  )
}
