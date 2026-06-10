'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  INITIAL_PAINEL_STATE,
  PAINEL_CHANNEL,
  formatClock,
  timerRemaining,
  wordCloudSize,
  type PainelState,
  type SemaforoNivel,
} from '@/lib/painel-types'
import { BarChart3, Cloud, Dices, Gauge, GraduationCap, MonitorPlay, Send, Timer, Trophy, Volume2, Wifi, WifiOff, Zap } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function AlunoPainelPage() {
  const [state, setState] = useState<PainelState>(INITIAL_PAINEL_STATE)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [votedOn, setVotedOn] = useState<string | null>(null)
  const [quizVotedOn, setQuizVotedOn] = useState<string | null>(null)
  const [reacao, setReacao] = useState<SemaforoNivel | null>(null)
  const [minhaPalavra, setMinhaPalavra] = useState('')
  const [palavrasEnviadas, setPalavrasEnviadas] = useState<string[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const userIdRef = useRef<string>('')
  const lastPronNonce = useRef<number>(0)

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    void supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id || `anon-${Math.random().toString(36).slice(2)}`
      channel = supabase.channel(PAINEL_CHANNEL, {
        config: { broadcast: { self: false }, presence: { key: userIdRef.current } },
      })
      channel
        .on('broadcast', { event: 'state' }, ({ payload }) => {
          const next = payload as PainelState
          setState(next)
          setConnected(true)
          // auto-play pronúncia when the nonce advances
          if (next.active === 'pronuncia' && next.pronuncia.audioSrc && next.pronuncia.nonce !== lastPronNonce.current) {
            lastPronNonce.current = next.pronuncia.nonce
            try {
              void new Audio(next.pronuncia.audioSrc).play()
            } catch {
              /* autoplay may require a tap; the button below is the fallback */
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true)
            void channel?.track({ role: 'aluno' })
          }
        })
      channelRef.current = channel
    })

    return () => {
      if (channel) void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(tick)
  }, [])

  function votarEnquete(opcao: number) {
    const key = `${state.enquete.pergunta}|${state.enquete.opcoes.join('|')}`
    if (votedOn === key || !state.enquete.aberta) return
    setVotedOn(key)
    void channelRef.current?.send({ type: 'broadcast', event: 'vote', payload: { voterId: userIdRef.current, opcao } })
  }

  function votarQuiz(opcao: number) {
    const key = state.quiz.enunciado
    if (quizVotedOn === key || !state.quiz.aberta) return
    setQuizVotedOn(key)
    void channelRef.current?.send({ type: 'broadcast', event: 'voteQuiz', payload: { voterId: userIdRef.current, opcao } })
  }

  function enviarReacao(nivel: SemaforoNivel) {
    if (!state.semaforo.aberto) return
    setReacao(nivel)
    void channelRef.current?.send({ type: 'broadcast', event: 'reacao', payload: { voterId: userIdRef.current, nivel } })
  }

  function enviarPalavra() {
    const palavra = minhaPalavra.trim().toLowerCase()
    if (!palavra || !state.wordcloud.aberto || palavrasEnviadas.includes(palavra)) return
    setPalavrasEnviadas((p) => [...p, palavra])
    setMinhaPalavra('')
    void channelRef.current?.send({ type: 'broadcast', event: 'palavra', payload: { voterId: userIdRef.current, palavra } })
  }

  const remaining = timerRemaining(state.timer, now)
  const totalVotos = state.enquete.votos.reduce((a, b) => a + b, 0)
  const enqueteKey = `${state.enquete.pergunta}|${state.enquete.opcoes.join('|')}`
  const wordEntries = Object.entries(state.wordcloud.palavras).sort((a, b) => b[1] - a[1])
  const wordMax = wordEntries.length ? wordEntries[0][1] : 1

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-6 py-6 px-4 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600">
          <MonitorPlay className="h-3.5 w-3.5" /> Painel da aula
        </div>
        <Badge variant={connected ? 'success' : 'outline'} className="flex items-center gap-1.5 text-[11px] font-black uppercase">
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {connected ? 'Conectado' : 'Conectando...'}
        </Badge>
      </div>

      {state.active === null ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center space-y-4">
          <MonitorPlay className="mx-auto h-14 w-14 text-indigo-300" />
          <p className="text-xl font-black tracking-tight text-slate-700">Aguardando o professor...</p>
          <p className="text-sm font-medium text-slate-400">Quando o professor ativar algo, aparece aqui ao vivo.</p>
        </div>
      ) : null}

      {/* PRONÚNCIA */}
      {state.active === 'pronuncia' ? (
        <div className="rounded-[2.5rem] bg-slate-900 p-10 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-[0.3em]"><Volume2 className="h-4 w-4" /> Pronúncia</div>
          <p className="text-2xl md:text-3xl font-black text-white leading-snug">{state.pronuncia.texto || '...'}</p>
          {state.pronuncia.audioSrc ? (
            <Button onClick={() => { try { void new Audio(state.pronuncia.audioSrc!).play() } catch { /* noop */ } }} className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest gap-2">
              <Volume2 className="h-5 w-5" /> Ouvir de novo
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* SEMÁFORO */}
      {state.active === 'semaforo' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><Gauge className="h-4 w-4" /> Como você está?</div>
          {state.semaforo.aberto ? (
            <div className="grid gap-3">
              {([
                { k: 'ok' as const, label: 'Entendi 👍', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                { k: 'devagar' as const, label: 'Mais devagar 🐢', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
                { k: 'perdido' as const, label: 'Não entendi 🆘', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
              ]).map((o) => (
                <button key={o.k} type="button" onClick={() => enviarReacao(o.k)} aria-pressed={reacao === o.k}
                  className={`rounded-2xl border-2 p-5 text-base font-black uppercase tracking-wide transition-all ${reacao === o.k ? o.cls + ' ring-2 ring-offset-2 ring-indigo-400' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>
                  {o.label}
                </button>
              ))}
              {reacao ? <p className="text-center text-xs font-bold text-slate-400">Você pode mudar sua resposta a qualquer momento.</p> : null}
            </div>
          ) : (
            <p className="text-center text-sm font-medium text-slate-400 py-4">Votação encerrada.</p>
          )}
        </div>
      ) : null}

      {/* QUIZ */}
      {state.active === 'quiz' && state.quiz.opcoes.length > 0 ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><Zap className="h-4 w-4" /> Quiz {state.quiz.aberta ? '· responda!' : '· resultado'}</div>
          <p className="text-xl font-black tracking-tight text-slate-900">{state.quiz.enunciado}</p>
          {state.quiz.aberta && quizVotedOn !== state.quiz.enunciado ? (
            <div className="grid gap-2">
              {state.quiz.opcoes.map((op, i) => (
                <button key={i} type="button" onClick={() => votarQuiz(i)} className="rounded-2xl border-2 border-slate-100 bg-white p-4 text-left text-sm font-bold text-slate-700 transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.99]">{op}</button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {quizVotedOn === state.quiz.enunciado && state.quiz.aberta ? <p className="text-sm font-bold text-emerald-600">Resposta enviada! Aguarde o resultado.</p> : null}
              {state.quiz.opcoes.map((op, i) => {
                const correta = state.quiz.corretaIndice === i
                const showResult = state.quiz.corretaIndice !== null
                return (
                  <div key={i} className={`rounded-2xl border-2 p-4 text-sm font-bold ${showResult && correta ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500'}`}>
                    {showResult && correta ? '✓ ' : ''}{op}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* VOCAB */}
      {state.active === 'vocab' ? (
        <div className="rounded-[2.5rem] bg-slate-900 p-12 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-[0.3em]"><GraduationCap className="h-4 w-4" /> Vocabulário</div>
          <p className="text-4xl md:text-5xl font-black text-white">{state.vocab.palavra || '...'}</p>
          {state.vocab.revelado ? (
            <p className="text-2xl font-black text-emerald-300 italic animate-in zoom-in-95 duration-300">{state.vocab.traducao || '—'}</p>
          ) : (
            <p className="text-sm font-medium text-slate-500">Tente lembrar o significado...</p>
          )}
        </div>
      ) : null}

      {/* TIMER */}
      {state.active === 'timer' ? (
        <div className="rounded-[2.5rem] bg-slate-900 p-12 text-center shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-[0.3em]"><Timer className="h-4 w-4" /> Timer</div>
          <p className={`font-mono text-7xl md:text-8xl font-black tabular-nums ${remaining <= 10 && state.timer.endsAt ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{formatClock(remaining)}</p>
          {remaining === 0 && state.timer.endsAt ? <p className="text-2xl font-black text-amber-400 animate-bounce">Time&apos;s up! ⏰</p> : null}
        </div>
      ) : null}

      {/* SORTEIO */}
      {state.active === 'sorteio' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-12 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><Dices className="h-4 w-4" /> Sorteio</div>
          {state.sorteio.resultado ? <p key={state.sorteio.resultado} className="text-4xl md:text-5xl font-black text-indigo-600 animate-in zoom-in-50 duration-500">{state.sorteio.resultado}</p> : <p className="text-lg font-bold text-slate-400">O professor vai sortear...</p>}
        </div>
      ) : null}

      {/* ENQUETE */}
      {state.active === 'enquete' && state.enquete.opcoes.length > 0 ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><BarChart3 className="h-4 w-4" /> Enquete {state.enquete.aberta ? '· aberta' : '· encerrada'}</div>
          <p className="text-xl font-black tracking-tight text-slate-900">{state.enquete.pergunta}</p>
          {state.enquete.aberta && votedOn !== enqueteKey ? (
            <div className="grid gap-2">
              {state.enquete.opcoes.map((op, i) => <button key={i} type="button" onClick={() => votarEnquete(i)} className="rounded-2xl border-2 border-slate-100 bg-white p-4 text-left text-sm font-bold text-slate-700 transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.99]">{op}</button>)}
            </div>
          ) : (
            <div className="space-y-3">
              {votedOn === enqueteKey && state.enquete.aberta ? <p className="text-sm font-bold text-emerald-600">Voto registrado!</p> : null}
              {state.enquete.opcoes.map((op, i) => {
                const count = state.enquete.votos[i] || 0
                const pct = totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600"><span>{op}</span><span>{pct}%</span></div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* WORDCLOUD */}
      {state.active === 'wordcloud' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><Cloud className="h-4 w-4" /> Brainstorm</div>
          <p className="text-lg font-black tracking-tight text-slate-900">{state.wordcloud.prompt}</p>
          {state.wordcloud.aberto ? (
            <div className="flex gap-2">
              <Input value={minhaPalavra} onChange={(e) => setMinhaPalavra(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarPalavra()} placeholder="Sua palavra..." className="h-12 rounded-xl font-bold" aria-label="Sua palavra" />
              <Button onClick={enviarPalavra} disabled={!minhaPalavra.trim()} className="h-12 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black gap-2"><Send className="h-4 w-4" /></Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-[60px]">
            {wordEntries.length === 0 ? <p className="text-xs text-slate-400 italic">Seja o primeiro a enviar!</p> :
              wordEntries.map(([w, c]) => <span key={w} className="font-black text-indigo-600" style={{ fontSize: `${wordCloudSize(c, wordMax)}rem` }}>{w}</span>)}
          </div>
        </div>
      ) : null}

      {/* PLACAR */}
      {state.active === 'placar' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]"><Trophy className="h-4 w-4" /> Placar</div>
          <div className="grid grid-cols-2 gap-4">
            {[{ nome: state.placar.nomeA, pontos: state.placar.pontosA }, { nome: state.placar.nomeB, pontos: state.placar.pontosB }].map((time, idx) => (
              <div key={idx} className={`rounded-3xl p-8 text-center ${idx === 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">{time.nome}</p>
                <p key={time.pontos} className="mt-2 text-7xl font-black tabular-nums text-slate-900 animate-in zoom-in-75 duration-300">{time.pontos}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
