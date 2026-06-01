import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500"
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
      <p className="text-sm font-semibold">Carregando…</p>
    </div>
  )
}
