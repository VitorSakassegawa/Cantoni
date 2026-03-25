import Link from 'next/link'
import { RefreshCw, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="glass-card w-full max-w-xl overflow-hidden p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-rose-50 text-rose-600 shadow-lg shadow-rose-100/40">
          <WifiOff className="h-8 w-8" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-rose-500">Sem conexão</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Você está offline no momento</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
          Assim que sua internet voltar, o portal será atualizado normalmente. Enquanto isso, algumas páginas visitadas
          recentemente ainda podem continuar disponíveis.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600"
          >
            Ir para login
          </Link>
        </div>
      </div>
    </div>
  )
}
