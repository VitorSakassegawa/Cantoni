'use client' // Error boundaries devem ser Client Components

import { useEffect } from 'react'
import './globals.css'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    // global-error substitui o root layout, então precisa de <html> e <body>
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Ocorreu um erro inesperado</h2>
            <p className="mt-2 text-sm text-slate-600">
              Não foi possível carregar a aplicação. Tente novamente em instantes.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-slate-400">Código do erro: {error.digest}</p>
            ) : null}
            <button
              onClick={() => unstable_retry()}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
