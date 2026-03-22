'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDateOnly } from '@/lib/utils'

import type { Aula } from '@/lib/types'
import { Video, RotateCcw, X, AlertCircle, Settings2, Upload, FileCheck, ExternalLink, Paperclip, Clock, ChevronDown, ChevronUp } from 'lucide-react'

import ManageAulaModal from './ManageAulaModal'
import RescheduleCalendar from './RescheduleCalendar'
import ReviewRescheduleModal from './ReviewRescheduleModal'
import { uploadHomeworkImage } from '@/lib/actions/homework'

import { toast } from 'sonner'
import { cancelarAula, remarcarAula, solicitarRemarcacao, rejeitarRemarcacao } from '@/lib/actions/aulas'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from "@/components/ui/select"
import { format } from 'date-fns'

interface Props {
  aula: Aula
  index: number
  isProfessor?: boolean
  studentName?: string
  showStudentName?: boolean
  showContractType?: boolean
}

const STATUS_BADGE: Record<string, any> = {
  agendada: 'secondary',
  confirmada: 'default',
  dada: 'success',
  finalizado: 'success',
  cancelada: 'outline',
  remarcada: 'warning',
  pendente_remarcacao: 'warning',
  pendente_remarcacao_rejeitada: 'destructive',
}

const HORARIOS_DISPONIVEIS = [
  '07:00' ,'08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
]

export default function AulaRow({ 
  aula, 
  index, 
  isProfessor, 
  studentName, 
  showStudentName = false, 
  showContractType = false 
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<any>(aula.status)
  const [dataHoraSolicitada, setDataHoraSolicitada] = useState<any>(aula.data_hora_solicitada)
  const [loading, setLoading] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('18:00')
  const [uploading, setUploading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    const aulaIdParam = searchParams.get('aulaId')
    if (aulaIdParam === aula.id.toString()) {
      if (status === 'pendente_remarcacao' && isProfessor && aula.data_hora_solicitada) {
        const d = new Date(aula.data_hora_solicitada)
        setSelectedDate(d)
        setSelectedTime(format(d, 'HH:mm'))
        setShowReviewModal(true)
      }
    }
  }, [searchParams, aula.id, status, isProfessor, aula.data_hora_solicitada])

  const canCancel = ['agendada', 'confirmada'].includes(status)
  const canRemark = ['agendada', 'confirmada', 'cancelada', 'pendente_remarcacao', 'pendente_remarcacao_rejeitada'].includes(status)

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
    if (!selectedDate) return toast.error('Selecione uma data no calendário')
    
    // Combining date and time
    const [hours, minutes] = selectedTime.split(':')
    const finalDate = new Date(selectedDate)
    finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    const novaDataStr = finalDate.toISOString()

    setLoading(true)
    try {
      if (isProfessor) {
        const res = await remarcarAula(aula.id, novaDataStr)
        if (res.success) {
          setStatus('remarcada')
          toast.success('Aula remarcada com sucesso!')
          setShowRemarkModal(false)
          router.refresh()
        }
      } else {
        const res = await solicitarRemarcacao(aula.id, novaDataStr)
        if (res.success) {
          setStatus('pendente_remarcacao')
          setDataHoraSolicitada(novaDataStr)
          toast.success('Solicitação de remarcação enviada ao professor!')
          setShowRemarkModal(false)
          router.refresh()
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
      toast.success('Anexo enviado com sucesso!')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition-all group border-b border-slate-50">
        <td className="py-6 text-slate-400 text-[10px] font-black pl-2 text-center w-8">{index}</td>
        <td className="py-6 font-bold text-slate-700 text-sm whitespace-nowrap">
          <div className="flex flex-col">
            <span>{formatDateTime(aula.data_hora)}</span>
            {status === 'pendente_remarcacao' && (
              <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">
                {dataHoraSolicitada && !formatDateTime(dataHoraSolicitada).includes('Não informada') ? (
                  <span className="text-amber-600">Solicitado p/: {formatDateTime(dataHoraSolicitada)}</span>
                ) : (
                  <span className="text-slate-400 italic font-bold">
                    {isProfessor ? "Aguardando aluno sugerir data" : "Por favor, sugira uma nova data"}
                  </span>
                )}
              </span>
            )}
            {status === 'pendente_remarcacao_rejeitada' && (
              <div className="mt-1 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tighter text-red-600">
                  Reserva Rejeitada
                </span>
                {aula.justificativa_professor && (
                  <span className="text-[10px] font-medium text-slate-500 bg-red-50/50 p-1 rounded-md border border-red-100/30 mt-0.5">
                    " {aula.justificativa_professor} "
                  </span>
                )}
              </div>
            )}
            {aula.motivo_remarcacao && (
              <div className="mt-1 flex flex-col gap-1">
                {(aula.motivo_remarcacao.includes('Conflito') || aula.motivo_remarcacao.includes('Férias') || aula.motivo_remarcacao.includes('Feriado')) && (
                  <Badge className="w-fit bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase px-1.5 py-0">
                    Abonada (S/ Limite)
                  </Badge>
                )}
                <span className={`text-[9px] italic ${
                  (aula.motivo_remarcacao.includes('Recesso') || aula.motivo_remarcacao.includes('Férias') || aula.motivo_remarcacao.includes('Feriado')) 
                    ? 'font-black text-blue-600' 
                    : 'font-medium text-slate-400'
                }`}>
                  {aula.motivo_remarcacao.replace(/\*\*/g, '')}
                </span>
              </div>
            )}
          </div>
        </td>
        <td className="py-6">
          <Badge variant={STATUS_BADGE[status] || 'outline'} className="capitalize text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 whitespace-nowrap rounded-lg">
            {status === 'dada' ? 'FINALIZADO' : status.replace('_', ' ')}
          </Badge>
        </td>
        <td className="py-6">
          {aula.meet_link ? (
            <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap group/meet">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center group-hover/meet:bg-blue-100 transition-colors">
                <Video className="w-3.5 h-3.5" />
              </div>
              Meet
            </a>
          ) : (
            <span className="text-slate-200">—</span>
          )}
        </td>
        <td className="py-6 text-xs text-slate-500 max-w-[300px]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className={`transition-all duration-300 relative ${!isExpanded && aula.homework && aula.homework.length > 80 ? 'max-h-[3.5rem] overflow-hidden' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {aula.has_homework === false ? (
                      <span className="text-slate-400 font-bold text-[11px] uppercase tracking-tight italic">Nenhuma tarefa para esta aula</span>
                    ) : aula.homework ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-600 font-medium text-[11px]">
                        {aula.homework}
                      </p>
                    ) : new Date(aula.data_hora) > new Date() ? (
                      <span className="text-blue-500/60 font-bold text-[10px] uppercase tracking-tight italic">Nenhuma lição enviada pelo professor para a próxima aula</span>
                    ) : (
                      <span className="text-slate-300 italic text-[11px]">Aula sem conteúdo registrado</span>
                    )}
                  </div>
                  {aula.homework && (
                    <div className={`shrink-0 mt-0.5 p-1 rounded-md ${aula.homework_completed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {aula.homework_completed ? <FileCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </div>
                  )}
                </div>
                {!isExpanded && aula.homework && aula.homework.length > 80 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                )}
              </div>
              
              {aula.homework && aula.homework.length > 80 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 flex items-center gap-0.5 transition-colors w-fit tracking-widest"
                >
                  {isExpanded ? (
                    <><ChevronUp className="w-3 h-3" /> Ver Menos</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Ver Tudo</>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {(aula as any).homework_type && (
                <Badge variant="outline" className={`text-[8px] font-black tracking-widest uppercase rounded-md border-0 ${
                  (aula as any).homework_type === 'esl_brains' ? 'bg-blue-50 text-blue-600' : 
                  (aula as any).homework_type === 'evolve' ? 'bg-indigo-50 text-indigo-600' : 
                  'bg-slate-50 text-slate-500'
                }`}>
                  {(aula as any).homework_type.replace('_', ' ')}
                </Badge>
              )}
              
              {(aula as any).homework_image_url ? (
                <a href={(aula as any).homework_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] text-blue-600 hover:text-blue-800 font-black uppercase tracking-widest bg-blue-50/50 px-2 py-1 rounded-md transition-all">
                  <Paperclip className="w-3 h-3" /> Ver Anexo
                </a>
              ) : (
                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 hover:text-blue-600 cursor-pointer font-black uppercase tracking-widest transition-all">
                  <Upload className="w-3 h-3" /> 
                  {uploading ? 'Enviando...' : isProfessor ? 'Subir Anexo' : 'Anexar Arquivo'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}

              {(aula as any).homework_type === 'evolve' && (aula as any).homework_link && (
                <div className="flex items-center gap-2">
                  <a href={(aula as any).homework_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest bg-indigo-50/50 px-2 py-1 rounded-md transition-all">
                    <ExternalLink className="w-3 h-3" /> Cambridge One
                  </a>
                </div>
              )}
            </div>
          </div>
        </td>

        {showContractType && (
          <td className="py-6 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
            {(aula as any).contratos 
              ? ((aula as any).contratos.tipo_contrato === 'ad-hoc' ? 'Personalizado' : 'Semestral')
              : '—'}
          </td>
        )}

        {showStudentName && (
          <td className="py-6 pr-4">
            {studentName && (
              <span className="text-sm font-black text-slate-900 truncate block max-w-[150px]">
                {studentName}
              </span>
            )}
          </td>
        )}

        <td className="py-6 pr-2">
          <div className="flex gap-1 justify-end transition-opacity">
            {isProfessor && (
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" onClick={() => setShowManageModal(true)} title="Gerenciar Aula">
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
            {isProfessor && status === 'pendente_remarcacao' && aula.data_hora_solicitada && !formatDateTime(aula.data_hora_solicitada).includes('Não informada') && (
              <Button size="sm" variant="outline" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl" onClick={() => {
                const d = new Date(aula.data_hora_solicitada!)
                setSelectedDate(d)
                setSelectedTime(format(d, 'HH:mm'))
                setShowReviewModal(true)
              }}>
                Analisar
              </Button>
            )}
            {canRemark && (status !== 'pendente_remarcacao' || !aula.data_hora_solicitada) && (
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50 transition-all" onClick={() => setShowRemarkModal(true)} title="Remarcar">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            {canCancel && (
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all" onClick={() => setShowCancelModal(true)} title="Cancelar">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      <Dialog open={showRemarkModal} onOpenChange={setShowRemarkModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
          <div className="bg-blue-600 h-2 w-full" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Remarcar Aula</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                {isProfessor 
                  ? "Selecione a nova data e horário para esta aula." 
                  : "Escolha um dia disponível no calendário e o horário desejado."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <RescheduleCalendar 
                  selectedDate={selectedDate} 
                  onDateSelect={setSelectedDate} 
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Horário Sugerido</Label>
                <Select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="h-12 rounded-2xl border-slate-100 bg-white font-bold px-6 outline-none ring-0">
                  {HORARIOS_DISPONIVEIS.map(h => (
                    <option key={h} value={h} className="font-bold text-slate-900">{h}h</option>
                  ))}
                </Select>
              </div>
              
              {!isProfessor && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 text-[11px] leading-snug font-medium text-blue-800">
                   Sua solicitação entrará como <span className="font-bold">pendente</span> até que o professor confirme a disponibilidade.
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button variant="ghost" className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50" onClick={() => setShowRemarkModal(false)}>Voltar</Button>
              <Button className="h-12 px-8 rounded-2xl lms-gradient text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20" onClick={handleRemark} disabled={loading || !selectedDate}>
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

      <ReviewRescheduleModal 
        aula={aula}
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        onSuggestAlternative={() => {
          setShowReviewModal(false)
          setShowRemarkModal(true)
        }}
      />

      <ManageAulaModal
        aula={aula}
        open={showManageModal}
        onOpenChange={setShowManageModal}
        onSuccess={() => window.location.reload()}
      />
    </>
  )
}
