'use client'

import { useMemo } from 'react'

export default function CurrentDateGreeting() {
  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
      }),
    []
  )

  return (
    <p className="text-blue-100/70 font-bold text-sm tracking-wide uppercase animate-fade-in">
      {dateStr}
    </p>
  )
}
