'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  INITIAL_PAINEL_STATE,
  PAINEL_CHANNEL,
  formatClock,
  timerRemaining,
  type PainelState,
  type PainelWidget,
  type VotePayload,
} from '@/lib/painel-types'
import {
  BarChart3,
  Dices,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Minus,
  Timer,
  Trophy,
  Users,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

const WIDGETS: Array<{ key: PainelWidget; label: string; icon: typeof Timer }> = [
  { key: 'timer', label: 'Timer', icon: Timer },
  { key: 'sorteio', label: 'Sorteador', icon: Dices },
  { key: 'enquete', label: 'Enquete', icon: BarChart3 },
  { key: 'placar', label: 'Placar', icon: Trophy },
]

export default function ProfessorPainelPage() {
  const [state, setState] = useState<PainelState>(INITIAL_PAINEL_STATE)
  const [online, setOnline] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [sorteioText, setSorteioText] = useState('')
  const [enquetePergunta, setEnquetePergunta] = useState('')
  const [enqueteOpcoes, setEnqueteOpcoes] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef(state)
  const votersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const broadcast = useCallback((next: PainelState) => {
    stateRef.current = next
    setState(next)
    void channelRef.current?.send({ type: 'broadcast', event: 'state', payload: next })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(PAINEL_CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: 'professor' } },
    })

    channel
      .on('broadcast', { event: 'vote' }, ({ payload }) => {
        const vote = payload as VotePayload
        const current = stateRef.current
        if (!current.enquete.aberta) return
        if (typeof vote?.opcao !== 'number' || !vote?.voterId) return
        if (vote.opcao < 0 || vote.opcao >= current.enquete.opcoes.length) return
        const voteKey = `${vote.voterId}`
        if (votersRef.current.has(voteKey)) return
        votersRef.current.add(voteKey)
        const votos = [...current.enquete.votos]
        votos[vote.opcao] = (votos[vote.opcao] || 0) + 1
        const next = { ...current, enquete: { ...current.enquete, votos } }
        setState(next)
        void channel.send({ type: 'broadcast', event: 'state', payload: next })
      })
      .on('presence', { event: 'sync' }, () => {
        const present = Object.keys(channel.presenceState()).filter((k) => k !== 'professor')
        setOnline(present.length)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ role: 'professor' })
        }
      })

    channelRef.current = channel

    // Heartbeat: re-broadcast full state so late joiners sync without asking.
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

  // ---- timer controls ----
  function timerStart() {
    const remaining =
      state.timer.pausedRemaining !== null ? state.timer.pausedRemaining : state.timer.totalSeconds
    broadcast({
      ...state,
      active: 'timer',
      timer: { ...state.timer, endsAt: Date.now() + remaining * 1000, pausedRemaining: null },
    })
  }
  function timerPause() {
    broadcast({
      ...state,
      timer: { ...state.timer, endsAt: null, pausedRemaining: timerRemaining(state.timer, now) },
    })
  }
  function timerReset(totalSeconds?: number) {
    broadcast({
      ...state,
      active: 'timer',
      timer: {
        totalSeconds: totalSeconds ?? state.timer.totalSeconds,
        endsAt: null,
        pausedRemaining: null,
      },
    })
  }

  // ---- sorteio ----
  function sortear() {
    const itens = sorteioText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (itens.length < 2) return
    const resultado = itens[Math.floor(Math.random() * itens.length)]
    broadcast({ ...state, active: 'sorteio', sorteio: { itens, resultado } })
  }

  // ---- enquete ----
  function abrirEnquete() {
    const opcoes = enqueteOpcoes.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!enquetePergunta.trim() || opcoes.length < 2) return
    votersRef.current = new Set()
    broadcast({
      ...state,
      active: 'enquete',
      enquete: { pergunta: enquetePergunta.trim(), opcoes, aberta: true, votos: opcoes.map(() => 0) },
    })
  }
  function fecharEnquete() {
    broadcast({ ...state, enquete: { ...state.enquete, aberta: false } })
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
            O que você controla aqui aparece na hora na tela do aluno (menu Painel, no portal dele).
          </p>
        </div>
        <Badge
          variant={online > 0 ? 'success' : 'outline'}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit"
        >
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
            className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-xs font-black uppercase tracking-widest transition-all ${
              state.active === key
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        {state.active ? (
          <button
            type="button"
            onClick={() => broadcast({ ...state, active: null })}
            className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-rose-200 hover:text-rose-500"
          >
            Limpar tela
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TIMER */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-5 shadow-xl ${state.active === 'timer' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600">
            <Timer className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Timer</h2>
          </div>
          <p className="text-6xl font-black text-slate-900 text-center font-mono tabular-nums">
            {formatClock(remaining)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[1, 3, 5, 10].map((min) => (
              <Button
                key={min}
                variant="ghost"
                onClick={() => timerReset(min * 60)}
                className="h-10 px-4 rounded-xl border border-slate-200 font-black text-xs"
              >
                {min} min
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            {state.timer.endsAt === null ? (
              <Button onClick={timerStart} className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest gap-2">
                <Play className="w-4 h-4" /> Iniciar
              </Button>
            ) : (
              <Button onClick={timerPause} className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest gap-2">
                <Pause className="w-4 h-4" /> Pausar
              </Button>
            )}
            <Button variant="ghost" onClick={() => timerReset()} className="h-12 px-4 rounded-xl border border-slate-200 font-black text-xs uppercase gap-2">
              <RotateCcw className="w-4 h-4" /> Zerar
            </Button>
          </div>
        </div>

        {/* SORTEADOR */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-5 shadow-xl ${state.active === 'sorteio' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600">
            <Dices className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Sorteador</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sorteio-itens" className="text-xs font-bold text-slate-400">
              Um item por linha (palavras, temas, nomes...)
            </Label>
            <Textarea
              id="sorteio-itens"
              value={sorteioText}
              onChange={(e) => setSorteioText(e.target.value)}
              placeholder={'past simple\npresent perfect\ntravel vocabulary'}
              className="rounded-xl min-h-[90px] text-sm font-medium"
            />
          </div>
          {state.sorteio.resultado ? (
            <p className="text-center text-2xl font-black text-indigo-600 bg-indigo-50 rounded-2xl py-4 animate-in zoom-in-95 duration-300">
              🎲 {state.sorteio.resultado}
            </p>
          ) : null}
          <Button
            onClick={sortear}
            disabled={sorteioText.split('\n').filter((s) => s.trim()).length < 2}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest"
          >
            Sortear
          </Button>
        </div>

        {/* ENQUETE */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-5 shadow-xl ${state.active === 'enquete' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Enquete</h2>
          </div>
          {state.enquete.opcoes.length === 0 || !state.enquete.aberta ? (
            <div className="space-y-3">
              <Input
                value={enquetePergunta}
                onChange={(e) => setEnquetePergunta(e.target.value)}
                placeholder="Pergunta (ex.: Which sentence is correct?)"
                className="h-11 rounded-xl font-bold text-sm"
                aria-label="Pergunta da enquete"
              />
              <Textarea
                value={enqueteOpcoes}
                onChange={(e) => setEnqueteOpcoes(e.target.value)}
                placeholder={'Uma opção por linha\nShe goes to school\nShe go to school'}
                className="rounded-xl min-h-[70px] text-sm font-medium"
                aria-label="Opções da enquete"
              />
              <Button
                onClick={abrirEnquete}
                disabled={!enquetePergunta.trim() || enqueteOpcoes.split('\n').filter((s) => s.trim()).length < 2}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest"
              >
                Abrir votação
              </Button>
            </div>
          ) : null}
          {state.enquete.opcoes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-black text-slate-800">{state.enquete.pergunta}</p>
              {state.enquete.opcoes.map((opcao, idx) => {
                const count = state.enquete.votos[idx] || 0
                const pct = totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{opcao}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {state.enquete.aberta ? (
                <Button onClick={fecharEnquete} variant="ghost" className="w-full h-10 rounded-xl border border-slate-200 font-black text-xs uppercase mt-2">
                  Encerrar votação
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* PLACAR */}
        <div className={`bg-white rounded-[2.5rem] border-2 p-8 space-y-5 shadow-xl ${state.active === 'placar' ? 'border-indigo-300' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-indigo-600">
            <Trophy className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Placar</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['A', 'B'] as const).map((time) => {
              const nome = time === 'A' ? state.placar.nomeA : state.placar.nomeB
              const pontos = time === 'A' ? state.placar.pontosA : state.placar.pontosB
              return (
                <div key={time} className="rounded-2xl bg-slate-50 p-5 text-center space-y-3">
                  <Input
                    value={nome}
                    onChange={(e) => {
                      const placar = { ...state.placar }
                      if (time === 'A') placar.nomeA = e.target.value
                      else placar.nomeB = e.target.value
                      broadcast({ ...state, placar })
                    }}
                    className="h-9 rounded-lg text-center font-black text-sm"
                    aria-label={`Nome do time ${time}`}
                  />
                  <p className="text-5xl font-black text-slate-900 tabular-nums">{pontos}</p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => pontuar(time, -1)} variant="ghost" aria-label={`-1 ponto para ${nome}`} className="h-10 w-10 p-0 rounded-xl border border-slate-200">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => pontuar(time, 1)} aria-label={`+1 ponto para ${nome}`} className="h-10 w-10 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="w-4 h-4" />
                    </Button>
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
