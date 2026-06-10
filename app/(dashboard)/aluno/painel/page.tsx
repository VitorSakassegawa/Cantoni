'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  INITIAL_PAINEL_STATE,
  PAINEL_CHANNEL,
  formatClock,
  timerRemaining,
  type PainelState,
} from '@/lib/painel-types'
import { BarChart3, Dices, MonitorPlay, Timer, Trophy, Wifi, WifiOff } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function AlunoPainelPage() {
  const [state, setState] = useState<PainelState>(INITIAL_PAINEL_STATE)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [votedOn, setVotedOn] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userIdRef = useRef<string>('')

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
          setState(payload as PainelState)
          setConnected(true)
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

  function votar(opcao: number) {
    const pollKey = `${state.enquete.pergunta}|${state.enquete.opcoes.join('|')}`
    if (votedOn === pollKey || !state.enquete.aberta) return
    setVotedOn(pollKey)
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'vote',
      payload: { voterId: userIdRef.current, opcao },
    })
  }

  const remaining = timerRemaining(state.timer, now)
  const totalVotos = state.enquete.votos.reduce((a, b) => a + b, 0)
  const pollKey = `${state.enquete.pergunta}|${state.enquete.opcoes.join('|')}`
  const jaVotou = votedOn === pollKey

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-6 py-6 px-4 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600">
          <MonitorPlay className="h-3.5 w-3.5" /> Painel da aula
        </div>
        <Badge variant={connected ? 'success' : 'outline'} className="flex items-center gap-1.5 text-[11px] font-black uppercase">
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? 'Conectado' : 'Conectando...'}
        </Badge>
      </div>

      {state.active === null ? (
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center space-y-4">
          <MonitorPlay className="mx-auto h-14 w-14 text-indigo-300" />
          <p className="text-xl font-black tracking-tight text-slate-700">Aguardando o professor...</p>
          <p className="text-sm font-medium text-slate-400">
            Quando o professor ativar um widget (timer, sorteio, enquete ou placar), ele aparece aqui ao vivo.
          </p>
        </div>
      ) : null}

      {state.active === 'timer' ? (
        <div className="rounded-[2.5rem] bg-slate-900 p-12 text-center shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-[0.3em]">
            <Timer className="h-4 w-4" /> Timer
          </div>
          <p className={`font-mono text-7xl md:text-8xl font-black tabular-nums ${remaining <= 10 && state.timer.endsAt ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {formatClock(remaining)}
          </p>
          {remaining === 0 && state.timer.endsAt ? (
            <p className="text-2xl font-black text-amber-400 animate-bounce">Time&apos;s up! ⏰</p>
          ) : null}
        </div>
      ) : null}

      {state.active === 'sorteio' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-12 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]">
            <Dices className="h-4 w-4" /> Sorteio
          </div>
          {state.sorteio.resultado ? (
            <p key={state.sorteio.resultado} className="text-4xl md:text-5xl font-black text-indigo-600 animate-in zoom-in-50 duration-500">
              {state.sorteio.resultado}
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-400">O professor vai sortear...</p>
          )}
        </div>
      ) : null}

      {state.active === 'enquete' && state.enquete.opcoes.length > 0 ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]">
            <BarChart3 className="h-4 w-4" /> Enquete {state.enquete.aberta ? '· votação aberta' : '· encerrada'}
          </div>
          <p className="text-xl font-black tracking-tight text-slate-900">{state.enquete.pergunta}</p>

          {state.enquete.aberta && !jaVotou ? (
            <div className="grid gap-2">
              {state.enquete.opcoes.map((opcao, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => votar(idx)}
                  className="rounded-2xl border-2 border-slate-100 bg-white p-4 text-left text-sm font-bold text-slate-700 transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.99]"
                >
                  {opcao}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {jaVotou && state.enquete.aberta ? (
                <p className="text-sm font-bold text-emerald-600">Voto registrado! Veja os resultados ao vivo:</p>
              ) : null}
              {state.enquete.opcoes.map((opcao, idx) => {
                const count = state.enquete.votos[idx] || 0
                const pct = totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{opcao}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {state.active === 'placar' ? (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.3em]">
            <Trophy className="h-4 w-4" /> Placar
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { nome: state.placar.nomeA, pontos: state.placar.pontosA },
              { nome: state.placar.nomeB, pontos: state.placar.pontosB },
            ].map((time, idx) => (
              <div key={idx} className={`rounded-3xl p-8 text-center ${idx === 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">{time.nome}</p>
                <p key={time.pontos} className="mt-2 text-7xl font-black tabular-nums text-slate-900 animate-in zoom-in-75 duration-300">
                  {time.pontos}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
