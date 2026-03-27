'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import AulaRow from './AulaRow'
import type { TimelineAula } from '@/lib/dashboard-types'

type TimelineFilter = 'upcoming' | 'reschedules' | 'completed'

interface Props {
  aulas: TimelineAula[]
  showStudentName?: boolean
  showContractType?: boolean
  isProfessor?: boolean
  defaultFilter?: TimelineFilter
  showFilterHint?: boolean
}

export default function AulasTimeline({
  aulas,
  showStudentName = true,
  showContractType = true,
  isProfessor = false,
  defaultFilter = 'upcoming',
  showFilterHint = false,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>(defaultFilter)
  const initialCount = 5

  const filteredAulas = useMemo(() => {
    if (activeFilter === 'upcoming') {
      return aulas.filter((aula) => ['agendada', 'confirmada'].includes(aula.status))
    }

    if (activeFilter === 'reschedules') {
      return aulas.filter((aula) =>
        ['remarcada', 'pendente_remarcacao', 'pendente_remarcacao_rejeitada'].includes(aula.status)
      )
    }

    return aulas.filter((aula) => ['dada', 'finalizado'].includes(aula.status))
  }, [activeFilter, aulas])

  const displayedAulas = showAll ? filteredAulas : filteredAulas.slice(0, initialCount)

  const summary = useMemo(() => {
    const upcoming = aulas.filter((aula) => ['agendada', 'confirmada'].includes(aula.status)).length
    const reschedules = aulas.filter((aula) =>
      ['remarcada', 'pendente_remarcacao', 'pendente_remarcacao_rejeitada'].includes(aula.status)
    ).length
    const completed = aulas.filter((aula) => ['dada', 'finalizado'].includes(aula.status)).length

    return { upcoming, reschedules, completed }
  }, [aulas])

  const filterCards: Array<{
    key: TimelineFilter
    label: string
    count: number
    tone: string
    icon: typeof CalendarClock
  }> = [
    {
      key: 'upcoming',
      label: 'Próximas',
      count: summary.upcoming,
      tone: 'bg-blue-50 text-blue-700',
      icon: CalendarClock,
    },
    {
      key: 'reschedules',
      label: 'Remarcações',
      count: summary.reschedules,
      tone: 'bg-amber-50 text-amber-700',
      icon: RotateCcw,
    },
    {
      key: 'completed',
      label: 'Concluídas',
      count: summary.completed,
      tone: 'bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
    },
  ]

  const emptyMessage =
    activeFilter === 'upcoming'
      ? 'Nenhuma próxima aula registrada'
      : activeFilter === 'reschedules'
        ? 'Nenhuma remarcação encontrada'
        : 'Nenhuma aula concluída encontrada'

  return (
    <div className="space-y-6 animate-fade-in">
      {showFilterHint ? (
        <div className="mx-6 rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-slate-700">Sua visão começa pelas próximas aulas.</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Para revisar aulas concluídas, materiais e eventuais remarcações, basta clicar no card correspondente.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 px-6 pt-6 md:grid-cols-3">
        {filterCards.map((card) => {
          const Icon = card.icon
          const isActive = activeFilter === card.key

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setActiveFilter(card.key)
                setShowAll(false)
              }}
              className={`rounded-2xl px-5 py-4 text-left transition-all ${
                isActive
                  ? `${card.tone} ring-2 ring-current/10 shadow-lg`
                  : 'bg-slate-50 text-slate-500 hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">{card.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{card.count}</p>
                </div>
                <Icon className="h-5 w-5" />
              </div>
            </button>
          )
        })}
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

          {filteredAulas.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-300">{emptyMessage}</p>
            </div>
          ) : null}
        </div>
      </div>

      {filteredAulas.length > initialCount ? (
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
                Ver todas as {filteredAulas.length} aulas <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
