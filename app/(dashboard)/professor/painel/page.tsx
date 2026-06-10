'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getPainelAudio, getQuizQuestions, getVocabDoAluno } from '@/lib/actions/painel'
import {
  INITIAL_PAINEL_STATE,
  PAINEL_CHANNEL,
  formatClock,
  timerRemaining,
  wordCloudSize,
  type PainelState,
  type PainelWidget,
  type PalavraPayload,
  type QuizVotePayload,
  type ReacaoPayload,
  type VotePayload,
} from '@/lib/painel-types'
import {
  BarChart3,
  Cloud,
  Dices,
  Gauge,
  GraduationCap,
  Minus,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trophy,
  Users,
  Volume2,
  Zap,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

const WIDGETS: Array<{ key: PainelWidget; label: string; icon: typeof Timer }> = [
  { key: 'timer', label: 'Timer', icon: Timer },
  { key: 'pronuncia', label: 'Pronúncia', icon: Volume2 },
  { key: 'semaforo', label: 'Semáforo', icon: Gauge },
  { key: 'quiz', label: 'Quiz', icon: Zap },
  { key: 'vocab', label: 'Vocab', icon: GraduationCap },
  { key: 'enquete', label: 'Enquete', icon: BarChart3 },
  { key: 'sorteio', label: 'Sorteio', icon: Dices },
  { key: 'wordcloud', label: 'Nuvem', icon: Cloud },
  { key: 'placar', label: 'Placar', icon: Trophy },
]

type QuizQuestion = { enunciado: string; opcoes: string[]; corretaIndice: number; atividade: string }
type StudentRow = { id: string; full_name: string | null }

export default function ProfessorPainelPage() {
  const [state, setState] = useState<PainelState>(INITIAL_PAINEL_STATE)
  const [online, setOnline] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // widget inputs
  const [sorteioText, setSorteioText] = useState('')
  const [enquetePergunta, setEnquetePergunta] = useState('')
  const [enqueteOpcoes, setEnqueteOpcoes] = useState('')
  const [pronText, setPronText] = useState('')
  const [pronLoading, setPronLoading] = useState(false)
  const [wordPrompt, setWordPrompt] = useState('')

  // quiz + vocab data
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [vocabDeck, setVocabDeck] = useState<Array<{ palavra: string; traducao: string }>>([])
  const [vocabIdx, setVocabIdx] = useState(0)
  const [vocabAluno, setVocabAluno] = useState('')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef(state)
  // aggregation refs (professor is the source of truth)
  const enqueteVotersRef = useRef<Set<string>>(new Set())
  const quizVotersRef = useRef<Set<string>>(new Set())
  const reacoesRef = useRef<Map<string, ReacaoPayload['nivel']>>(new Map())
  const wordSubsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const broadcast = useCallback((next: PainelState) => {
    stateRef.current = next
    setState(next)
    void channelRef.current?.send({ type: 'broadcast', event: 'state', payload: next })
  }, [])

  // load repo quiz questions + student list once
  useEffect(() => {
    const supabase = createClient()
    void getQuizQuestions().then(setQuizQuestions).catch(() => {})
    void supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'aluno')
      .order('full_name')
      .then(({ data }) => setStudents((data as StudentRow[]) || []))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(PAINEL_CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: 'professor' } },
    })

    function pushState(next: PainelState) {
      stateRef.current = next
      setState(next)
      void channel.send({ type: 'broadcast', event: 'state', payload: next })
    }

    channel
      .on('broadcast', { event: 'vote' }, ({ payload }) => {
        const vote = payload as VotePayload
        const cur = stateRef.current
        if (!cur.enquete.aberta || typeof vote?.opcao !== 'number' || !vote?.voterId) return
        if (vote.opcao < 0 || vote.opcao >= cur.enquete.opcoes.length) return
        if (enqueteVotersRef.current.has(vote.voterId)) return
        enqueteVotersRef.current.add(vote.voterId)
        const votos = [...cur.enquete.votos]
        votos[vote.opcao] = (votos[vote.opcao] || 0) + 1
        pushState({ ...cur, enquete: { ...cur.enquete, votos } })
      })
      .on('broadcast', { event: 'voteQuiz' }, ({ payload }) => {
        const vote = payload as QuizVotePayload
        const cur = stateRef.current
        if (!cur.quiz.aberta || typeof vote?.opcao !== 'number' || !vote?.voterId) return
        if (vote.opcao < 0 || vote.opcao >= cur.quiz.opcoes.length) return
        if (quizVotersRef.current.has(vote.voterId)) return
        quizVotersRef.current.add(vote.voterId)
        const votos = [...cur.quiz.votos]
        votos[vote.opcao] = (votos[vote.opcao] || 0) + 1
        pushState({ ...cur, quiz: { ...cur.quiz, votos } })
      })
      .on('broadcast', { event: 'reacao' }, ({ payload }) => {
        const r = payload as ReacaoPayload
        const cur = stateRef.current
        if (!cur.semaforo.aberto || !r?.voterId) return
        if (!['ok', 'devagar', 'perdido'].includes(r.nivel)) return
        reacoesRef.current.set(r.voterId, r.nivel) // last choice wins
        const counts = { ok: 0, devagar: 0, perdido: 0 }
        for (const nivel of reacoesRef.current.values()) counts[nivel] += 1
        pushState({ ...cur, semaforo: { ...cur.semaforo, ...counts } })
      })
      .on('broadcast', { event: 'palavra' }, ({ payload }) => {
        const p = payload as PalavraPayload
        const cur = stateRef.current
        const palavra = (p?.palavra || '').trim().toLowerCase().slice(0, 40)
        if (!cur.wordcloud.aberto || !p?.voterId || !palavra) return
        const dedupKey = `${p.voterId}:${palavra}`
        if (wordSubsRef.current.has(dedupKey)) return
        wordSubsRef.current.add(dedupKey)
        const palavras = { ...cur.wordcloud.palavras, [palavra]: (cur.wordcloud.palavras[palavra] || 0) + 1 }
        pushState({ ...cur, wordcloud: { ...cur.wordcloud, palavras } })
      })
      .on('presence', { event: 'sync' }, () => {
        const present = Object.keys(channel.presenceState()).filter((k) => k !== 'professor')
        setOnline(present.length)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ role: 'professor' })
      })

    channelRef.current = channel
    const heartbeat = setInterval(() => {
      void channel.send({ type: 'broadcast', event: 'state', payload: stateRef.current })
    }, 4000)

    return () => {
      clearInterval(heartbeat)
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(tick)
  }, [])

  // ---- timer ----
  function timerStart() {
    const remaining = state.timer.pausedRemaining !== null ? state.timer.pausedRemaining : state.timer.totalSeconds
    broadcast({ ...state, active: 'timer', timer: { ...state.timer, endsAt: Date.now() + remaining * 1000, pausedRemaining: null } })
  }
  function timerPause() {
    broadcast({ ...state, timer: { ...state.timer, endsAt: null, pausedRemaining: timerRemaining(state.timer, now) } })
  }
  function timerReset(totalSeconds?: number) {
    broadcast({ ...state, active: 'timer', timer: { totalSeconds: totalSeconds ?? state.timer.totalSeconds, endsAt: null, pausedRemaining: null } })
  }

  // ---- pronúncia ----
  async function tocarPronuncia() {
    const texto = pronText.trim()
    if (!texto) return
    setPronLoading(true)
    try {
      const audioSrc = await getPainelAudio(texto)
      if (!audioSrc) {
        toast.error('Não foi possível gerar o áudio. Tente novamente.')
        return
      }
      broadcast({ ...state, active: 'pronuncia', pronuncia: { texto, audioSrc, nonce: state.pronuncia.nonce + 1 } })
      toast.success('Áudio enviado para os alunos.')
    } catch {
      toast.error('Falha ao gerar o áudio.')
    } finally {
      setPronLoading(false)
    }
  }
  function repetirPronuncia() {
    if (!state.pronuncia.audioSrc) return
    broadcast({ ...state, active: 'pronuncia', pronuncia: { ...state.pronuncia, nonce: state.pronuncia.nonce + 1 } })
  }

  // ---- semáforo ----
  function abrirSemaforo() {
    reacoesRef.current = new Map()
    broadcast({ ...state, active: 'semaforo', semaforo: { aberto: true, ok: 0, devagar: 0, perdido: 0 } })
  }
  function fecharSemaforo() {
    broadcast({ ...state, semaforo: { ...state.semaforo, aberto: false } })
  }

  // ---- quiz ----
  function lancarQuiz(q: QuizQuestion) {
    quizVotersRef.current = new Set()
    broadcast({
      ...state,
      active: 'quiz',
      quiz: { enunciado: q.enunciado, opcoes: q.opcoes, votos: q.opcoes.map(() => 0), aberta: true, corretaIndice: null },
    })
    // guarda a resposta correta localmente até o "revelar"
    quizCorretaRef.current = q.corretaIndice
  }
  const quizCorretaRef = useRef<number | null>(null)
  function revelarQuiz() {
    broadcast({ ...state, quiz: { ...state.quiz, aberta: false, corretaIndice: quizCorretaRef.current } })
  }

  // ---- vocab ----
  async function carregarVocab(studentId: string) {
    setVocabAluno(studentId)
    try {
      const deck = await getVocabDoAluno(studentId)
      if (deck.length === 0) {
        toast.error('Este aluno ainda não tem vocabulário salvo.')
        return
      }
      setVocabDeck(deck)
      setVocabIdx(0)
      broadcast({ ...state, active: 'vocab', vocab: { palavra: deck[0].palavra, traducao: deck[0].traducao, revelado: false } })
    } catch {
      toast.error('Falha ao carregar o vocabulário.')
    }
  }
  function vocabRevelar() {
    broadcast({ ...state, vocab: { ...state.vocab, revelado: true } })
  }
  function vocabProxima() {
    if (vocabDeck.length === 0) return
    const next = (vocabIdx + 1) % vocabDeck.length
    setVocabIdx(next)
    broadcast({ ...state, active: 'vocab', vocab: { palavra: vocabDeck[next].palavra, traducao: vocabDeck[next].traducao, revelado: false } })
  }

  // ---- sorteio ----
  function sortear() {
    const itens = sorteioText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (itens.length < 2) return
    broadcast({ ...state, active: 'sorteio', sorteio: { itens, resultado: itens[Math.floor(Math.random() * itens.length)] } })
  }

  // ---- enquete ----
  function abrirEnquete() {
    const opcoes = enqueteOpcoes.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!enquetePergunta.trim() || opcoes.length < 2) return
    enqueteVotersRef.current = new Set()
    broadcast({ ...state, active: 'enquete', enquete: { pergunta: enquetePergunta.trim(), opcoes, aberta: true, votos: opcoes.map(() => 0) } })
  }
  function fecharEnquete() {
    broadcast({ ...state, enquete: { ...state.enquete, aberta: false } })
  }

  // ---- wordcloud ----
  function abrirWordcloud() {
    if (!wordPrompt.trim()) return
    wordSubsRef.current = new Set()
    broadcast({ ...state, active: 'wordcloud', wordcloud: { prompt: wordPrompt.trim(), aberto: true, palavras: {} } })
  }
  function fecharWordcloud() {
    broadcast({ ...state, wordcloud: { ...state.wordcloud, aberto: false } })
  }

  // ---- placar ----
  function pontuar(time: 'A' | 'B', delta: number) {
    const placar = { ...state.placar }
    if (time === 'A') placar.pontosA = Math.max(0, placar.pontosA + delta)
    else placar.pontosB = Math.max(0, placar.pontosB + delta)
    broadcast({ ...state, active: 'placar', placar })
  }

  const remaining = timerRemaining(state.timer, now)
  const totalVotos = state.enquete.votos.reduce((a, b) => a + b, 0)
  const totalQuiz = state.quiz.votos.reduce((a, b) => a + b, 0)
  const totalSemaforo = state.semaforo.ok + state.semaforo.devagar + state.semaforo.perdido
  const wordEntries = Object.entries(state.wordcloud.palavras).sort((a, b) => b[1] - a[1])
  const wordMax = wordEntries.length ? wordEntries[0][1] : 1

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 p-10 rounded-[3rem] border border-slate-200 shadow-xl backdrop-blur-md">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            <MonitorPlay className="w-3.5 h-3.5" /> Ao vivo
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Painel <span className="text-indigo-600">interativo</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg">
            O que você ativa aqui aparece na hora na tela do aluno (menu Painel, no portal dele).
          </p>
        </div>
        <Badge variant={online > 0 ? 'success' : 'outline'} className="px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit">
          <Users className="w-3.5 h-3.5" /> {online} aluno(s) conectado(s)
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {WIDGETS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => broadcast({ ...state, active: key })}
            aria-pressed={state.active === key}
            className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
              state.active === key ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        {state.active ? (
          <button type="button" onClick={() => broadcast({ ...state, active: null })} className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-rose-200 hover:text-rose-500">
            Limpar tela
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRONÚNCIA */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'pronuncia' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Volume2 className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Pronúncia ao vivo</h2></div>
          <Label htmlFor="pron-text" className="text-xs font-bold text-slate-400">Texto em inglês (a voz toca no aparelho do aluno)</Label>
          <Textarea id="pron-text" value={pronText} onChange={(e) => setPronText(e.target.value)} placeholder="I would have gone if you had told me." className="rounded-xl min-h-[70px] text-sm font-medium" />
          <div className="flex gap-2">
            <Button onClick={() => void tocarPronuncia()} disabled={pronLoading || !pronText.trim()} className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest gap-2">
              <Volume2 className="w-4 h-4" /> {pronLoading ? 'Gerando...' : 'Tocar para os alunos'}
            </Button>
            {state.pronuncia.audioSrc ? (
              <Button onClick={repetirPronuncia} variant="ghost" className="h-12 px-4 rounded-xl border border-slate-200 font-black text-xs uppercase gap-2"><RotateCcw className="w-4 h-4" /> Repetir</Button>
            ) : null}
          </div>
        </div>

        {/* SEMÁFORO */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'semaforo' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Gauge className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Semáforo de compreensão</h2></div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { k: 'ok', label: 'Entendi', val: state.semaforo.ok, cls: 'text-emerald-600' },
              { k: 'devagar', label: 'Mais devagar', val: state.semaforo.devagar, cls: 'text-amber-600' },
              { k: 'perdido', label: 'Não entendi', val: state.semaforo.perdido, cls: 'text-rose-600' },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl bg-slate-50 p-4">
                <p className={`text-4xl font-black tabular-nums ${c.cls}`}>{c.val}</p>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
          {state.semaforo.aberto ? (
            <Button onClick={fecharSemaforo} variant="ghost" className="w-full h-11 rounded-xl border border-slate-200 font-black text-xs uppercase">Encerrar ({totalSemaforo} respostas)</Button>
          ) : (
            <Button onClick={abrirSemaforo} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest">Abrir semáforo</Button>
          )}
        </div>

        {/* QUIZ */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'quiz' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Zap className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Quiz-relâmpago</h2></div>
          {state.quiz.enunciado ? (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-800">{state.quiz.enunciado}</p>
              {state.quiz.opcoes.map((op, i) => {
                const count = state.quiz.votos[i] || 0
                const pct = totalQuiz > 0 ? Math.round((count / totalQuiz) * 100) : 0
                const correta = state.quiz.corretaIndice === i
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold"><span className={correta ? 'text-emerald-600' : 'text-slate-600'}>{correta ? '✓ ' : ''}{op}</span><span className="text-slate-400">{count} ({pct}%)</span></div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${correta ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
              {state.quiz.aberta ? (
                <Button onClick={revelarQuiz} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest mt-1">Revelar resposta</Button>
              ) : null}
            </div>
          ) : null}
          <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
            {quizQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium italic">Crie atividades de múltipla escolha no menu Atividades para usá-las aqui.</p>
            ) : (
              quizQuestions.map((q, i) => (
                <button key={i} type="button" onClick={() => lancarQuiz(q)} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all">
                  <p className="text-xs font-bold text-slate-700 line-clamp-2">{q.enunciado}</p>
                  <p className="text-[11px] text-slate-400">{q.atividade}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* VOCAB */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'vocab' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><GraduationCap className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Vocab blitz</h2></div>
          <div className="space-y-2">
            <Label htmlFor="vocab-aluno" className="text-xs font-bold text-slate-400">Aluno (puxa as palavras que ele mais erra)</Label>
            <select id="vocab-aluno" value={vocabAluno} onChange={(e) => e.target.value && void carregarVocab(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm">
              <option value="">Selecione um aluno...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          {vocabDeck.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-900 p-6 text-center text-white">
                <p className="text-2xl font-black">{state.vocab.palavra}</p>
                {state.vocab.revelado ? <p className="text-emerald-300 font-medium italic mt-2 animate-in fade-in">{state.vocab.traducao}</p> : <p className="text-slate-500 text-xs mt-2">tradução oculta</p>}
              </div>
              <div className="flex gap-2">
                <Button onClick={vocabRevelar} disabled={state.vocab.revelado} className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase">Revelar</Button>
                <Button onClick={vocabProxima} variant="ghost" className="h-11 px-5 rounded-xl border border-slate-200 font-black text-xs uppercase">Próxima ({vocabIdx + 1}/{vocabDeck.length})</Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* TIMER */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-5 shadow-xl ${state.active === 'timer' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Timer className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Timer</h2></div>
          <p className="text-6xl font-black text-slate-900 text-center font-mono tabular-nums">{formatClock(remaining)}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[1, 3, 5, 10].map((min) => <Button key={min} variant="ghost" onClick={() => timerReset(min * 60)} className="h-10 px-4 rounded-xl border border-slate-200 font-black text-xs">{min} min</Button>)}
          </div>
          <div className="flex items-center justify-center gap-2">
            {state.timer.endsAt === null ? (
              <Button onClick={timerStart} className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest gap-2"><Play className="w-4 h-4" /> Iniciar</Button>
            ) : (
              <Button onClick={timerPause} className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest gap-2"><Pause className="w-4 h-4" /> Pausar</Button>
            )}
            <Button variant="ghost" onClick={() => timerReset()} className="h-12 px-4 rounded-xl border border-slate-200 font-black text-xs uppercase gap-2"><RotateCcw className="w-4 h-4" /> Zerar</Button>
          </div>
        </div>

        {/* SORTEADOR */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'sorteio' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Dices className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Sorteador</h2></div>
          <Textarea value={sorteioText} onChange={(e) => setSorteioText(e.target.value)} placeholder={'past simple\npresent perfect\ntravel vocab'} className="rounded-xl min-h-[80px] text-sm font-medium" aria-label="Itens do sorteio" />
          {state.sorteio.resultado ? <p className="text-center text-2xl font-black text-indigo-600 bg-indigo-50 rounded-2xl py-3">🎲 {state.sorteio.resultado}</p> : null}
          <Button onClick={sortear} disabled={sorteioText.split('\n').filter((s) => s.trim()).length < 2} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest">Sortear</Button>
        </div>

        {/* ENQUETE */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'enquete' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><BarChart3 className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Enquete</h2></div>
          {!state.enquete.aberta ? (
            <div className="space-y-2">
              <Input value={enquetePergunta} onChange={(e) => setEnquetePergunta(e.target.value)} placeholder="Pergunta" className="h-11 rounded-xl font-bold text-sm" aria-label="Pergunta da enquete" />
              <Textarea value={enqueteOpcoes} onChange={(e) => setEnqueteOpcoes(e.target.value)} placeholder={'Uma opção por linha'} className="rounded-xl min-h-[60px] text-sm" aria-label="Opções da enquete" />
              <Button onClick={abrirEnquete} disabled={!enquetePergunta.trim() || enqueteOpcoes.split('\n').filter((s) => s.trim()).length < 2} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest">Abrir votação</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-black text-slate-800">{state.enquete.pergunta}</p>
              {state.enquete.opcoes.map((op, i) => {
                const count = state.enquete.votos[i] || 0
                const pct = totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600"><span>{op}</span><span>{count} ({pct}%)</span></div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
              <Button onClick={fecharEnquete} variant="ghost" className="w-full h-10 rounded-xl border border-slate-200 font-black text-xs uppercase mt-1">Encerrar</Button>
            </div>
          )}
        </div>

        {/* WORDCLOUD */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'wordcloud' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Cloud className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Nuvem de palavras</h2></div>
          {!state.wordcloud.aberto ? (
            <div className="space-y-2">
              <Input value={wordPrompt} onChange={(e) => setWordPrompt(e.target.value)} placeholder="Tema (ex.: words about travel)" className="h-11 rounded-xl font-bold text-sm" aria-label="Tema da nuvem" />
              <Button onClick={abrirWordcloud} disabled={!wordPrompt.trim()} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest">Abrir brainstorm</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-black text-slate-800">{state.wordcloud.prompt}</p>
              <div className="flex flex-wrap gap-2 min-h-[60px]">
                {wordEntries.length === 0 ? <p className="text-xs text-slate-400 italic">Aguardando palavras dos alunos...</p> :
                  wordEntries.map(([w, c]) => <span key={w} className="font-black text-indigo-600" style={{ fontSize: `${wordCloudSize(c, wordMax)}rem` }}>{w}</span>)}
              </div>
              <Button onClick={fecharWordcloud} variant="ghost" className="w-full h-10 rounded-xl border border-slate-200 font-black text-xs uppercase">Encerrar</Button>
            </div>
          )}
        </div>

        {/* PLACAR */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-4 shadow-xl ${state.active === 'placar' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600"><Trophy className="w-5 h-5" /><h2 className="text-sm font-black uppercase tracking-widest">Placar</h2></div>
          <div className="grid grid-cols-2 gap-4">
            {(['A', 'B'] as const).map((time) => {
              const nome = time === 'A' ? state.placar.nomeA : state.placar.nomeB
              const pontos = time === 'A' ? state.placar.pontosA : state.placar.pontosB
              return (
                <div key={time} className="rounded-2xl bg-slate-50 p-5 text-center space-y-3">
                  <Input value={nome} onChange={(e) => { const placar = { ...state.placar }; if (time === 'A') placar.nomeA = e.target.value; else placar.nomeB = e.target.value; broadcast({ ...state, placar }) }} className="h-9 rounded-lg text-center font-black text-sm" aria-label={`Nome do time ${time}`} />
                  <p className="text-5xl font-black text-slate-900 tabular-nums">{pontos}</p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => pontuar(time, -1)} variant="ghost" aria-label={`-1 ponto ${nome}`} className="h-10 w-10 p-0 rounded-xl border border-slate-200"><Minus className="w-4 h-4" /></Button>
                    <Button onClick={() => pontuar(time, 1)} aria-label={`+1 ponto ${nome}`} className="h-10 w-10 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
