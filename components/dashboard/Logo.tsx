'use client'

import { useState } from 'react'
import Image from 'next/image'

interface LogoProps {
  src: string
  fallbackAvatar: string
}

export function Logo({ src, fallbackAvatar }: LogoProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
        {fallbackAvatar}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt="Logo"
      width={192}
      height={192}
      unoptimized
      className="w-full h-auto object-contain max-h-48"
      onError={() => setError(true)}
    />
  )
}
