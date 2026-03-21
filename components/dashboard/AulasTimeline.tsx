'use client'

import { useState } from 'react'
import AulaRow from './AulaRow'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  aulas: any[]
}

export default function AulasTimeline({ aulas }: Props) {
  const [showAll, setShowAll] = useState(false)
  const initialCount = 5
  const displayedAulas = showAll ? aulas : aulas.slice(0, initialCount)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100/50 text-slate-400">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Aula #</th>
              <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Data e Horário</th>
              <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Status</th>
              <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Google Meet</th>
              <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Lição / Conteúdo</th>
              <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Aluno</th>
              <th className="px-4 py-6 text-right pr-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedAulas.map((aula, i) => {
              const studentName = aula.contratos?.profiles?.full_name
              return (
                <AulaRow 
                  key={aula.id} 
                  aula={aula} 
                  index={i + 1} 
                  isProfessor={!!studentName}
                  studentName={studentName}
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
