'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
}

type ContractStatus = 'ativo' | 'inativo' | 'vencido' | 'cancelado'

type ContractStatusSummary = {
  id: number
  status: ContractStatus
  semestre?: string | null
  ano?: number | null
  livro_atual?: string | null
  nivel_atual?: string | null
  horario?: string | null
  valor?: number | string | null
  dia_vencimento?: number | string | null
  forma_pagamento?: string | null
}

interface StatusContratoSelectProps {
  contrato: ContractStatusSummary
}

export default function StatusContratoSelect({ contrato }: StatusContratoSelectProps) {
  const [loading, setLoading] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const router = useRouter()

  if (contrato.status === 'cancelado') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Status:</span>
        <span className="inline-flex h-8 items-center rounded-xl bg-rose-500/10 px-3 text-xs font-black uppercase tracking-widest text-rose-600">
          Cancelado
        </span>
      </div>
    )
  }

  function requestStatusChange(newStatus: string) {
    if (newStatus === contrato.status) return
    // Leaving "ativo" affects billing/academic state — confirm first to avoid
    // accidental select changes (e.g. a stray scroll over a native dropdown).
    if (contrato.status === 'ativo' && newStatus !== 'ativo') {
      setPendingStatus(newStatus)
      return
    }
    void applyStatusChange(newStatus)
  }

  async function applyStatusChange(newStatus: string) {
    setPendingStatus(null)
    setLoading(true)
    try {
      const res = await fetch('/api/professor/contratos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contrato.id,
          semestre: contrato.semestre,
          ano: contrato.ano,
          livro_atual: contrato.livro_atual,
          nivel_atual: contrato.nivel_atual,
          horario: contrato.horario,
          valor: contrato.valor,
          dia_vencimento: contrato.dia_vencimento,
          forma_pagamento: contrato.forma_pagamento,
          status: newStatus
        }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar status')

      toast.success(`Status alterado para ${STATUS_LABELS[newStatus] ?? newStatus}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Status:</span>
      <Select
        value={contrato.status}
        onChange={(e) => requestStatusChange((e.target as HTMLSelectElement).value)}
        disabled={loading}
        aria-label="Status do contrato"
        className={`h-10 text-xs font-black uppercase tracking-widest border-none ring-0 focus:ring-0 w-32 rounded-xl ${
          contrato.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-600' :
          contrato.status === 'inativo' ? 'bg-amber-500/10 text-amber-600' :
          'bg-rose-500/10 text-rose-600'
        }`}
      >
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
        <option value="vencido">Vencido</option>
      </Select>

      <Dialog open={pendingStatus !== null} onOpenChange={(next) => { if (!next) setPendingStatus(null) }}>
        <DialogContent className="sm:max-w-[440px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">Alterar status do contrato?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Mudar de <strong>Ativo</strong> para{' '}
              <strong>{pendingStatus ? STATUS_LABELS[pendingStatus] ?? pendingStatus : ''}</strong>{' '}
              afeta a cobrança e o andamento acadêmico do aluno. Confirma?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="rounded-2xl border-2 border-slate-200 flex-1" onClick={() => setPendingStatus(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-2xl bg-blue-600 flex-1"
              onClick={() => pendingStatus && applyStatusChange(pendingStatus)}
              disabled={loading}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
