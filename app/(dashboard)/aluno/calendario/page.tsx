import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AcademicCalendar from '@/components/dashboard/AcademicCalendar'
import { Calendar as CalendarIcon, Info } from 'lucide-react'

export default async function AlunoCalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Calendário Acadêmico</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Datas Importantes e Recessos</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
        <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
        <div className="space-y-2">
           <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Informação Importante</p>
           <p className="text-sm text-blue-800/70 font-medium leading-relaxed">
             Este calendário exibe os feriados nacionais e os períodos de <strong className="font-black text-blue-900">recesso/férias</strong> do professor. 
             Caso uma de suas aulas agendadas coincida com um período de recesso, você receberá um alerta no dashboard para sugerir uma nova data.
           </p>
        </div>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:shadow-2xl transition-all duration-500">
        <CardContent className="p-10">
          <AcademicCalendar isProfessor={false} />
        </CardContent>
      </Card>
    </div>
  )
}
