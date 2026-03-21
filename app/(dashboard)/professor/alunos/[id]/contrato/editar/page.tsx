'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ContratoForm from '@/components/dashboard/ContratoForm'

export default function ProfessorEditContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: aluno_id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [contrato, setContrato] = useState<any>(null)

  useEffect(() => {
    async function loadContrato() {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('aluno_id', aluno_id)
        .eq('status', 'ativo')
        .maybeSingle()
      
      if (data) {
        setContrato(data)
      }
      setLoading(false)
    }
    loadContrato()
  }, [aluno_id])

  if (loading) return (
    <div className="max-w-4xl mx-auto p-20 text-center animate-pulse">
      <div className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando Detalhes do Contrato...</div>
    </div>
  )
  
  if (!contrato) return (
    <div className="max-w-4xl mx-auto p-20 text-center">
      <div className="text-slate-400 font-bold italic">Nenhum contrato ativo encontrado para este aluno.</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col gap-6">
        <Link href={`/professor/alunos/${aluno_id}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group w-fit">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Aluno
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Edição Acadêmica</h1>
          <p className="text-slate-500 font-medium italic">Sincronização automática de pagamentos habilitada.</p>
        </div>
      </div>

      <ContratoForm 
        alunoId={aluno_id}
        initialData={contrato}
        onSuccess={() => router.push(`/professor/alunos/${aluno_id}`)}
      />
    </div>
  )
}
