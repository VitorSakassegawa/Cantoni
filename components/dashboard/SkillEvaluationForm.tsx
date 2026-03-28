'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { salvarAvaliacao } from '@/lib/actions/avaliacoes'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

interface SkillEvaluationFormProps {
  alunoId: string
  initialData?: {
    speaking: number
    listening: number
    reading: number
    writing: number
  }
}

export default function SkillEvaluationForm({ alunoId, initialData }: SkillEvaluationFormProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const speaking = Number(formData.get('speaking'))
    const listening = Number(formData.get('listening'))
    const reading = Number(formData.get('reading'))
    const writing = Number(formData.get('writing'))

    try {
      await salvarAvaliacao(alunoId, speaking, listening, reading, writing)
      toast.success('Avaliação salva com sucesso!')
    } catch {
      toast.error('Erro ao salvar avaliação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Speaking (0-10)</label>
          <Input name="speaking" type="number" min="0" max="10" defaultValue={initialData?.speaking || 0} required className="h-10 bg-slate-50 border-none rounded-xl font-bold" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Listening (0-10)</label>
          <Input name="listening" type="number" min="0" max="10" defaultValue={initialData?.listening || 0} required className="h-10 bg-slate-50 border-none rounded-xl font-bold" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reading (0-10)</label>
          <Input name="reading" type="number" min="0" max="10" defaultValue={initialData?.reading || 0} required className="h-10 bg-slate-50 border-none rounded-xl font-bold" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Writing (0-10)</label>
          <Input name="writing" type="number" min="0" max="10" defaultValue={initialData?.writing || 0} required className="h-10 bg-slate-50 border-none rounded-xl font-bold" />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full h-10 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
        {loading ? 'Salvando...' : 'Atualizar Radar'}
        <Check className="w-3 h-3" />
      </Button>
    </form>
  )
}
