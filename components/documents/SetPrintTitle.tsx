'use client'

import { useEffect } from 'react'

// Browsers use document.title as the default "Save as PDF" filename. The root
// layout sets a generic title, so we override it on the report page (and restore
// it on unmount) to get a clean per-lesson filename like
// "CES - English Class (02.Jun.2026)".
export default function SetPrintTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  return null
}
