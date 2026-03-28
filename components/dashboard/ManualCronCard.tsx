'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type ManualCronCardProps = {
  label: string
  title: string
  description: string
  details: string[]
  endpoint?: string
  actionLabel?: string
  resultKind?: 'default' | 'transcript'
  badge?: string
  disabled?: boolean
}

function getResultMessage(
  payload: Record<string, unknown>,
  resultKind: 'default' | 'transcript'
) {
  const sent = typeof payload.sent === 'number' ? payload.sent : null
  const updated = typeof payload.updated === 'number' ? payload.updated : null
  const imported = typeof payload.imported === 'number' ? payload.imported : null

  if (sent !== null) return `${sent} lembrete(s) enviados.`
  if (updated !== null) return `${updated} pagamento(s) atualizado(s) para atrasado.`
  if (imported !== null || resultKind === 'transcript') {
    const skipped = typeof payload.skipped === 'number' ? payload.skipped : 0
    const failed = typeof payload.failed === 'number' ? payload.failed : 0
    return `${imported || 0} transcript(s) importada(s), ${skipped} pulada(s), ${failed} com falha.`
  }

  return 'Rotina executada com sucesso.'
}

export default function ManualCronCard({
  label,
  title,
  description,
  details,
  endpoint,
  actionLabel = 'Rodar agora',
  resultKind = 'default',
  badge,
  disabled = false,
}: ManualCronCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRun() {
    if (!endpoint || disabled) return

    try {
      setLoading(true)
      const response = await fetch(endpoint, { method: 'POST' })
      const payload = (await response.json()) as Record<string, unknown> & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao executar a rotina manual.')
      }

      toast.success(getResultMessage(payload, resultKind))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao executar a rotina manual.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-sm shadow-slate-200/50">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{label}</p>
            <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
            <p className="max-w-2xl text-sm font-medium leading-6 text-slate-600">{description}</p>
          </div>

          <div className="flex items-center gap-2">
            {badge ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                {badge}
              </span>
            ) : null}

            {endpoint ? (
              <Button
                type="button"
                onClick={handleRun}
                disabled={loading || disabled}
                className="h-11 rounded-2xl bg-blue-600 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {loading ? 'Executando...' : actionLabel}
              </Button>
            ) : (
              <div className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Manual no menu
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {details.map((detail) => (
            <div
              key={detail}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600"
            >
              {detail}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
