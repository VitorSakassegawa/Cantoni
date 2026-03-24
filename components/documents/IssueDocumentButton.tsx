'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function IssueDocumentButton({
  contractId,
  kind,
  label,
  className,
}: {
  contractId: number
  kind: 'contract' | 'enrollment_declaration'
  label: string
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const response = await fetch('/api/professor/documentos/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, kind }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao emitir documento')
      }

      toast.success('Documento emitido com sucesso.')
      router.push(`/documentos/emitidos/${data.issuanceId}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Falha ao emitir documento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Emitindo...' : label}
    </button>
  )
}
