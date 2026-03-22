'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Sparkles, 
  Search, 
  RotateCcw, 
  ChevronRight, 
  History, 
  Target, 
  Award,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { requestNewPlacementTest } from '@/lib/actions/placement-test'
import ReactMarkdown from 'react-markdown'

export default function ProfessorNivelamentoPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'aluno')
      .order('full_name')

    if (error) {
      toast.error('Erro ao carregar alunos')
    } else {
      setStudents(data || [])
    }
    setLoading(false)
  }

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
      setHistory(data || [])
    }
    setLoadingHistory(false)
  }

  async function handleReset(student: any) {
    if (!confirm(`Deseja solicitar um novo teste para ${student.full_name}?`)) return
    
    try {
      await requestNewPlacementTest(student.id)
      toast.success('Novo teste solicitado com sucesso!')
      fetchStudents()
      if (selectedStudent?.id === student.id) {
        setSelectedStudent({ ...student, placement_test_completed: false })
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar teste')
    }
  }

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-10 rounded-[3rem] border border-white/60 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
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
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    selectedStudent?.id === student.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {student.cefr_level || 'A1'}
                  </span>
                  {!student.placement_test_completed && (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
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
            <div className="h-[600px] bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-70">
              <Target className="w-16 h-16 stroke-[1.5]" />
              <p className="font-bold tracking-tight text-lg">Selecione um aluno para ver detalhes</p>
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
                <div className="relative z-10 flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Nível Atual</p>
                    <p className="text-3xl font-black">{selectedStudent.cefr_level || 'A1'}</p>
                  </div>
                  <Button 
                    onClick={() => handleReset(selectedStudent)}
                    className="h-14 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-400" />
                    Solicitar Re-nivelamento
                  </Button>
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
                    {history.map((test, index) => (
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
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
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
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Insights da IA Pedagógica</p>
                            </div>
                            <div className="prose prose-sm prose-indigo max-w-none text-slate-600 leading-relaxed font-medium markdown-insights">
                              <ReactMarkdown>
                                {test.insights || '*Nenhum insight disponível para este teste.*'}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Detailed Q&A Breakdown */}
                          {test.answers && test.answers.length > 0 && test.answers[0].question && (
                            <div className="pt-4 space-y-4">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                Detalhamento de Questões ({test.answers.length})
                              </h4>
                              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {test.answers.map((ans: any, idx: number) => (
                                  <div key={idx} className={`p-5 rounded-3xl border-2 ${ans.correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} text-sm shadow-sm`}>
                                    <div className="flex items-start gap-3">
                                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${ans.correct ? 'bg-emerald-500' : 'bg-rose-500'} mt-0.5`}>
                                        {idx + 1}
                                      </span>
                                      <div className="space-y-3 flex-1">
                                        <p className="font-bold text-slate-800 leading-snug">{ans.question}</p>
                                        <div className="space-y-1.5 bg-white/60 p-3 rounded-2xl">
                                          <p className={`text-xs font-semibold ${ans.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            <span className="opacity-70 font-black uppercase tracking-widest text-[9px] mr-2">Aluno marcou:</span> 
                                            {ans.options ? ans.options[ans.selected] : `Opção ${ans.selected}`}
                                          </p>
                                          {!ans.correct && typeof ans.correctAnswer === 'number' && ans.options && (
                                            <p className="text-xs font-semibold text-emerald-700">
                                              <span className="opacity-70 font-black uppercase tracking-widest text-[9px] mr-2">Correta:</span> 
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
