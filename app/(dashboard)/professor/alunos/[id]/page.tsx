import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, formatDate, formatDateOnly } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, Mail, Phone, Fingerprint, Calendar, GraduationCap, BookOpen, Clock, AlertCircle, TrendingUp, CreditCard } from 'lucide-react'
import AulaRow from '@/components/dashboard/AulaRow'
import AulasTimeline from '@/components/dashboard/AulasTimeline'
import StatusContratoSelect from '@/components/dashboard/StatusContratoSelect'
import ContratoForm from '@/components/dashboard/ContratoForm'
import DeleteAlunoBtn from '@/components/dashboard/DeleteAlunoBtn'
import SkillsRadar from '@/components/dashboard/SkillsRadar'
import SkillEvaluationForm from '@/components/dashboard/SkillEvaluationForm'
import { BrainCircuit, Sparkles, Trash2 } from 'lucide-react'

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const { data: aluno } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!aluno) notFound()

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*)')
    .eq('aluno_id', id)
    .order('created_at', { ascending: false })

  const contrato = contratos?.find((c: any) => c.status === 'ativo') || contratos?.[0]


  const { data: aulas } = await supabase
    .from('aulas')
    .select('*, contratos!inner(tipo_contrato)')
    .eq('contrato_id', contrato?.id || 0)
    .order('data_hora')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('contrato_id', contrato?.id || 0)
    .order('parcela_num')

  const { data: remarcacoes } = await supabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', id)
    .order('mes', { ascending: false })
    .limit(3)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes_habilidades')
    .select('*')
    .eq('aluno_id', id)
    .order('mes_referencia', { ascending: false })
    .limit(1)

  const currentAvaliacao = avaliacoes?.[0]

  const progresso = contrato ? (contrato.aulas_dadas / contrato.aulas_totais) * 100 : 0

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <Link href="/professor/alunos" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Lista
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl lms-gradient flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-500/20">
              {aluno.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{aluno.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">Aluno</Badge>
                {contrato?.status_financeiro === 'pendente' && (
                  <Badge variant="warning" className="bg-amber-100 text-amber-700 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-amber-500/20">
                    <AlertCircle className="w-3 h-3 mr-1" /> PAGAMENTO PENDENTE
                  </Badge>
                )}
                {aluno.data_inscricao && (
                  <Badge variant="outline" className="border-slate-200 text-slate-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    Inscrito em {formatDateOnly(aluno.data_inscricao)}
                  </Badge>
                )}
                {!contrato && (
                  <Badge variant="destructive" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest">Sem Contrato Ativo</Badge>
                )}
              </div>
            </div>

          </div>
          <div className="flex items-center gap-3">
            {contrato?.status_financeiro === 'pendente' && (
               <div className="hidden md:flex flex-col items-end mr-2">
                 <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Atenção</p>
                 <p className="text-[10px] font-bold text-slate-400">Regularize o financeiro antes de renovar</p>
               </div>
            )}
            <Link href={`/professor/alunos/${id}/perfil`}>
              <Button variant="outline" className="h-12 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">Editar Perfil</Button>
            </Link>
            <Link href={`/professor/alunos/${id}/contrato/novo`}>
              <Button className="h-12 px-6 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">Novo Contrato</Button>
            </Link>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="glass-card border-none overflow-hidden hover:shadow-xl transition-all">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100/50">
              <CardTitle className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                <div className="overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{aluno.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                  <p className="text-xs font-bold text-slate-700">{aluno.phone || 'Não inf.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Fingerprint className="w-4 h-4" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                  <p className="text-xs font-bold text-slate-700">{aluno.cpf || 'Não inf.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nascimento</p>
                  <p className="text-xs font-bold text-slate-700">{formatDateOnly(aluno.birth_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none overflow-hidden hover:shadow-xl transition-all">
            <CardHeader className="pb-4 bg-indigo-50 border-b border-indigo-100/50">
              <CardTitle className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-3 h-3" /> Skill Evolution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <SkillsRadar data={avaliacoes || []} />
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Atualizar Avaliação (Mensal)</p>
                <SkillEvaluationForm alunoId={id} initialData={currentAvaliacao} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Active Contract View */}
          {contrato ? (
            <Card className="glass-card border-none overflow-hidden hover:shadow-2xl transition-all">
              <div className="lms-gradient h-2 shadow-inner" />
              <CardContent className="p-10">
                <div className="flex flex-col md:flex-row justify-between gap-10">
                  <div className="space-y-8 flex-1">
                    <div className="flex flex-wrap gap-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Semestre Ativo</p>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            {contrato.semestre} {contrato.ano}
                            <StatusContratoSelect contrato={contrato} />
                          </h4>

                        </div>
                        <Link href={`/professor/alunos/${id}/contrato/editar`}>
                          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">Editar Contrato</Button>
                        </Link>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Programa de Estudo</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-white border-none py-1.5 px-4 text-[10px] font-black tracking-widest shadow-lg shadow-blue-500/20">{contrato.planos?.freq_semana}x / SEMANA</Badge>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">|</span>
                          <span className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-blue-500" /> {contrato.nivel_atual}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Progresso de Aulas</p>
                        <p className="text-xl font-black text-blue-600 tracking-tight">{contrato.aulas_dadas} <span className="text-slate-300 font-medium">/ {contrato.aulas_totais}</span></p>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-2xl p-1 relative overflow-hidden group">
                        <div 
                          className="h-full lms-gradient rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-1000"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Lecionadas</span>
                        <span>{Math.round(progresso)}% Concluído</span>
                        <span>Faltantes: {contrato.aulas_restantes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-64 bg-slate-50/50 rounded-[2.5rem] p-8 space-y-6 self-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600"><TrendingUp className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aproveitamento</p>
                          <p className="text-xs font-black text-slate-900">Excelente</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600"><BookOpen className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Livro Atual</p>
                          <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">{contrato.livro_atual || 'Não def.'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600"><Clock className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Horário Base</p>
                          <p className="text-xs font-black text-slate-900">{contrato.horario || '--:--'}h</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
              <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-4 mb-10">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
                <h3 className="text-xl font-black text-amber-900 tracking-tight">Finalizar Cadastro: Novo Contrato</h3>
                <p className="text-amber-800/70 font-medium max-w-md">Para que o aluno possa acessar as aulas e realizar pagamentos, você precisa configurar o contrato inicial abaixo.</p>
              </div>
              
              <ContratoForm 
                alunoId={id} 
                defaultNivel={aluno.nivel} 
              />
            </div>
          )}


          {/* Pagamentos View */}
          <Card className="glass-card border-none overflow-hidden">
            <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
                Fluxo de Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcela</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos?.map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-slate-900">{p.parcela_num}</span>
                          <span className="text-[10px] font-bold text-slate-300"> / 6</span>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-700 text-sm">
                          {formatCurrency(p.valor)}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            {formatDate(p.data_vencimento)}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <Badge variant={
                            p.status === 'pago' ? 'success' :
                            p.status === 'atrasado' ? 'destructive' :
                            p.status === 'pendente' ? 'warning' : 'outline'
                          } className="px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {p.mercadopago_id && (
                            <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black uppercase tracking-tighter">MP: {p.mercadopago_id}</Badge>
                          )}
                          {!p.mercadopago_id && p.status !== 'pago' && (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aguardando Bricks</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Contratos */}
          <Card className="glass-card border-none overflow-hidden hover:shadow-xl transition-all">
            <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100/50">
              <CardTitle className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
                Histórico de Contratos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Tipo</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratos?.map((c: any) => (
                      <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${c.status === 'ativo' ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-8 py-5">
                          <p className="text-sm font-black text-slate-900">#{c.id}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{c.tipo_contrato}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-700">{formatDateOnly(c.data_inicio)} — {formatDateOnly(c.data_fim)}</p>
                          <p className="text-[9px] font-medium text-slate-400">{c.semestre} {c.ano}</p>
                        </td>
                        <td className="px-8 py-5">
                          <Badge variant="outline" className="border-slate-200 text-slate-500 text-[9px] font-black uppercase">
                            {c.planos?.freq_semana}x/semana
                          </Badge>
                        </td>
                        <td className="px-8 py-5">
                          <Badge variant={
                            c.status === 'ativo' ? 'success' :
                            c.status === 'vencido' ? 'outline' :
                            c.status === 'cancelado' ? 'destructive' : 'warning'
                          } className="px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Link href={`/professor/alunos/${id}/contrato/editar?id=${c.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">Detalhes</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {(!contratos || contratos.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center">
                          <p className="text-xs font-medium text-slate-400">Nenhum contrato encontrado para este aluno.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Aulas */}
          <Card className="glass-card border-none overflow-hidden">
            <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100/50">
              <CardTitle className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
                Timeline de Aulas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AulasTimeline 
                aulas={aulas || []} 
                showStudentName={false} 
                showContractType={true} 
                isProfessor={true}
              />
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-1">Zona de Perigo</h4>
                <p className="text-xs font-medium text-slate-500">Excluir este aluno apagará permanentemente todos os seus dados e registros.</p>
              </div>
            </div>
            <DeleteAlunoBtn alunoId={id} alunoNome={aluno.full_name} />
          </div>
        </div>
      </div>
    </div>
  )
}
