'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import ReviewRescheduleModal, { type RescheduleModalLesson } from './ReviewRescheduleModal'
import Link from 'next/link'

interface RescheduleStudentProfile {
  full_name: string | null
}

interface RescheduleContract {
  aluno_id: string | null
  profiles?: RescheduleStudentProfile | null
}

interface RescheduleRequestItem extends RescheduleModalLesson {
  contratos?: RescheduleContract | null
  contracts?: RescheduleContract | null
}

interface Props {
  initialSolicitacoes: RescheduleRequestItem[]
}

export default function ReschedulingRequests({ initialSolicitacoes }: Props) {
  const [selectedAula, setSelectedAula] = useState<RescheduleRequestItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Card className="glass-card bg-amber-50/80 border-amber-200/50 ring-4 ring-amber-500/5">
        <CardHeader className="pb-4 bg-amber-100/50 border-b border-amber-200/50">
          <CardTitle className="text-xs font-black text-amber-600 flex items-center gap-2 uppercase tracking-[0.2em]">
            <RotateCcw className="w-4 h-4" /> Solicitações de Remarcação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-amber-100/50">
            {initialSolicitacoes.map((sol) => {
              const hasNovaData = sol.data_hora_solicitada && !formatDateTime(sol.data_hora_solicitada).includes('Não informada')
              return (
                <div key={sol.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                      {sol.contratos?.profiles?.full_name}
                    </p>
                    <Badge 
                      variant={hasNovaData ? "warning" : "secondary"} 
                      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0"
                    >
                      {hasNovaData ? "Solicitado" : "Pendente (Aluno)"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">De:</span> {formatDateTime(sol.data_hora)}
                    </div>
                    <div className={`flex items-center gap-2 ${hasNovaData ? 'text-amber-700' : 'text-slate-400 italic'}`}>
                      <span className={hasNovaData ? 'text-amber-500' : 'text-slate-300'}>Para:</span> {hasNovaData ? formatDateTime(sol.data_hora_solicitada) : "Aguardando aluno propor data"}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Link 
                      href={`/professor/alunos/${sol.contracts?.aluno_id || sol.contratos?.aluno_id}`}
                      className="py-2 px-3 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-center"
                    >
                      Ver Aluno
                    </Link>
                    {hasNovaData ? (
                      <Button 
                        onClick={() => {
                          setSelectedAula(sol)
                          setShowModal(true)
                        }}
                        className="py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      >
                        Analisar
                      </Button>
                    ) : (
                      <div className="py-2.5 rounded-xl bg-slate-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg text-center opacity-50">
                        Aguardando
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedAula && (
        <ReviewRescheduleModal 
          aula={selectedAula}
          open={showModal}
          onOpenChange={setShowModal}
        />
      )}
    </>
  )
}


