'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setDismissed(window.localStorage.getItem('pwa-install-dismissed') === 'true')

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      window.localStorage.removeItem('pwa-install-dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const iosMode = useMemo(() => isIos() && !isStandalone(), [])

  if (installed || dismissed) return null
  if (!deferredPrompt && !iosMode) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'dismissed') {
      window.localStorage.setItem('pwa-install-dismissed', 'true')
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    window.localStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="mobile-safe-top mb-4 rounded-[1.75rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 shadow-lg shadow-blue-100/40">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
          {iosMode ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Adicionar à tela inicial</p>
          <p className="mt-1 text-sm font-black tracking-tight text-slate-900">
            Instale a Cantoni English School no seu celular
          </p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            {iosMode
              ? 'No iPhone ou iPad, toque em Compartilhar e depois em “Adicionar à Tela de Início” para abrir como app.'
              : 'Instale o portal para abrir mais rápido, usar em tela cheia e ter uma experiência melhor no celular.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {!iosMode ? (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Instalar app
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              <X className="h-4 w-4" />
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
