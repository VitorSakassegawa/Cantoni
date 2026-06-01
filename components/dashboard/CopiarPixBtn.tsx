'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export default function CopiarPixBtn({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(codigo)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Button
      onClick={handleCopy}
      aria-live="polite"
      className={`h-14 w-full gap-2.5 rounded-2xl text-sm font-black uppercase tracking-wide shadow-lg transition-colors ${
        copied
          ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-600'
          : 'bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700'
      }`}
    >
      {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      {copied ? 'Código PIX copiado!' : 'Copiar código PIX'}
    </Button>
  )
}
