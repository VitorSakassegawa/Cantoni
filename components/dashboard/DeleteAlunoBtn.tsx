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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface Props {
  alunoId: string
  alunoNome: string
}

export default function DeleteAlunoBtn({ alunoId, alunoNome }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

  const confirmed = confirmText.trim().toLowerCase() === alunoNome.trim().toLowerCase()

  async function handleDelete() {
    if (!confirmed) return
    setLoading(true)
    try {
      const res = await fetch('/api/professor/alunos/deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alunoId }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao deletar aluno')

      toast.success('Aluno deletado com sucesso!')
      router.push('/professor/alunos')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar aluno')
    } finally {
      setLoading(false)
      setOpen(false)
      setConfirmText('')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setConfirmText('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 px-6 rounded-2xl border-2 border-rose-100 text-rose-500 hover:bg-rose-50 font-black text-xs uppercase tracking-widest gap-2">
          <Trash2 className="w-4 h-4" />
          Deletar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl">
        <div className="bg-rose-500 h-2 w-full" />
        <div className="p-10 space-y-8">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-[2rem] bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-slate-900 tracking-tighter">
              Atenção: Perda Total de Dados
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 font-medium leading-relaxed">
              Você está prestes a apagar <strong className="font-black text-slate-900">{alunoNome}</strong> permanentemente. 
              Esta ação removerá todos os contratos, pagamentos, tarefas e excluirá as aulas do Google Calendar.
              <br/>
              <span className="text-rose-600 font-black uppercase text-xs block mt-4 tracking-widest">
                Recomendado apenas para perfis de teste.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete-aluno" className="text-xs font-black uppercase tracking-widest text-slate-500">
              Para confirmar, digite o nome do aluno
            </Label>
            <Input
              id="confirm-delete-aluno"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={alunoNome}
              autoComplete="off"
              className="h-12 rounded-2xl"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="destructive"
              className="h-14 rounded-2xl bg-rose-600 font-black text-xs uppercase tracking-widest shadow-md shadow-rose-500/10 transition-all flex-1 disabled:opacity-40 disabled:shadow-none"
              onClick={handleDelete}
              disabled={loading || !confirmed}
            >
              {loading ? 'Apagando tudo...' : 'Confirmar Exclusão Total'}
            </Button>
            <Button
              variant="ghost"
              className="h-14 rounded-2xl border-2 border-slate-200 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex-[1.5]"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
