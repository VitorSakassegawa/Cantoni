import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { UserPlus, Search, Filter, MoreHorizontal, GraduationCap, Calendar, Mail, Phone, ExternalLink, BookOpen } from 'lucide-react'

export default async function AlunosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: alunos } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'aluno')
    .order('full_name')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*), pagamentos(*)')
    .eq('status', 'ativo')

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestão de Alunos</h1>
          <p className="text-slate-500 font-medium">Visualize e gerencie todos os alunos matriculados na Cantoni English.</p>
        </div>
        <Link href="/professor/alunos/novo">
          <Button className="h-14 px-8 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
            <UserPlus className="w-4 h-4 mr-2" />
            Matricular Aluno
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 outline-none"
          />
        </div>
        <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Alunos Grid */}
      <div className="grid gap-6">
        {alunos?.map((aluno: any) => {
          const contrato = contratos?.find((c: any) => c.aluno_id === aluno.id)
          const pagAtrasado = contrato?.pagamentos?.find(
            (p: any) => p.status === 'atrasado'
          )
          
          return (
            <Card key={aluno.id} className="glass-card border-none overflow-hidden hover:shadow-2xl transition-all group">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
                      <div className="relative w-16 h-16 rounded-2xl lms-gradient flex items-center justify-center text-white text-xl font-black shadow-lg">
                        {aluno.full_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">{aluno.full_name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <Mail className="w-3 h-3" />
                          {aluno.email}
                        </span>
                        {aluno.phone && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <Phone className="w-3 h-3" />
                            {aluno.phone}
                          </span>
                        )}
                        {aluno.birth_date && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {formatDateOnly(aluno.birth_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Contract */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col items-end gap-2 pr-4 border-r border-slate-100 hidden sm:flex">
                      {contrato ? (
                        <>
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                            {contrato.planos?.freq_semana}x / SEM
                          </Badge>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {contrato.aulas_restantes} / {contrato.aulas_totais} AULAS RESTANTES
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline" className="border-slate-200 text-slate-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest">SEM CONTRATO</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-[140px] justify-end">
                      {pagAtrasado ? (
                        <Badge variant="destructive" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          ATRASADO
                        </Badge>
                      ) : contrato && (
                        <Badge className="bg-emerald-500 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">EM DIA</Badge>
                      )}
                      
                      <Link href={`/professor/alunos/${aluno.id}`}>
                        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <ExternalLink className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Secondary Info Bar (Progress) */}
                {contrato && (
                  <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100/50 flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3 text-blue-400" /> Nível: <span className="text-slate-600">{contrato.nivel_atual}</span></span>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-blue-400" /> Material: <span className="text-slate-600">{contrato.livro_atual}</span></span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {(!alunos || alunos.length === 0) && (
          <div className="text-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Nenhum aluno encontrado</h3>
            <p className="text-slate-500 font-medium mb-8">Comece cadastrando seu primeiro aluno na plataforma.</p>
            <Link href="/professor/alunos/novo">
              <Button className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20">
                Cadastrar Primeiro Aluno
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
