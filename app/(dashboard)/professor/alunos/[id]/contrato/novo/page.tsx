'use client'

import { use, useState, useEffect } from 'react'
import { ChevronLeft, AlertTriangle, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ContratoForm from '@/components/dashboard/ContratoForm'
import { createClient } from '@/lib/supabase/client'
import { formatDateOnly } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ActiveContractSummary = {
  id: number
  data_fim?: string | null
}

export default function NovoContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [activeContrato, setActiveContrato] = useState<ActiveContractSummary | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [proceeded, setProceeded] = useState(false)

  useEffect(() => {
    async function checkActiveContract() {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('status', 'ativo')
        .maybeSingle()
      
      if (data) {
        setActiveContrato(data as ActiveContractSummary)
        setShowWarning(true)
      }
      setLoading(false)
    }
    checkActiveContract()
  }, [alunoId, supabase])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Verificando contratos...</p>
      </div>
    )
  }

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

      {(!activeContrato || proceeded) ? (
        <ContratoForm alunoId={alunoId} />
      ) : (
        <div className="bg-slate-50 rounded-[2.5rem] p-12 border border-slate-200 text-center space-y-6">
          <div className="w-20 h-20 rounded-[2rem] bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Atenção: Contrato Ativo Detectado</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            Este aluno já possui um contrato ativo no sistema. Deseja realmente prosseguir com a abertura de um novo contrato?
          </p>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-sm mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID do Contrato</span>
              <span className="text-xs font-black text-slate-900">#{activeContrato.id}</span>
            </div>
            <div className="h-px bg-slate-50" />
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Válido Até</span>
              <span className="text-xs font-black text-blue-600">{formatDateOnly(activeContrato.data_fim)}</span>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="ghost" 
              className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-white"
              onClick={() => router.push(`/professor/alunos/${alunoId}`)}
            >
              <X className="w-4 h-4 mr-2" /> Cancelar e Voltar
            </Button>
            <Button 
              className="h-14 px-10 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
              onClick={() => setProceeded(true)}
            >
              Sim, Prosseguir Realmente <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Warning Dialog (Alternative UI if decided to use Dialog) */}
      <Dialog open={showWarning && !proceeded} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl">
          <div className="bg-amber-500 h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader className="space-y-4">
              <div className="w-16 h-16 rounded-[2rem] bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-black text-center text-slate-900 tracking-tighter">
                Contrato Ativo Encontrado
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 font-medium leading-relaxed">
                O aluno já possui o contrato <strong className="font-black text-slate-900">#{activeContrato?.id}</strong> válido até <strong className="font-black text-slate-900">{activeContrato && formatDateOnly(activeContrato.data_fim)}</strong>.
                Deseja prosseguir com a abertura de um novo contrato?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="ghost" 
                className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 flex-1" 
                onClick={() => router.push(`/professor/alunos/${alunoId}`)}
              >
                Voltar
              </Button>
              <Button 
                className="h-14 rounded-2xl bg-blue-600 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5] text-white" 
                onClick={() => setProceeded(true)}
              >
                Confirmar e Continuar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
