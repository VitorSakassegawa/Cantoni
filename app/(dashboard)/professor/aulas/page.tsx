import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, ChevronLeft, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import AulasTimeline from '@/components/dashboard/AulasTimeline'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProfessorAulasPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : ''
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : ''

  // Fetch classes for the professor's active contracts
  let query = supabase
    .from('aulas')
    .select('*, contratos!inner(status, aluno_id, profiles!inner(full_name))')
    .eq('contratos.status', 'ativo')
    .order('data_hora', { ascending: true })

  if (search) {
    query = query.ilike('contratos.profiles.full_name', `%${search}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: aulas } = await query

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href="/professor" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestão de Aulas</h1>
          <p className="text-slate-500 font-medium">Histórico completo, controle de conteúdos e gestão de status.</p>
        </div>

        <form className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <Input 
              name="search" 
              defaultValue={search} 
              placeholder="Buscar aluno..." 
              className="h-10 pl-10 w-64 rounded-xl border-slate-50 bg-slate-50 focus:bg-white transition-all text-xs font-bold" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              name="status" 
              defaultValue={status}
              className="h-10 px-4 rounded-xl border-slate-50 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="">Todos os Status</option>
              <option value="agendada">Agendadas</option>
              <option value="confirmada">Confirmadas</option>
              <option value="dada">Dadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
            
            <Button type="submit" className="h-10 px-6 rounded-xl lms-gradient text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
              <Filter className="w-3.5 h-3.5" />
              Filtrar
            </Button>
          </div>
        </form>
      </div>

      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            Timeline Cronológica
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AulasTimeline aulas={aulas || []} />
        </CardContent>
      </Card>
      
      {(!aulas || aulas.length === 0) && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma aula encontrada para esses filtros</p>
          {search || status ? (
            <Link href="/professor/aulas" className="mt-4 inline-block text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:underline">
              Limpar Filtros
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
