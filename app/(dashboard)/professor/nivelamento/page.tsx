'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Sparkles, 
  Search, 
  RotateCcw, 
  ChevronRight, 
  History, 
  Target, 
  Award,
  BookOpen,
  BrainCircuit,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { requestNewPlacementTest, revokePlacementInvite } from '@/lib/actions/placement-test'
import type { PlacementAnswerRecord } from '@/lib/dashboard-types'
import { groupPlacementAnswersByModule, hasDetailedPlacementAnswers, summarizePlacementSkills } from '@/lib/placement-test-utils'
import ReactMarkdown from 'react-markdown'

const SKILL_LABELS: Record<string, string> = {
  grammar: 'Gramática',
  reading: 'Leitura',
  listening: 'Listening',
}

interface PlacementStudent {
  id: string
  full_name: string | null
  email: string | null
  cefr_level: string | null
  placement_test_completed: boolean | null
}

interface PlacementInvite {
  student_id: string
  status: string
  valid_from: string | null
  valid_until: string | null
  created_at: string
}

function describeInvite(invite: PlacementInvite, now = new Date()) {
  const from = invite.valid_from ? new Date(invite.valid_from) : null
  const until = invite.valid_until ? new Date(invite.valid_until) : null
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (until && now.getTime() > until.getTime()) {
    return { label: 'Convite expirado', detail: `Janela encerrou em ${fmt(until)}`, expired: true, scheduled: false }
  }
  if (from && now.getTime() < from.getTime()) {
    return {
      label: 'Convite agendado',
      detail: until ? `Janela de ${fmt(from)} até ${fmt(until)}` : `Libera em ${fmt(from)}`,
      expired: false,
      scheduled: true,
    }
  }
  return {
    label: 'Convite ativo',
    detail: until ? `Válido até ${fmt(until)}` : 'Sem data de expiração',
    expired: false,
    scheduled: false,
  }
}

interface PlacementResult {
  id: string
  created_at: string
  cefr_level: string
  score: number
  total_questions: number
  insights: string | null
  answers: PlacementAnswerRecord[] | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado'
}

function getSelectedOptionLabel(answer: PlacementAnswerRecord) {
  if (!answer.options || typeof answer.selected !== 'number') {
    return `Opção ${answer.selected ?? '-'}`
  }

  return answer.options[answer.selected] ?? `Opção ${answer.selected}`
}

export default function ProfessorNivelamentoPage() {
  const [students, setStudents] = useState<PlacementStudent[]>([])
  const [invites, setInvites] = useState<Record<string, PlacementInvite>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<PlacementStudent | null>(null)
  const [history, setHistory] = useState<PlacementResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [inviteFormOpen, setInviteFormOpen] = useState(false)
  const [inviteFrom, setInviteFrom] = useState('')
  const [inviteUntil, setInviteUntil] = useState('')
  const [savingInvite, setSavingInvite] = useState(false)
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)

  const supabase = createClient()

  // Single loader shared by the initial mount and manual refreshes. `isActive`
  // guards against a setState after unmount when used from the mount effect.
  const loadStudentsAndInvites = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoading(true)
      const [{ data, error }, { data: inviteRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, cefr_level, placement_test_completed')
          .eq('role', 'aluno')
          .order('full_name'),
        supabase
          .from('placement_invites')
          .select('student_id, status, valid_from, valid_until, created_at')
          .eq('status', 'pending'),
      ])

      if (!isActive()) return

      if (error) {
        toast.error('Erro ao carregar alunos')
      } else {
        setStudents((data as PlacementStudent[]) || [])
        const inviteMap: Record<string, PlacementInvite> = {}
        for (const invite of (inviteRows as PlacementInvite[]) || []) {
          inviteMap[invite.student_id] = invite
        }
        setInvites(inviteMap)
      }
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    let active = true
    void loadStudentsAndInvites(() => active)
    return () => {
      active = false
    }
  }, [loadStudentsAndInvites])

  async function loadHistory(studentId: string) {
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('placement_results')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar histórico')
    } else {
      setHistory((data as PlacementResult[]) || [])
    }
    setLoadingHistory(false)
  }

  function openInviteForm() {
    setInviteFrom('')
    setInviteUntil('')
    setInviteFormOpen(true)
  }

  async function handleInvite(student: PlacementStudent) {
    setSavingInvite(true)
    try {
      // Date inputs give YYYY-MM-DD; open at local midnight, close at local end-of-day.
      const validFrom = inviteFrom ? new Date(`${inviteFrom}T00:00:00`).toISOString() : null
      const validUntil = inviteUntil ? new Date(`${inviteUntil}T23:59:59`).toISOString() : null
      await requestNewPlacementTest(student.id, { validFrom, validUntil })
      toast.success('Convite de novo teste criado!')
      setInviteFormOpen(false)
      void loadStudentsAndInvites()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingInvite(false)
    }
  }

  // Inline two-step confirm instead of window.confirm — the native dialog is
  // blocked in an installed iOS PWA (standalone), where this app runs.
  async function handleRevoke(student: PlacementStudent) {
    try {
      await revokePlacementInvite(student.id)
      toast.success('Convite revogado.')
      setConfirmingRevoke(false)
      void loadStudentsAndInvites()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    }
  }

  const filteredStudents = students.filter((student) => 
    student.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    student.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 p-10 rounded-[3rem] border border-slate-200 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" /> Gestão Pedagógica
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mapeamento & <span className="text-blue-600">Nivelamento</span></h1>
          <p className="text-slate-500 font-medium max-w-lg">Acompanhe o progresso CEFR dos seus alunos e gerencie solicitações de novos testes técnicos.</p>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar aluno..."
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Student List */}
        <div className="lg:col-span-4 space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 italic text-slate-400">Carregando alunos...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 italic text-slate-400">Nenhum aluno encontrado</div>
          ) : filteredStudents.map(student => (
            <button
              key={student.id}
              onClick={() => {
                setSelectedStudent(student)
                setConfirmingRevoke(false)
                loadHistory(student.id)
              }}
              className={`w-full text-left p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                selectedStudent?.id === student.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-lg'
              }`}
            >
              <div className="space-y-1">
                <p className="font-bold text-sm tracking-tight">{student.full_name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    selectedStudent?.id === student.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {student.cefr_level || 'A1'}
                  </span>
                  {invites[student.id] ? (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      describeInvite(invites[student.id]).expired
                        ? 'text-slate-400 bg-slate-100'
                        : describeInvite(invites[student.id]).scheduled
                          ? 'text-indigo-500 bg-indigo-50'
                          : 'text-emerald-600 bg-emerald-50'
                    }`}>
                      <Calendar className="w-2.5 h-2.5" /> {describeInvite(invites[student.id]).label}
                    </span>
                  ) : !student.placement_test_completed && (
                    <span className="text-[11px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <RotateCcw className="w-2.5 h-2.5" /> Pendente
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${selectedStudent?.id === student.id ? 'translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
            </button>
          ))}
        </div>

        {/* Details Area */}
        <div className="lg:col-span-8">
          {!selectedStudent ? (
            <div className="h-[600px] bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Target className="w-16 h-16 stroke-[1.5] text-blue-500/50" />
              <p className="font-black tracking-tighter text-xl uppercase tracking-widest opacity-50">Selecione um aluno</p>
              <p className="text-sm font-medium text-slate-400">para visualizar o histórico completo</p>
            </div>
          ) : (
            <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
              {/* Profile Bar */}
              <div className="bg-slate-900 p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">{selectedStudent.full_name}</h2>
                  <p className="text-slate-400 text-sm font-medium">{selectedStudent.email}</p>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-right sm:mr-2">
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Nível Atual</p>
                    <p className="text-3xl font-black">{selectedStudent.cefr_level || 'A1'}</p>
                  </div>
                  {invites[selectedStudent.id] ? (
                    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-5 py-3 border border-white/10">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                          {describeInvite(invites[selectedStudent.id]).label}
                        </p>
                        <p className="text-[11px] font-medium text-slate-300">
                          {describeInvite(invites[selectedStudent.id]).detail}
                        </p>
                      </div>
                      {confirmingRevoke ? (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleRevoke(selectedStudent)}
                            className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] uppercase tracking-widest"
                          >
                            Confirmar
                          </Button>
                          <Button
                            onClick={() => setConfirmingRevoke(false)}
                            className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-[11px] uppercase tracking-widest"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setConfirmingRevoke(true)}
                          className="h-10 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] uppercase tracking-widest"
                        >
                          Revogar
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={openInviteForm}
                      className="h-14 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4 text-blue-400" />
                      Convidar para Re-nivelamento
                    </Button>
                  )}
                </div>
              </div>

              {/* History & Insights */}
              <div className="p-10 space-y-10">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Histórico de Mapeamentos</h3>
                </div>

                {loadingHistory ? (
                  <div className="py-20 text-center text-slate-400 animate-pulse font-medium italic">Consultando registros históricos...</div>
                ) : history.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed font-medium">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    Este aluno ainda não realizou nenhum teste.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {history.map((test, index) => {
                      const detailedAnswers = test.answers ?? []
                      const hasDetailedAnswers = hasDetailedPlacementAnswers(detailedAnswers)
                      const skillSummary = summarizePlacementSkills(detailedAnswers)

                      return (
                      <div key={test.id} className="relative pl-10 group">
                        {/* Timeline line */}
                        {index < history.length - 1 && (
                          <div className="absolute left-[19px] top-10 bottom-[-40px] w-0.5 bg-slate-100 group-last:hidden" />
                        )}
                        
                        {/* Dot */}
                        <div className="absolute left-0 top-1.5 w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center z-10 group-hover:border-blue-400 transition-colors shadow-sm">
                          <Award className={`w-5 h-5 ${index === 0 ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>

                        <div className="space-y-6">
                          {/* Test Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(test.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </p>
                              <div className="flex items-center gap-3">
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">CEFR {test.cefr_level}</h4>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full italic shadow-sm">
                                  {test.score}/{test.total_questions} pontos
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* AI Insight Card */}
                          <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner relative overflow-hidden group/card">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <BrainCircuit className="w-16 h-16 text-indigo-800" />
                            </div>
                            <div className="flex items-center gap-2 mb-4 text-indigo-700">
                              <BrainCircuit className="w-4 h-4" />
                              <p className="text-xs font-black uppercase tracking-[0.2em]">Insights da IA Pedagógica</p>
                            </div>
                            <div className="prose prose-sm prose-indigo max-w-none text-slate-600 leading-relaxed font-medium markdown-insights">
                              <ReactMarkdown>
                                {test.insights || '*Nenhum insight disponível para este teste.*'}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Per-skill breakdown (computed from module-tagged answers) */}
                          {skillSummary.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-3">
                              {skillSummary.map((skill) => (
                                <div key={skill.module} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                    <span>{SKILL_LABELS[skill.module] || skill.module}</span>
                                    <span className="text-slate-400">{skill.score}/{skill.total}</span>
                                  </div>
                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(skill.ratio * 100)}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Detailed Q&A Breakdown */}
                          {hasDetailedAnswers && (
                            <div className="pt-4 space-y-4">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                Detalhamento de Questões ({detailedAnswers.length})
                              </h4>
                              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {groupPlacementAnswersByModule(detailedAnswers).map((group) => (
                                <div key={group.module} className="space-y-3">
                                  <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 pt-1">
                                    {SKILL_LABELS[group.module] || 'Outras questões'}
                                    <span className="ml-2 text-slate-400 normal-case tracking-normal font-bold">
                                      {group.items.filter((a) => a.correct).length}/{group.items.length} corretas
                                    </span>
                                  </p>
                                  <div className="grid grid-cols-1 gap-3">
                                {group.items.map((ans, idx) => (
                                  <div key={idx} className={`p-5 rounded-3xl border-2 ${ans.correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} text-sm shadow-sm`}>
                                    <div className="flex items-start gap-3">
                                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${ans.correct ? 'bg-emerald-500' : 'bg-rose-500'} mt-0.5`}>
                                        {idx + 1}
                                      </span>
                                      <div className="space-y-3 flex-1">
                                        <p className="font-bold text-slate-800 leading-snug">{ans.question}</p>
                                        <div className="space-y-1.5 bg-white/60 p-3 rounded-2xl">
                                          <p className={`text-xs font-semibold ${ans.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            <span className="opacity-70 font-black uppercase tracking-widest text-[11px] mr-2">Aluno marcou:</span> 
                                            {getSelectedOptionLabel(ans)}
                                          </p>
                                          {!ans.correct && typeof ans.correctAnswer === 'number' && ans.options && (
                                            <p className="text-xs font-semibold text-emerald-700">
                                              <span className="opacity-70 font-black uppercase tracking-widest text-[11px] mr-2">Correta:</span> 
                                              {ans.options[ans.correctAnswer]}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                  </div>
                                </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {detailedAnswers.length > 0 && !hasDetailedAnswers && (
                            <div className="pt-4">
                              <div className="p-5 rounded-3xl border border-slate-100 bg-slate-50 text-sm text-slate-500 font-medium">
                                Este registro e antigo e nao possui o detalhamento completo das respostas do aluno. Os novos testes voltaram a salvar perguntas, opcoes e resposta marcada.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite creation modal: optional validity window for the new test */}
      {inviteFormOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !savingInvite && setInviteFormOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 w-full max-w-md space-y-6 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border border-blue-100">
                <Calendar className="w-3 h-3" /> Convite de Re-nivelamento
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedStudent.full_name}</h3>
              <p className="text-sm text-slate-500 font-medium">
                Defina uma janela de validade (opcional). Sem datas, o convite vale até ser usado ou revogado.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="invite-from">Liberar a partir de</label>
                <input
                  id="invite-from"
                  type="date"
                  value={inviteFrom}
                  onChange={(e) => setInviteFrom(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="invite-until">Válido até</label>
                <input
                  id="invite-until"
                  type="date"
                  value={inviteUntil}
                  min={inviteFrom || undefined}
                  onChange={(e) => setInviteUntil(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={() => setInviteFormOpen(false)}
                disabled={savingInvite}
                className="h-12 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleInvite(selectedStudent)}
                disabled={savingInvite}
                className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {savingInvite ? 'Criando...' : 'Criar convite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

