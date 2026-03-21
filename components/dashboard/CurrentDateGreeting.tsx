'use client'

import { useState, useEffect } from 'react'

export default function CurrentDateGreeting() {
  const [mounted, setMounted] = useState(false)
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    setMounted(true)
    const today = new Date()
    setDateStr(today.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    }))
  }, [])

  if (!mounted) return <span className="opacity-0">Carregando data...</span>

  return (
    <p className="text-blue-100/70 font-bold text-sm tracking-wide uppercase animate-fade-in">
      {dateStr}
    </p>
  )
}
