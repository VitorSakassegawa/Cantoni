'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function DocumentAcceptanceForm({
  issuanceId,
  defaultName,
  terms,
}: {
  issuanceId: number
  defaultName: string
  terms: string[]
}) {
  const router = useRouter()
  const [acceptanceName, setAcceptanceName] = useState(defaultName)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) {
      toast.error('Confirme a leitura antes de registrar o aceite.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/aluno/documentos/aceitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuanceId, acceptanceName }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao registrar aceite')
      }

      toast.success('Aceite digital registrado com sucesso.')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Falha ao registrar aceite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6 print:hidden">
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Aceite digital</p>
        <p className="text-sm font-medium text-emerald-900/80">
          Ao registrar o aceite, você confirma a leitura desta versão emitida e autoriza o registro de evidências técnicas de auditoria do ato de aceite.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Condições do aceite</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {terms.map((term) => (
            <li key={term}>• {term}</li>
          ))}
        </ul>
      </div>

      <input
        value={acceptanceName}
        onChange={(e) => setAcceptanceName(e.target.value)}
        className="h-12 w-full rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none"
        placeholder="Seu nome completo"
        required
      />

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
        Confirmo meu aceite digital desta versão específica do documento e reconheço o registro de data, versão e evidências técnicas.
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registrar aceite'}
      </button>
    </form>
  )
}
