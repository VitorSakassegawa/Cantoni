'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { updateLessonHomework } from '@/lib/actions/homework'
import { concluirAula } from '@/lib/actions/aulas'
import { enviarResumoAI, getAIAnalysisV2 } from '@/lib/actions/ai-summary'
import {
  BookOpen,
  Link as LinkIcon,
  Video,
  CheckCircle2,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { LessonAnalysisResult, TimelineAula } from '@/lib/dashboard-types'

type HomeworkType = 'regular' | 'esl_brains' | 'evolve'

type LessonModalData = TimelineAula & {
  homework_due_date?: string | null
  class_notes?: string | null
}

type LessonFormData = {
  homework: string
  homework_type: HomeworkType
  homework_link: string
  homework_due_date: string
  meet_link: string
  has_homework: boolean
  class_notes: string
}

interface Props {
  aula: LessonModalData
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function getReadableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export default function ManageAulaModal({ aula, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [formData, setFormData] = useState<LessonFormData>({
    homework: aula.homework || '',
    homework_type: aula.homework_type || 'regular',
    homework_link: aula.homework_link || '',
    homework_due_date: aula.homework_due_date ? aula.homework_due_date.split('T')[0] : '',
    meet_link: aula.meet_link || '',
    has_homework: aula.has_homework ?? true,
    class_notes: aula.class_notes || '',
  })
  const [aiResult, setAiResult] = useState<LessonAnalysisResult | null>(null)
  const [editedSummaryPt, setEditedSummaryPt] = useState('')
  const [editedSummaryEn, setEditedSummaryEn] = useState('')

  const homeworkHint = useMemo(() => {
    if (!formData.has_homework) return 'Esta aula ficará registrada sem tarefa.'
    if (formData.homework_type === 'evolve') return 'Inclua o link do Cambridge One quando houver workbook.'
    if (formData.homework_type === 'esl_brains') return 'Você pode complementar com um anexo ou imagem da atividade.'
    return 'Use este campo para orientar claramente o aluno sobre o que precisa ser feito.'
  }, [formData.has_homework, formData.homework_type])

  async function handleSave() {
    setLoading(true)
    try {
      const { success } = await updateLessonHomework(aula.id, formData)
      if (success) {
        toast.success('Aula atualizada!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(getReadableError(error, 'Erro ao atualizar aula.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleConcluir() {
    if (!window.confirm('Deseja marcar esta aula como concluída? Isso descontará 1 crédito do plano do aluno.')) {
      return
    }

    setCompleting(true)
    try {
      const { success } = await concluirAula(aula.id)
      if (success) {
        toast.success('Aula concluída com sucesso!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(getReadableError(error, 'Erro ao concluir aula.'))
    } finally {
      setCompleting(false)
    }
  }

  async function handleAI() {
    if (!formData.class_notes.trim()) return

    setSummarizing(true)
    try {
      const result = (await getAIAnalysisV2(aula.id, formData.class_notes)) as LessonAnalysisResult
      setAiResult(result)

      if (result.homework && result.homework !== 'Not defined') {
        setFormData((previous) => ({
          ...previous,
          homework: result.homework || previous.homework,
          has_homework: true,
        }))
      }

      if (result.due_date) {
        setFormData((previous) => ({ ...previous, homework_due_date: result.due_date || '' }))
      }

      setEditedSummaryPt(result.summary_pt)
      setEditedSummaryEn(result.summary_en)
      toast.success('Análise concluída! O resumo e o homework sugerido foram preparados.')
    } catch (error) {
      toast.error(getReadableError(error, 'Ocorreu um erro na análise de IA.'))
    } finally {
      setSummarizing(false)
    }
  }

  async function handleSendSummary() {
    if (!aiResult) return

    setSummarizing(true)
    try {
      const { success, error } = await enviarResumoAI(
        aula.id,
        { pt: editedSummaryPt, en: editedSummaryEn },
        aiResult.vocabulary
      )

      if (!success) {
        toast.error(error || 'Erro ao enviar resumo.')
        return
      }

      toast.success('Resumo enviado com sucesso para o aluno!')
      setAiResult(null)
    } catch (error) {
      toast.error(getReadableError(error, 'Erro ao processar o envio do resumo.'))
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[85vh] bg-white/95 backdrop-blur-xl">
        <div className="bg-blue-600 h-2 w-full shrink-0" />
        <div className="p-6 sm:p-10 space-y-8 overflow-y-auto overflow-x-hidden relative">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <BookOpen className="w-5 h-5" />
              </div>
              Gerenciar aula
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-base">
              Organize links, conteúdo e tarefas desta aula antes de compartilhar com o aluno.
            </DialogDescription>
          </DialogHeader>

          {aula.status !== 'dada' && aula.status !== 'finalizado' ? (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between gap-4 group animate-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    A aula já aconteceu?
                  </p>
                  <p className="text-xs font-bold text-emerald-800/70">
                    Marque como concluída para atualizar os créditos do aluno.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => void handleConcluir()}
                disabled={completing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                {completing ? 'Processando...' : 'Concluir aula'}
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 py-2">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                Link do Google Meet
              </Label>
              <div className="relative group">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <Input
                  className="h-12 pl-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-blue-500 font-bold"
                  value={formData.meet_link}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, meet_link: event.target.value }))
                  }
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            <div className="space-y-3 p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 pl-1">
                  Notas da aula / pontos-chave
                </Label>
                <Badge className="bg-indigo-600 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> IA pronta
                </Badge>
              </div>
              <Textarea
                className="min-h-[120px] rounded-xl border-indigo-100 bg-white focus:ring-indigo-500 font-medium text-sm placeholder:text-slate-300"
                value={formData.class_notes}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, class_notes: event.target.value }))
                }
                placeholder="O que foi discutido hoje? Tópicos principais, erros comuns, novas palavras..."
              />
              <div className="flex justify-end pt-2 gap-2">
                {aiResult ? (
                  <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          Resumo em português
                        </Label>
                        <Textarea
                          className="min-h-[200px] text-xs font-medium leading-relaxed rounded-xl border-indigo-100"
                          value={editedSummaryPt}
                          onChange={(event) => setEditedSummaryPt(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          English summary
                        </Label>
                        <Textarea
                          className="min-h-[200px] text-xs font-medium leading-relaxed rounded-xl border-indigo-100"
                          value={editedSummaryEn}
                          onChange={(event) => setEditedSummaryEn(event.target.value)}
                        />
                      </div>
                    </div>

                    {aiResult.vocabulary.length > 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Vocabulário extraído
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.vocabulary.map((entry) => (
                            <Badge
                              key={`${entry.word}-${entry.translation}`}
                              variant="outline"
                              className="bg-white text-slate-600 border-slate-200 font-bold text-[10px] py-1"
                            >
                              {entry.word} <span className="mx-1 opacity-40">→</span> {entry.translation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAiResult(null)}
                        className="text-[9px] font-black uppercase tracking-widest h-9 rounded-lg"
                      >
                        Descartar
                      </Button>
                      <Button
                        onClick={() => void handleSendSummary()}
                        disabled={summarizing || loading}
                        className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest h-9 rounded-lg gap-2 shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-all"
                      >
                        {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {summarizing ? 'Enviando...' : 'Revisado: enviar resumo'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => void handleAI()}
                    disabled={!formData.class_notes.trim() || summarizing || loading}
                    className="bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest h-9 rounded-lg gap-2 shadow-md shadow-indigo-600/10 hover:bg-indigo-700 transition-all"
                  >
                    {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Analisar aula com IA
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                    Tarefa / homework
                  </Label>
                  <p className="text-[10px] font-bold text-slate-400/70 pl-1 uppercase tracking-tight">
                    Esta aula terá tarefa de casa?
                  </p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                  <button
                    onClick={() => setFormData((previous) => ({ ...previous, has_homework: true }))}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.has_homework
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setFormData((previous) => ({ ...previous, has_homework: false }))}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      !formData.has_homework
                        ? 'bg-slate-200 text-slate-700'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-[11px] font-medium leading-snug text-slate-500">{homeworkHint}</p>
              </div>

              {formData.has_homework ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Textarea
                    className="min-h-[100px] rounded-xl border-slate-100 bg-white focus:ring-blue-500 font-medium"
                    value={formData.homework}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, homework: event.target.value }))
                    }
                    placeholder="Ex.: Ler o capítulo 3 e fazer os exercícios 1 a 4."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                        Tipo de tarefa
                      </Label>
                      <select
                        value={formData.homework_type}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            homework_type: event.target.value as HomeworkType,
                          }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-100 bg-white font-bold text-xs px-4"
                      >
                        <option value="regular">Regular / LMS</option>
                        <option value="esl_brains">ESL Brains (upload de anexo)</option>
                        <option value="evolve">Cambridge Evolve (workbook)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                        Data de entrega
                      </Label>
                      <Input
                        type="date"
                        className="h-12 rounded-xl border-slate-100 bg-white font-bold text-xs"
                        value={formData.homework_due_date}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            homework_due_date: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {formData.homework_type === 'evolve' ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 pl-1">
                        Link do Cambridge workbook
                      </Label>
                      <div className="relative group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <Input
                          className="h-12 pl-12 rounded-xl border-blue-100 bg-blue-50/30 focus:ring-blue-500 font-bold text-xs"
                          value={formData.homework_link}
                          onChange={(event) =>
                            setFormData((previous) => ({
                              ...previous,
                              homework_link: event.target.value,
                            }))
                          }
                          placeholder="https://www.cambridgeone.org/..."
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <Button
              variant="ghost"
              className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5]"
              onClick={() => void handleSave()}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
