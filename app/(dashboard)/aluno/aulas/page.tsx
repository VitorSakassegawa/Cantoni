import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import AulasTimeline from '@/components/dashboard/AulasTimeline'

import AulaRow from '@/components/dashboard/AulaRow'

export default async function AlunoAulasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('id')
    .eq('aluno_id', user.id)
    .eq('status', 'ativo')

  const contratoIds = (contratos as any[])?.map((c: any) => c.id) || []

  // Pegamos apenas as aulas de hoje em diante para o "Próximas 5"
  // mas o 'Ver Tudo' do frontend vai mostrar o que entregarmos aqui.
  // Para ser fiel ao "Histórico", talvez devêssemos entregar todas e filtrar no cliente?
  // O usuário pediu "liberado as próximas 5 e abrir o restante".
  // Vamos buscar TODAS as aulas do contrato ativo, ordenadas pela data mais próxima.
  const { data: aulas } = await supabase
    .from('aulas')
    .select('*')
    .in('contrato_id', contratoIds)
    .gte('data_hora', new Date().toISOString())
    .order('data_hora', { ascending: true })



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
          <AulasTimeline aulas={aulas || []} isProfessor={false} />
        </CardContent>
      </Card>
    </div>
  )
}

