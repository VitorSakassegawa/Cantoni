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
      variant={copied ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleCopy}
      className="flex items-center gap-2"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Copiar código PIX'}
    </Button>
  )
}
