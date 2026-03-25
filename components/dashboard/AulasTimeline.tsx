'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import AulaRow from './AulaRow'
import type { TimelineAula } from '@/lib/dashboard-types'

interface Props {
  aulas: TimelineAula[]
  showStudentName?: boolean
  showContractType?: boolean
  isProfessor?: boolean
}

export default function AulasTimeline({
  aulas,
  showStudentName = true,
  showContractType = true,
  isProfessor = false,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const initialCount = 5
  const displayedAulas = showAll ? aulas : aulas.slice(0, initialCount)

  const summary = useMemo(() => {
    const upcoming = aulas.filter((aula) => ['agendada', 'confirmada'].includes(aula.status)).length
    const pendingReschedules = aulas.filter((aula) => aula.status === 'pendente_remarcacao').length
    const completed = aulas.filter((aula) => ['dada', 'finalizado'].includes(aula.status)).length
    return { upcoming, pendingReschedules, completed }
  }, [aulas])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 px-6 pt-6 md:grid-cols-3">
        <div className="rounded-2xl bg-blue-50 px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                Próximas
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-blue-700">
                {summary.upcoming}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                Remarcações
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-amber-700">
                {summary.pendingReschedules}
              </p>
            </div>
            <RotateCcw className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                Concluídas
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                {summary.completed}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400">
                <th className="whitespace-nowrap px-8 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em]">
                  Aula #
                </th>
                <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                  Data e horário
                </th>
                <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                  Google Meet
                </th>
                <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                  Lição / conteúdo
                </th>
                {showContractType ? (
                  <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                    Tipo
                  </th>
                ) : null}
                {showStudentName ? (
                  <th className="whitespace-nowrap px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                    Aluno
                  </th>
                ) : null}
                <th className="px-4 py-6 pr-8 text-right text-[10px] font-black uppercase tracking-[0.2em]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedAulas.map((aula, index) => {
                const studentName =
                  aula.contracts?.profiles?.full_name || aula.contratos?.profiles?.full_name

                return (
                  <AulaRow
                    key={aula.id}
                    aula={aula}
                    index={index + 1}
                    isProfessor={isProfessor}
                    studentName={studentName}
                    showStudentName={showStudentName}
                    showContractType={showContractType}
                  />
                )
              })}
            </tbody>
          </table>

          {aulas.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Nenhuma aula registrada
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {aulas.length > initialCount ? (
        <div className="flex justify-center border-t border-slate-50 bg-slate-50/30 p-6">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-blue-600"
          >
            {showAll ? (
              <>
                Ver menos <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Ver todas as {aulas.length} aulas <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
