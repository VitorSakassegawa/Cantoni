'use client' // Error boundaries devem ser Client Components

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // TODO: enviar para um serviço de observabilidade (Sentry, etc.)
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white/80 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Algo deu errado ao carregar esta página</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tente novamente. Se o problema continuar, recarregue a página ou entre em contato com o suporte.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-slate-400">Código do erro: {error.digest}</p>
        ) : null}
        <button
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
