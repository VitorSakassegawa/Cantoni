'use client'

import { use } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ContratoForm from '@/components/dashboard/ContratoForm'

export default function NovoContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = use(params)

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href={`/professor/alunos/${alunoId}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Aluno
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Novo Contrato Acadêmico</h1>
        <p className="text-slate-500 font-medium font-bold uppercase text-[10px] tracking-widest">Preencha os dados abaixo para gerar a grade de aulas e pagamentos.</p>
      </div>

      <ContratoForm alunoId={alunoId} />
    </div>
  )
}
