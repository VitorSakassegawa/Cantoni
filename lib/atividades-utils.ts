// Pure helpers for the atividades feature: AI-output validation, student-safe
// sanitization (answers stripped, deterministic shuffle) and server-side
// grading. No I/O here — everything is unit-testable.

export const ATIVIDADE_NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type AtividadeNivel = (typeof ATIVIDADE_NIVEIS)[number]

export const QUESTAO_TIPOS = [
  'multipla_escolha',
  'verdadeiro_falso',
  'lacunas',
  'ordenar',
  'dissertativa',
] as const
export type QuestaoTipo = (typeof QUESTAO_TIPOS)[number]

export const QUESTAO_TIPO_LABELS: Record<QuestaoTipo, string> = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  lacunas: 'Completar a lacuna',
  ordenar: 'Ordenar',
  dissertativa: 'Dissertativa',
}

export type Questao = {
  id: number
  tipo: QuestaoTipo
  enunciado: string
  // multipla_escolha
  opcoes?: string[]
  respostaIndice?: number
  // verdadeiro_falso
  respostaBool?: boolean
  // lacunas — aceita alternativas separadas por '|', comparação normalizada
  respostaTexto?: string
  // ordenar — itens já na ordem CORRETA; o aluno recebe embaralhado
  itens?: string[]
  // dissertativa — orientação de correção para o professor (não exibida ao aluno)
  criterio?: string
}

// O que o aluno recebe: NUNCA inclui resposta/criterio. Itens de 'ordenar' vêm
// embaralhados de forma determinística (mesma ordem em todo fetch da mesma
// atribuição) para a correção conseguir reconstruir o mapeamento no servidor.
export type QuestaoAluno = {
  id: number
  tipo: QuestaoTipo
  enunciado: string
  opcoes?: string[]
  itens?: string[]
}

export type RespostaAluno = {
  id: number
  // multipla_escolha: índice; verdadeiro_falso: boolean; lacunas/dissertativa:
  // texto; ordenar: array de índices DA LISTA EMBARALHADA na ordem escolhida.
  valor: number | boolean | string | number[]
}

// ---- validação da saída da IA -------------------------------------------------

export function validateQuestoes(raw: unknown): Questao[] {
  if (!Array.isArray(raw)) return []
  const valid: Questao[] = []

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const q = item as Record<string, unknown>
    const tipo = q.tipo as QuestaoTipo
    if (!QUESTAO_TIPOS.includes(tipo)) return
    if (typeof q.enunciado !== 'string' || q.enunciado.trim().length === 0) return

    const base = { id: valid.length + 1, tipo, enunciado: (q.enunciado as string).trim() }
    void index

    if (tipo === 'multipla_escolha') {
      if (!Array.isArray(q.opcoes) || q.opcoes.length < 2) return
      if (!q.opcoes.every((o) => typeof o === 'string' && o.trim().length > 0)) return
      const normalized = (q.opcoes as string[]).map((o) => o.trim().toLowerCase())
      if (new Set(normalized).size !== normalized.length) return
      if (typeof q.respostaIndice !== 'number' || !Number.isInteger(q.respostaIndice)) return
      if (q.respostaIndice < 0 || q.respostaIndice >= q.opcoes.length) return
      valid.push({ ...base, opcoes: q.opcoes as string[], respostaIndice: q.respostaIndice })
      return
    }

    if (tipo === 'verdadeiro_falso') {
      if (typeof q.respostaBool !== 'boolean') return
      valid.push({ ...base, respostaBool: q.respostaBool })
      return
    }

    if (tipo === 'lacunas') {
      if (!base.enunciado.includes('___')) return
      if (typeof q.respostaTexto !== 'string' || q.respostaTexto.trim().length === 0) return
      valid.push({ ...base, respostaTexto: (q.respostaTexto as string).trim() })
      return
    }

    if (tipo === 'ordenar') {
      if (!Array.isArray(q.itens) || q.itens.length < 3 || q.itens.length > 8) return
      if (!q.itens.every((o) => typeof o === 'string' && o.trim().length > 0)) return
      valid.push({ ...base, itens: q.itens as string[] })
      return
    }

    // dissertativa
    valid.push({ ...base, criterio: typeof q.criterio === 'string' ? q.criterio : undefined })
  })

  return valid
}

// ---- embaralhamento determinístico --------------------------------------------

// Hash simples (FNV-1a) de uma string para semear o PRNG.
function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Permutação determinística: shuffledToOriginal[i] = índice original do item
// exibido na posição i. Reproduzível no servidor a partir do mesmo seed.
export function shuffleMap(length: number, seedText: string): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  const rand = mulberry32(hashSeed(seedText))
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

// ---- visão do aluno -------------------------------------------------------------

export function sanitizeQuestoesForStudent(questoes: Questao[], seedText: string): QuestaoAluno[] {
  return questoes.map((q) => {
    const out: QuestaoAluno = { id: q.id, tipo: q.tipo, enunciado: q.enunciado }
    if (q.tipo === 'multipla_escolha' && q.opcoes) {
      out.opcoes = [...q.opcoes]
    }
    if (q.tipo === 'ordenar' && q.itens) {
      const map = shuffleMap(q.itens.length, `${seedText}:${q.id}`)
      out.itens = map.map((originalIdx) => q.itens![originalIdx])
    }
    return out
  })
}

// ---- correção server-side --------------------------------------------------------

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

export type GradedQuestao = {
  id: number
  tipo: QuestaoTipo
  correta: boolean | null // null = dissertativa (não corrige automaticamente)
  respostaAluno: RespostaAluno['valor'] | null
}

export function gradeRespostas(
  questoes: Questao[],
  respostas: RespostaAluno[] | null | undefined,
  seedText: string
): { acertos: number; totalObjetivas: number; detalhes: GradedQuestao[]; temDissertativa: boolean } {
  const byId = new Map<number, RespostaAluno['valor']>()
  for (const r of respostas || []) {
    if (typeof r?.id === 'number') byId.set(r.id, r.valor)
  }

  let acertos = 0
  let totalObjetivas = 0
  let temDissertativa = false

  const detalhes: GradedQuestao[] = questoes.map((q) => {
    const valor = byId.has(q.id) ? byId.get(q.id)! : null

    if (q.tipo === 'dissertativa') {
      temDissertativa = true
      return { id: q.id, tipo: q.tipo, correta: null, respostaAluno: valor }
    }

    totalObjetivas += 1
    let correta = false

    if (q.tipo === 'multipla_escolha') {
      correta = typeof valor === 'number' && valor === q.respostaIndice
    } else if (q.tipo === 'verdadeiro_falso') {
      correta = typeof valor === 'boolean' && valor === q.respostaBool
    } else if (q.tipo === 'lacunas') {
      const accepted = (q.respostaTexto || '').split('|').map(normalizeText).filter(Boolean)
      correta = typeof valor === 'string' && accepted.includes(normalizeText(valor))
    } else if (q.tipo === 'ordenar' && q.itens) {
      // valor = índices da lista EMBARALHADA na ordem escolhida pelo aluno;
      // reconstruímos a permutação para comparar com a ordem original.
      const map = shuffleMap(q.itens.length, `${seedText}:${q.id}`)
      correta =
        Array.isArray(valor) &&
        valor.length === q.itens.length &&
        valor.every((shuffledIdx, position) => map[shuffledIdx as number] === position)
    }

    if (correta) acertos += 1
    return { id: q.id, tipo: q.tipo, correta, respostaAluno: valor }
  })

  return { acertos, totalObjetivas, detalhes, temDissertativa }
}
