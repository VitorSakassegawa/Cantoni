// Shared protocol for the live class panel (Supabase Realtime broadcast).
// Ephemeral by design: no DB table — the professor's client is the source of
// truth and re-broadcasts the full state every few seconds so late joiners sync.

export type PainelWidget =
  | 'timer'
  | 'sorteio'
  | 'enquete'
  | 'placar'
  | 'pronuncia'
  | 'semaforo'
  | 'quiz'
  | 'vocab'
  | 'wordcloud'

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
    votos: number[]
  }
  placar: {
    nomeA: string
    pontosA: number
    nomeB: string
    pontosB: number
  }
  // Pronúncia ao vivo: professor envia texto sintetizado por TTS; o aparelho do
  // aluno toca quando `nonce` muda (permite reproduzir o mesmo texto de novo).
  pronuncia: {
    texto: string
    audioSrc: string | null
    nonce: number
  }
  // Semáforo de compreensão: o aluno toca um nível; última escolha por aluno vence.
  semaforo: {
    aberto: boolean
    ok: number
    devagar: number
    perdido: number
  }
  // Quiz-relâmpago: questão de múltipla escolha do repositório. A resposta
  // correta SÓ é enviada no "revelar" (fica no cliente do professor até lá).
  quiz: {
    enunciado: string
    opcoes: string[]
    votos: number[]
    aberta: boolean
    corretaIndice: number | null
  }
  // Vocab blitz: uma palavra por vez; tradução revelada pelo professor.
  vocab: {
    palavra: string
    traducao: string
    revelado: boolean
  }
  // Brainstorm / nuvem de palavras.
  wordcloud: {
    prompt: string
    aberto: boolean
    // palavra (minúscula) -> frequência
    palavras: Record<string, number>
  }
}

export const INITIAL_PAINEL_STATE: PainelState = {
  active: null,
  timer: { totalSeconds: 300, endsAt: null, pausedRemaining: null },
  sorteio: { itens: [], resultado: null },
  enquete: { pergunta: '', opcoes: [], aberta: false, votos: [] },
  placar: { nomeA: 'Team A', pontosA: 0, nomeB: 'Team B', pontosB: 0 },
  pronuncia: { texto: '', audioSrc: null, nonce: 0 },
  semaforo: { aberto: false, ok: 0, devagar: 0, perdido: 0 },
  quiz: { enunciado: '', opcoes: [], votos: [], aberta: false, corretaIndice: null },
  vocab: { palavra: '', traducao: '', revelado: false },
  wordcloud: { prompt: '', aberto: false, palavras: {} },
}

export const PAINEL_CHANNEL = 'painel-cantoni'

export type SemaforoNivel = 'ok' | 'devagar' | 'perdido'

// Student → professor broadcast events.
export type VotePayload = { voterId: string; opcao: number }
export type QuizVotePayload = { voterId: string; opcao: number }
export type ReacaoPayload = { voterId: string; nivel: SemaforoNivel }
export type PalavraPayload = { voterId: string; palavra: string }

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

// Font size (rem) for a word in the cloud, scaled by its frequency.
export function wordCloudSize(count: number, max: number): number {
  if (max <= 1) return 1.1
  const ratio = count / max
  return 0.95 + ratio * 1.85 // 0.95rem .. 2.8rem
}
