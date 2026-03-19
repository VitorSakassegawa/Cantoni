'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function GerarCobrancaBtn({ pagamentoId }: { pagamentoId: number }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleGerar() {
    setLoading(true)
    const res = await fetch('/api/pagamentos/gerar-cobranca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagamentoId }),
    })
    const data = await res.json()
    if (data.success) setDone(true)
    else alert(data.error || 'Erro ao gerar cobrança')
    setLoading(false)
  }

  if (done) return <span className="text-xs text-green-600">E-mail enviado!</span>

  return (
    <Button size="sm" variant="outline" onClick={handleGerar} disabled={loading}>
      {loading ? 'Gerando...' : 'Gerar PIX'}
    </Button>
  )
}
