'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        await registration.update()
      } catch (error) {
        console.error('Failed to register service worker', error)
      }
    }

    void register()
  }, [])

  return null
}
