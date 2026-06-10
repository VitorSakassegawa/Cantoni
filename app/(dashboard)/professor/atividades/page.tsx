'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  atribuirAtividade,
  corrigirAtividade,
  excluirAtividade,
  gerarAtividadeIA,
  importarAtividadePDF,
  salvarAtividade,
} from '@/lib/actions/atividades'
import {
  ATIVIDADE_NIVEIS,
  QUESTAO_TIPOS,
  QUESTAO_TIPO_LABELS,
  type AtividadeNivel,
  type Questao,
  type QuestaoTipo,
} from '@/lib/atividades-utils'
import { ClipboardList, FileUp, Loader2, Plus, Send, Sparkles, Trash2, Users } from 'lucide-react'

type AtividadeRow = {
  id: string
  titulo: string
  descricao: string | null
  nivel: AtividadeNivel | null
  tipo_fonte: string
  questoes: Questao[]
  created_at: string
}

type AtribuicaoRow = {
  id: string
  atividade_id: string
  aluno_id: string
  status: 'pendente' | 'entregue' | 'corrigida'
  nota: number | null
  acertos: number | null
  total_objetivas: number | null
  respostas: Array<{ id: number; valor: unknown }> | null
  due_date: string | null
  feedback: string | null
}

type StudentRow = { id: string; full_name: string | null }

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado'
}

const GENERATION_PHRASES = [
  'A IA está escrevendo questões inéditas para você...',
  'Calibrando dificuldade no nível escolhido...',
  'Montando alternativas e gabarito...',
  'Quase pronto — revisão é com você!',
]

export default function ProfessorAtividadesPage() {
  const [atividades, setAtividades] = useState<AtividadeRow[]>([])
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  // criar com IA
  const [createOpen, setCreateOpen] = useState(false)
  const [tema, setTema] = useState('')
  const [nivel, setNivel] = useState<AtividadeNivel>('B1')
  const [tipos, setTipos] = useState<QuestaoTipo[]>(['multipla_escolha', 'lacunas', 'verdadeiro_falso'])
  const [quantidade, setQuantidade] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [draft, setDraft] = useState<{ titulo: string; nivel: AtividadeNivel; questoes: Questao[] } | null>(null)
  const [draftFonte, setDraftFonte] = useState<'ia' | 'pdf'>('ia')
  const [createMode, setCreateMode] = useState<'ia' | 'pdf'>('ia')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // atribuir
  const [assignFor, setAssignFor] = useState<AtividadeRow | null>(null)
  const [selectedAlunos, setSelectedAlunos] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)

  // entregas / correção
  const [reviewFor, setReviewFor] = useState<AtividadeRow | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})
  const [gradingId, setGradingId] = useState<string | null>(null)

  const supabase = createClient()

  const loadAll = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true)
    const [{ data: ats }, { data: atrs }, { data: alunos }] = await Promise.all([
      supabase.from('atividades').select('*').order('created_at', { ascending: false }),
      supabase.from('atividade_atribuicoes').select('*').order('assigned_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'aluno').order('full_name'),
    ])
    if (!isActive()) return
    setAtividades((ats as AtividadeRow[]) || [])
    setAtribuicoes((atrs as AtribuicaoRow[]) || [])
    setStudents((alunos as StudentRow[]) || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let active = true
    void loadAll(() => active)
    return () => {
      active = false
    }
  }, [loadAll])

  useEffect(() => {
    if (!generating) {
      setPhraseIdx(0)
      return
    }
    const id = setInterval(() => setPhraseIdx((v) => v + 1), 3500)
    return () => clearInterval(id)
  }, [generating])

  function toggleTipo(tipo: QuestaoTipo) {
    setTipos((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]))
  }

  async function handleGerar() {
    setGenerating(true)
    try {
      const result = await gerarAtividadeIA({ tema, nivel, tipos, quantidade })
      setDraft(result)
      setDraftFonte('ia')
      toast.success(`${result.questoes.length} questões geradas — revise antes de salvar.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  async function handleImportarPdf() {
    if (!pdfFile) return
    setGenerating(true)
    try {
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('nivel', nivel)
      const result = await importarAtividadePDF(formData)
      setDraft(result)
      setDraftFonte('pdf')
      toast.success(`${result.questoes.length} questões extraídas do PDF — revise antes de salvar.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  async function handleSalvarDraft() {
    if (!draft) return
    setSaving(true)
    try {
      await salvarAtividade({ titulo: draft.titulo, nivel: draft.nivel, questoes: draft.questoes, tipoFonte: draftFonte })
      toast.success('Atividade salva no repositório!')
      setCreateOpen(false)
      setDraft(null)
      setTema('')
      void loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function removeDraftQuestao(id: number) {
    setDraft((prev) =>
      prev ? { ...prev, questoes: prev.questoes.filter((q) => q.id !== id) } : prev
    )
  }

  async function handleExcluir(atividade: AtividadeRow) {
    try {
      await excluirAtividade(atividade.id)
      toast.success('Atividade excluída.')
      setConfirmDelete(null)
      void loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }
  const [confirmDelete, setConfirmDelete] = useState<AtividadeRow | null>(null)

  async function handleAtribuir() {
    if (!assignFor) return
    setAssigning(true)
    try {
      const result = await atribuirAtividade({
        atividadeId: assignFor.id,
        alunoIds: Array.from(selectedAlunos),
        dueDate: dueDate || null,
      })
      toast.success(
        result.puladas > 0
          ? `${result.atribuidas} atribuída(s); ${result.puladas} já tinham esta atividade pendente.`
          : `Atividade atribuída a ${result.atribuidas} aluno(s)!`
      )
      setAssignFor(null)
      setSelectedAlunos(new Set())
      setDueDate('')
      void loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAssigning(false)
    }
  }

  async function handleCorrigir(atribuicao: AtribuicaoRow) {
    setGradingId(atribuicao.id)
    try {
      await corrigirAtividade({
        atribuicaoId: atribuicao.id,
        feedback: feedbacks[atribuicao.id] || null,
      })
      toast.success('Correção registrada — o aluno já pode ver o feedback.')
      void loadAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setGradingId(null)
    }
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name || 'Aluno'
  const atribuicoesDe = (atividadeId: string) => atribuicoes.filter((a) => a.atividade_id === atividadeId)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 p-10 rounded-[3rem] border border-slate-200 shadow-xl backdrop-blur-md">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" /> Repositório inteligente
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Atividades <span className="text-indigo-600">com IA</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg">
            Gere exercícios sob medida, salve como modelos reutilizáveis e atribua aos alunos com correção automática.
          </p>
        </div>
        <Button
          onClick={() => {
            setDraft(null)
            setCreateOpen(true)
          }}
          className="h-14 px-8 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Criar com IA
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-white rounded-[2.5rem] border border-slate-100 italic text-slate-400">
          Carregando repositório...
        </div>
      ) : atividades.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 space-y-3">
          <ClipboardList className="w-12 h-12 mx-auto text-indigo-300" />
          <p className="text-lg font-black text-slate-700">Seu repositório está vazio</p>
          <p className="text-sm text-slate-400 font-medium">
            Clique em &quot;Criar com IA&quot; e descreva o tema — a primeira atividade fica pronta em segundos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {atividades.map((atividade) => {
            const atrs = atribuicoesDe(atividade.id)
            const pendentesCorrecao = atrs.filter((a) => a.status === 'entregue').length
            return (
              <div key={atividade.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">{atividade.titulo}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[11px] font-black uppercase">
                        {atividade.nivel || '—'}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] font-bold text-slate-500">
                        {atividade.questoes.length} questões
                      </Badge>
                      <Badge variant="outline" className="text-[11px] font-bold text-slate-500 uppercase">
                        {atividade.tipo_fonte}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmDelete(atividade)}
                    aria-label={`Excluir atividade ${atividade.titulo}`}
                    className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    onClick={() => {
                      setAssignFor(atividade)
                      setSelectedAlunos(new Set())
                      setDueDate('')
                    }}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Atribuir
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setReviewFor(atividade)}
                    className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest flex items-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Entregas ({atrs.length})
                    {pendentesCorrecao > 0 ? (
                      <span className="ml-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-black">
                        {pendentesCorrecao} p/ corrigir
                      </span>
                    ) : null}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- Criar com IA ---- */}
      <Dialog open={createOpen} onOpenChange={(open) => !generating && setCreateOpen(open)}>
        <DialogContent className="sm:max-w-[640px] rounded-[2.5rem] border-none shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Criar atividade com IA
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Descreva o tema e o nível — a IA escreve as questões e você revisa antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {!draft ? (
            generating ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <p key={phraseIdx} className="text-sm font-medium text-slate-500 animate-in fade-in duration-500">
                  {GENERATION_PHRASES[phraseIdx % GENERATION_PHRASES.length]}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex gap-2">
                  {([
                    { mode: 'ia' as const, label: 'Gerar do zero', icon: Sparkles },
                    { mode: 'pdf' as const, label: 'Importar PDF', icon: FileUp },
                  ]).map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCreateMode(mode)}
                      aria-pressed={createMode === mode}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-black uppercase tracking-wide transition-all ${
                        createMode === mode
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-indigo-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>

                {createMode === 'pdf' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pdf-file" className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Arquivo PDF (até 6 MB)
                      </Label>
                      <Input
                        id="pdf-file"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="h-11 rounded-xl pt-2"
                      />
                      <p className="text-xs font-medium text-slate-400">
                        A IA lê o documento, extrai as questões e resolve o gabarito quando ele não estiver no PDF.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nivel-pdf" className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Nível CEFR
                      </Label>
                      <select
                        id="nivel-pdf"
                        value={nivel}
                        onChange={(e) => setNivel(e.target.value as AtividadeNivel)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm"
                      >
                        {ATIVIDADE_NIVEIS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => void handleImportarPdf()}
                        disabled={!pdfFile}
                        className="h-12 px-8 rounded-xl lms-gradient text-white font-black text-xs uppercase tracking-widest"
                      >
                        <FileUp className="w-4 h-4 mr-2" /> Extrair questões
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                <>
                <div className="space-y-2">
                  <Label htmlFor="tema" className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Tema / instruções
                  </Label>
                  <Textarea
                    id="tema"
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    placeholder="Ex.: Past Simple vs Present Perfect com vocabulário de viagens"
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nivel-select" className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Nível CEFR
                    </Label>
                    <select
                      id="nivel-select"
                      value={nivel}
                      onChange={(e) => setNivel(e.target.value as AtividadeNivel)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm"
                    >
                      {ATIVIDADE_NIVEIS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade" className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Nº de questões
                    </Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min={3}
                      max={15}
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Tipos de questão</p>
                  <div className="flex flex-wrap gap-2">
                    {QUESTAO_TIPOS.map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => toggleTipo(tipo)}
                        aria-pressed={tipos.includes(tipo)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                          tipos.includes(tipo)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {QUESTAO_TIPO_LABELS[tipo]}
                      </button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => void handleGerar()}
                    disabled={!tema.trim() || tipos.length === 0}
                    className="h-12 px-8 rounded-xl lms-gradient text-white font-black text-xs uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Gerar questões
                  </Button>
                </DialogFooter>
                </>
                )}
              </div>
            )
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="draft-titulo" className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Título
                </Label>
                <Input
                  id="draft-titulo"
                  value={draft.titulo}
                  onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                  className="h-11 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {draft.questoes.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[11px] font-bold text-indigo-600 shrink-0">
                        {QUESTAO_TIPO_LABELS[q.tipo]}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeDraftQuestao(q.id)}
                        aria-label={`Remover questão ${q.id}`}
                        className="text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{q.id}. {q.enunciado}</p>
                    {q.tipo === 'multipla_escolha' && q.opcoes ? (
                      <p className="text-xs text-slate-500">
                        {q.opcoes.map((o, i) => (i === q.respostaIndice ? `✓ ${o}` : o)).join(' • ')}
                      </p>
                    ) : null}
                    {q.tipo === 'verdadeiro_falso' ? (
                      <p className="text-xs text-slate-500">Resposta: {q.respostaBool ? 'Verdadeiro' : 'Falso'}</p>
                    ) : null}
                    {q.tipo === 'lacunas' ? (
                      <p className="text-xs text-slate-500">Resposta: {q.respostaTexto}</p>
                    ) : null}
                    {q.tipo === 'ordenar' && q.itens ? (
                      <p className="text-xs text-slate-500">Ordem correta: {q.itens.join(' → ')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                  className="rounded-xl font-bold text-slate-500"
                >
                  Gerar de novo
                </Button>
                <Button
                  onClick={() => void handleSalvarDraft()}
                  disabled={saving || draft.questoes.length === 0}
                  className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest"
                >
                  {saving ? 'Salvando...' : `Salvar no repositório (${draft.questoes.length})`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Atribuir ---- */}
      <Dialog open={Boolean(assignFor)} onOpenChange={(open) => !open && setAssignFor(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Atribuir &quot;{assignFor?.titulo}&quot;</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Escolha os alunos e (opcional) um prazo de entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAlunos.has(s.id)}
                    onChange={(e) => {
                      setSelectedAlunos((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(s.id)
                        else next.delete(s.id)
                        return next
                      })
                    }}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-slate-700">{s.full_name}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-xs font-black uppercase tracking-widest text-slate-500">
                Prazo (opcional)
              </Label>
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void handleAtribuir()}
              disabled={assigning || selectedAlunos.size === 0}
              className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest"
            >
              {assigning ? 'Atribuindo...' : `Atribuir a ${selectedAlunos.size} aluno(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Entregas / correção ---- */}
      <Dialog open={Boolean(reviewFor)} onOpenChange={(open) => !open && setReviewFor(null)}>
        <DialogContent className="sm:max-w-[640px] rounded-[2.5rem] border-none shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Entregas — {reviewFor?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {reviewFor && atribuicoesDe(reviewFor.id).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400 font-medium">Nenhuma atribuição ainda.</p>
            ) : null}
            {reviewFor
              ? atribuicoesDe(reviewFor.id).map((atr) => {
                  const dissertativas = (reviewFor.questoes || []).filter((q) => q.tipo === 'dissertativa')
                  const respostaDe = (qid: number) =>
                    (atr.respostas || []).find((r) => r.id === qid)?.valor as string | undefined
                  return (
                    <div key={atr.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-800">{studentName(atr.aluno_id)}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={atr.status === 'corrigida' ? 'success' : atr.status === 'entregue' ? 'warning' : 'secondary'}
                            className="text-[11px] font-black uppercase"
                          >
                            {atr.status}
                          </Badge>
                          {atr.total_objetivas ? (
                            <Badge variant="outline" className="text-[11px] font-bold text-slate-500">
                              {atr.acertos}/{atr.total_objetivas} objetivas
                            </Badge>
                          ) : null}
                          {atr.nota !== null ? (
                            <Badge variant="outline" className="text-[11px] font-bold text-indigo-600">
                              Nota {Number(atr.nota).toFixed(1)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {atr.status === 'entregue' ? (
                        <div className="space-y-3 border-t border-slate-200 pt-3">
                          {dissertativas.map((q) => (
                            <div key={q.id} className="space-y-1">
                              <p className="text-xs font-bold text-slate-500">{q.enunciado}</p>
                              <p className="text-sm font-medium text-slate-800 bg-white rounded-xl p-3 border border-slate-100">
                                {respostaDe(q.id) || '(sem resposta)'}
                              </p>
                            </div>
                          ))}
                          <Textarea
                            value={feedbacks[atr.id] || ''}
                            onChange={(e) => setFeedbacks((prev) => ({ ...prev, [atr.id]: e.target.value }))}
                            placeholder="Feedback para o aluno (opcional)"
                            className="rounded-xl min-h-[70px] text-sm"
                            aria-label={`Feedback para ${studentName(atr.aluno_id)}`}
                          />
                          <Button
                            onClick={() => void handleCorrigir(atr)}
                            disabled={gradingId === atr.id}
                            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest"
                          >
                            {gradingId === atr.id ? 'Salvando...' : 'Concluir correção'}
                          </Button>
                        </div>
                      ) : null}
                      {atr.status === 'corrigida' && atr.feedback ? (
                        <p className="text-xs text-slate-500 italic border-t border-slate-200 pt-2">
                          Feedback enviado: {atr.feedback}
                        </p>
                      ) : null}
                    </div>
                  )
                })
              : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Confirmar exclusão ---- */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Excluir esta atividade?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              &quot;{confirmDelete?.titulo}&quot; e todas as atribuições/entregas associadas serão removidas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="rounded-xl font-bold text-slate-500">
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDelete && void handleExcluir(confirmDelete)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
