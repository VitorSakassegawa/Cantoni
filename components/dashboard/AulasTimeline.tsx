'use client'

import { useState } from 'react'
import AulaRow from './AulaRow'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  aulas: any[]
  showStudentName?: boolean
  showContractType?: boolean
  isProfessor?: boolean
}

export default function AulasTimeline({ 
  aulas, 
  showStudentName = true, 
  showContractType = true,
  isProfessor = false 
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const initialCount = 5
  const displayedAulas = showAll ? aulas : aulas.slice(0, initialCount)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card border-none overflow-hidden rounded-[2.5rem] shadow-xl shadow-blue-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap text-center">Aula #</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Data e Horário</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Status</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Google Meet</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Lição / Conteúdo</th>
                {showContractType && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Tipo</th>}
                {showStudentName && <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Aluno</th>}
                <th className="px-4 py-6 text-right pr-8">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedAulas.map((aula, i) => {
                const studentName = aula.contracts?.profiles?.full_name || (aula as any).contratos?.profiles?.full_name
                return (
                  <AulaRow 
                    key={aula.id} 
                    aula={aula} 
                    index={i + 1} 
                    isProfessor={isProfessor}
                    studentName={studentName}
                    showStudentName={showStudentName}
                    showContractType={showContractType}
                  />
                )
              })}
            </tbody>
          </table>

          {(!aulas || aulas.length === 0) && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Nenhuma aula registrada</p>
            </div>
          )}
        </div>
      </div>

      {aulas.length > initialCount && (
        <div className="p-6 border-t border-slate-50 flex justify-center bg-slate-50/30">
          <Button 
            variant="ghost" 
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all gap-2"
          >
            {showAll ? (
              <>Ver Menos <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Ver Todas as {aulas.length} Aulas <ChevronDown className="w-3 h-3" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
