'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

export default function OfflineStatusBar() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const syncStatus = () => setIsOffline(!navigator.onLine)

    syncStatus()
    window.addEventListener('online', syncStatus)
    window.addEventListener('offline', syncStatus)

    return () => {
      window.removeEventListener('online', syncStatus)
      window.removeEventListener('offline', syncStatus)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="mobile-safe-top mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/95 p-4 shadow-lg shadow-amber-100/40 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <WifiOff className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Modo offline</p>
            <p className="mt-1 text-sm font-black tracking-tight text-slate-900">
              Você está sem conexão no momento
            </p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
              Algumas páginas recentes continuam disponíveis, mas dados dinâmicos podem não refletir o estado atual.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 self-start rounded-2xl bg-amber-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar de novo
        </button>
      </div>
    </div>
  )
}
