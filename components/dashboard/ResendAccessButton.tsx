'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function ResendAccessButton({
  alunoId,
  className,
}: {
  alunoId: string
  className?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const response = await fetch('/api/professor/alunos/reenviar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alunoId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível reenviar o acesso.')
      }

      toast.success('Link de primeiro acesso reenviado por e-mail.')
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível reenviar o acesso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Reenviando...' : 'Reenviar primeiro acesso'}
    </Button>
  )
}
