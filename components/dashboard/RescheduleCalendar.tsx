'use client'

import { useState, useEffect } from 'react'
import { 
  format, 
  addMonths, 
  subMonths,
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay, 
  isSameDay, 
  isToday,
  startOfToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Umbrella, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Recesso {
  id: string
  titulo: string
  data_inicio: string
  data_fim: string
  tipo: 'feriado' | 'recesso'
}

interface RescheduleCalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
}

export default function RescheduleCalendar({ selectedDate, onDateSelect }: RescheduleCalendarProps) {
  const [viewDate, setViewDate] = useState(startOfMonth(startOfToday()))
  const [recessos, setRecessos] = useState<Recesso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecessos() {
      try {
        const res = await fetch('/api/recessos')
        const data = await res.json()
        setRecessos(data)
      } catch (e) {
        toast.error('Erro ao carregar datas bloqueadas')
      } finally {
        setLoading(false)
      }
    }
    loadRecessos()
  }, [])

  const days = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate)
  })

  const startDayOfWeek = getDay(startOfMonth(viewDate))
  const blanks = Array.from({ length: startDayOfWeek })

  const getAcademicStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return recessos.find(r => dateStr >= r.data_inicio && dateStr <= r.data_fim)
  }

  const isInvalidDate = (date: Date) => {
    const dayOfWeek = getDay(date)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const status = getAcademicStatus(date)
    const isPast = date < startOfToday()
    return isWeekend || !!status || isPast
  }

  const prevMonth = () => setViewDate(subMonths(viewDate, 1))
  const nextMonth = () => setViewDate(addMonths(viewDate, 1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
          {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
        </h4>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-black text-slate-300 py-2 uppercase">{d}</div>
        ))}
        
        {blanks.map((_, i) => <div key={`b-${i}`} />)}
        
        {days.map((day, dIdx) => {
          const status = getAcademicStatus(day)
          const invalid = isInvalidDate(day)
          const selected = selectedDate && isSameDay(day, selectedDate)
          const today = isToday(day)
          
          return (
            <button
              key={dIdx}
              type="button"
              disabled={invalid}
              onClick={() => onDateSelect(day)}
              className={`
                aspect-square flex flex-col items-center justify-center text-[11px] font-bold rounded-xl transition-all relative group
                ${selected ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105 z-10' : 
                  status?.tipo === 'recesso' ? 'bg-orange-100 text-orange-700 cursor-not-allowed opacity-60' : 
                  status?.tipo === 'feriado' ? 'bg-rose-100 text-rose-700 cursor-not-allowed opacity-60' : 
                  invalid ? 'text-slate-200 cursor-not-allowed' : 
                  'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }
                ${today && !selected ? 'ring-2 ring-blue-100' : ''}
              `}
              title={status?.titulo}
            >
              <span>{format(day, 'd')}</span>
              {status && (
                <div className={`mt-0.5 ${selected ? 'text-white' : 'text-current'}`}>
                  {status.tipo === 'feriado' ? <Flag className="w-2.5 h-2.5" /> : <Umbrella className="w-2.5 h-2.5" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Mini Legend */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          <div className="w-2 h-2 rounded-full bg-rose-200" /> Feriados
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          <div className="w-2 h-2 rounded-full bg-orange-200" /> Recesso
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          <div className="w-2 h-2 rounded-full bg-slate-100" /> Fim de Semana
        </div>
      </div>
    </div>
  )
}
