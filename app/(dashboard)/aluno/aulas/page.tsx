import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import AulaRow from '@/components/dashboard/AulaRow'

export default async function AlunoAulasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id')
    .eq('aluno_id', user.id)
    .eq('status', 'ativo')
    .single()

  const { data: aulas } = await supabase
    .from('aulas')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('data_hora', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href="/aluno" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Minhas Aulas</h1>
        <p className="text-slate-500 font-medium">Histórico completo de lições, frequências e materiais.</p>
      </div>

      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
            Timeline de Aulas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/50 text-slate-400">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Aula #</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Data e Horário</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Google Meet</th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Lição / Conteúdo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aulas?.map((aula: any, i: number) => (
                  <AulaRow key={aula.id} aula={aula} index={aulas.length - i} />
                ))}

              </tbody>
            </table>
            {(!aulas || aulas.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Nenhuma aula registrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
