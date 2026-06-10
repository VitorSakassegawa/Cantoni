// Shared protocol for the live class panel (Supabase Realtime broadcast).
// Ephemeral by design: no DB table — the professor's client is the source of
// truth and re-broadcasts the full state every few seconds so late joiners sync.

export type PainelWidget = 'timer' | 'sorteio' | 'enquete' | 'placar'

export type PainelState = {
  // which widget is on the student's screen (null = welcome screen)
  active: PainelWidget | null
  timer: {
    totalSeconds: number
    // epoch ms when the countdown ends; null = not running
    endsAt: number | null
    // remaining seconds while paused (null = not paused)
    pausedRemaining: number | null
  }
  sorteio: {
    itens: string[]
    resultado: string | null
  }
  enquete: {
    pergunta: string
    opcoes: string[]
    aberta: boolean
    // counts per option index
    votos: number[]
  }
  placar: {
    nomeA: string
    pontosA: number
    nomeB: string
    pontosB: number
  }
}

export const INITIAL_PAINEL_STATE: PainelState = {
  active: null,
  timer: { totalSeconds: 300, endsAt: null, pausedRemaining: null },
  sorteio: { itens: [], resultado: null },
  enquete: { pergunta: '', opcoes: [], aberta: false, votos: [] },
  placar: { nomeA: 'Team A', pontosA: 0, nomeB: 'Team B', pontosB: 0 },
}

export const PAINEL_CHANNEL = 'painel-cantoni'

export type VotePayload = {
  voterId: string
  opcao: number
}

// remaining seconds for display, computed locally on each side
export function timerRemaining(timer: PainelState['timer'], now: number): number {
  if (timer.pausedRemaining !== null) return Math.max(0, Math.round(timer.pausedRemaining))
  if (timer.endsAt === null) return timer.totalSeconds
  return Math.max(0, Math.round((timer.endsAt - now) / 1000))
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
