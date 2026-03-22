'use client'

import { useState, useEffect } from 'react'
import { 
  format, 
  startOfYear, 
  addMonths, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay, 
  isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FERIADOS_NACIONAIS } from '@/lib/constants/holidays'
import { Umbrella, Flag, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import ManageRecessoModal from './ManageRecessoModal'

interface Recesso {
  id: string
  titulo: string
  data_inicio: string
  data_fim: string
  tipo: 'feriado' | 'recesso'
}

interface Props {
  isProfessor?: boolean
}

export default function AcademicCalendar({ isProfessor = false }: Props) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [recessos, setRecessos] = useState<Recesso[]>([])
  const [loading, setLoading] = useState(true)

  const loadRecessos = async () => {
    try {
      const res = await fetch('/api/recessos')
      const data = await res.json()
      setRecessos(data)
    } catch (e) {
      toast.error('Erro ao carregar dados do calendário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecessos()
  }, [])

  const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfYear(new Date(year, 0, 1)), i))

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const foundRecesso = recessos.find(r => {
      return dateStr >= r.data_inicio && dateStr <= r.data_fim
    })

    if (foundRecesso) return foundRecesso

    if (FERIADOS_NACIONAIS.includes(dateStr)) {
      return { tipo: 'feriado', titulo: 'Feriado Nacional' }
    }

    return undefined
  }

  if (loading) return <div className="h-96 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando calendário...</div>

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-white active:scale-95 transition-all"
              onClick={() => setYear(year - 1)}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter min-w-[120px] text-center">
               {year}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-white active:scale-95 transition-all"
              onClick={() => setYear(year + 1)}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 hidden md:block">Calendário Acadêmico Cantoni</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border border-slate-100 shadow-sm">
           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-700 text-[9px] font-black uppercase tracking-wider">
              <Umbrella className="w-3.5 h-3.5" /> Recesso / Férias
           </div>
           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-wider">
              <Flag className="w-3.5 h-3.5" /> Feriados
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month, mIdx) => {
          const days = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month)
          })
          const startDayOfWeek = getDay(startOfMonth(month))
          const blanks = Array.from({ length: startDayOfWeek })

          return (
            <div key={mIdx} className="glass-card border-none p-5 relative overflow-hidden group">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-50 pb-2">
                {format(month, 'MMMM', { locale: ptBR })}
              </h3>
              
              <div className="grid grid-cols-7 gap-1 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-[8px] font-black text-slate-300 py-1 uppercase">{d}</div>
                ))}
                
                {blanks.map((_, i) => <div key={`b-${i}`} />)}
                
                {days.map((day, dIdx) => {
                  const status = getDayStatus(day)
                  const isSun = getDay(day) === 0
                  const isCurrent = isToday(day)
                  
                  return (
                    <div 
                      key={dIdx} 
                      className={`
                        aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg transition-all relative cursor-default
                        ${status?.tipo === 'recesso' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 
                          status?.tipo === 'feriado' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 
                          isSun ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-50'
                        }
                        ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                      `}
                      title={status?.titulo}
                    >
                      {format(day, 'd')}
                      {status && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {isProfessor && (
        <div className="flex justify-end pt-6 border-t border-slate-100">
           <ManageRecessoModal 
             onSuccess={loadRecessos} 
             existingRecessos={recessos} 
           />
        </div>
      )}
    </div>
  )
}
