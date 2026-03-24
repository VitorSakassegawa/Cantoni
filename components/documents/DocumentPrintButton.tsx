'use client'

import { Download, Printer } from 'lucide-react'

export default function DocumentPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 print:hidden"
    >
      <Download className="w-4 h-4" />
      Salvar em PDF
      <Printer className="w-4 h-4" />
    </button>
  )
}
