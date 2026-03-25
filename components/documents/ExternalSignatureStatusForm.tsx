'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ExternalSignatureStatus } from '@/lib/document-issuances'

const OPTIONS: Array<{ value: ExternalSignatureStatus; label: string }> = [
  { value: 'internal_only', label: 'Somente no portal' },
  { value: 'pending_external_signature', label: 'Pendente de assinatura externa' },
  { value: 'sent_to_provider', label: 'Enviado ao ZapSign' },
  { value: 'signed_externally', label: 'Assinado externamente' },
]

export default function ExternalSignatureStatusForm({
  issuanceId,
  currentStatus,
  currentNotes,
}: {
  issuanceId: number
  currentStatus?: string | null
  currentNotes?: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ExternalSignatureStatus>(
    (currentStatus as ExternalSignatureStatus) || 'internal_only'
  )
  const [notes, setNotes] = useState(currentNotes || '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const response = await fetch('/api/professor/documentos/assinatura-externa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuanceId,
          externalSignatureStatus: status,
          externalSignatureNotes: notes,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível atualizar a assinatura externa.')
      }

      toast.success('Status de assinatura externa atualizado.')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Falha ao atualizar assinatura externa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 print:hidden">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Assinatura externa
        </p>
        <p className="text-sm font-medium text-slate-600">
          Use este controle para acompanhar o andamento manual do contrato no ZapSign.
        </p>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as ExternalSignatureStatus)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ex.: enviado ao ZapSign em 25/03, aguardando assinatura do aluno."
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar status'}
      </button>
    </div>
  )
}
