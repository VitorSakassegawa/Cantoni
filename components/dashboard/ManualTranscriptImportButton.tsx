'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type ImportResponse = {
  checked: number
  imported: number
  skipped: number
  failed: number
}

export default function ManualTranscriptImportButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleImport() {
    try {
      setLoading(true)

      const response = await fetch('/api/professor/aulas/importar-transcricoes', {
        method: 'POST',
      })
      const result = (await response.json()) as ImportResponse & { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao rodar a importação manual.')
      }

      toast.success(
        `Importação concluída: ${result.imported} importada(s), ${result.skipped} pulada(s), ${result.failed} com falha.`
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao importar transcrições.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm shadow-blue-500/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
            Google Meet Transcript
          </p>
          <p className="text-sm font-bold text-slate-700">
            Dispara manualmente a rotina do cron para importar transcrições já elegíveis.
          </p>
          <p className="text-xs font-medium text-slate-500">
            A janela automática continua a mesma: apenas aulas com pelo menos 30 minutos entram no processamento.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleImport}
          disabled={loading}
          className="h-11 rounded-2xl bg-blue-600 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? 'Importando...' : 'Importar Transcrições'}
        </Button>
      </div>
    </div>
  )
}
