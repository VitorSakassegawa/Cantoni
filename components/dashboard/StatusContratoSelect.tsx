'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface StatusContratoSelectProps {
  contrato: any
}

export default function StatusContratoSelect({ contrato }: StatusContratoSelectProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStatusChange(newStatus: string) {
    if (newStatus === contrato.status) return
    
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
      
      toast.success(`Status alterado para ${newStatus}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status:</span>
      <Select
        value={contrato.status}
        onChange={(e) => handleStatusChange((e.target as HTMLSelectElement).value)}
        disabled={loading}
        className={`h-8 text-[10px] font-black uppercase tracking-widest border-none ring-0 focus:ring-0 w-32 rounded-xl ${
          contrato.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-600' : 
          contrato.status === 'inativo' ? 'bg-amber-500/10 text-amber-600' :
          'bg-rose-500/10 text-rose-600'
        }`}
      >
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
        <option value="cancelado">Cancelado</option>
        <option value="vencido">Vencido</option>
      </Select>
    </div>
  )
}
