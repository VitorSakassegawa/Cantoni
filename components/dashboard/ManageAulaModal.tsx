'use client'

import { useState } from 'react'
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
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { updateLessonHomework } from '@/lib/actions/homework'
import { concluirAula } from '@/lib/actions/aulas'
import { BookOpen, Link as LinkIcon, Video, CheckCircle2 } from 'lucide-react'

interface Props {
  aula: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ManageAulaModal({ aula, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [formData, setFormData] = useState({
    homework: aula.homework || '',
    homework_type: aula.homework_type || 'regular',
    homework_link: aula.homework_link || '',
    homework_due_date: aula.homework_due_date ? aula.homework_due_date.split('T')[0] : '',
    meet_link: aula.meet_link || '',
  })

  async function handleSave() {
    setLoading(true)
    try {
      const { success } = await updateLessonHomework(aula.id, formData)
      if (success) {
        toast.success('Aula atualizada!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar aula')
    } finally {
      setLoading(false)
    }
  }

  async function handleConcluir() {
    if (!confirm('Deseja marcar esta aula como concluída? Isso irá descontar 1 crédito do plano do aluno.')) return
    setCompleting(true)
    try {
      const { success } = await concluirAula(aula.id)
      if (success) {
        toast.success('Aula concluída com sucesso!')
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao concluir aula')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
        <div className="bg-blue-600 h-2 w-full" />
        <div className="p-10 space-y-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <BookOpen className="w-5 h-5" />
              </div>
              Gerenciar Aula
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-base">
              Defina o conteúdo, links e tarefas para esta lesson.
            </DialogDescription>
          </DialogHeader>

          {aula.status !== 'dada' && (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between group animate-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">A aula já aconteceu?</p>
                  <p className="text-xs font-bold text-emerald-800/70">Marque como dada para atualizar os créditos do aluno.</p>
                </div>
              </div>
              <Button 
                onClick={handleConcluir} 
                disabled={completing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                {completing ? 'Processando...' : 'Concluir Aula'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            <div className="md:col-span-2 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Link do Google Meet</Label>
              <div className="relative group">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <Input
                  className="h-12 pl-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-blue-500 font-bold"
                  value={formData.meet_link}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meet_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tarefa / Homework</Label>
              <Textarea
                className="min-h-[100px] rounded-xl border-slate-100 bg-slate-50/50 focus:ring-blue-500 font-medium"
                value={formData.homework}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, homework: e.target.value })}
                placeholder="Ex: Ler capítulo 3 e fazer exercícios..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tipo de Tarefa</Label>
              <Select 
                value={formData.homework_type} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, homework_type: e.target.value as any })}
                className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold"
              >
                <option value="regular">Regular / LMS</option>
                <option value="esl_brains">ESL Brains (Upload de Anexo)</option>
                <option value="evolve">Cambridge Evolve (Workbook)</option>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Data de Entrega / Due Date</Label>
              <Input
                type="date"
                className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold"
                value={formData.homework_due_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, homework_due_date: e.target.value })}
              />
            </div>

            {formData.homework_type === 'evolve' && (
              <div className="md:col-span-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1 text-blue-600">Link Cambridge Workbook</Label>
                <div className="relative group">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    className="h-12 pl-12 rounded-xl border-blue-100 bg-blue-50/30 focus:ring-blue-500 font-bold"
                    value={formData.homework_link}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, homework_link: e.target.value })}
                    placeholder="https://www.cambridgeone.org/..."
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5]" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
