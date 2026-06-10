'use server'

import { generateAIContent, extractAndParseJSON } from '@/lib/ai'
import { getCachedOrGenerateAudio } from '@/lib/placement-audio-cache'
import type { PlacementModuleSubmission, PlacementSelection } from '@/lib/dashboard-types'
import { gradePlacementSelections, validateGeneratedQuestions } from '@/lib/placement-test-utils'
import { encryptPlacementKey, decryptPlacementKey } from '@/lib/placement-token'
import { createClient } from '@/lib/supabase/server'
import { evaluatePlacementEligibility } from '@/lib/placement-eligibility'

const PLACEMENT_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

async function getPlacementGate(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const [{ data: profile }, { data: contracts }, { data: latestResult }, { data: invites }] = await Promise.all([
    supabase.from('profiles').select('placement_test_completed').eq('id', studentId).single(),
    supabase.from('contratos').select('status, data_inicio, data_fim').eq('aluno_id', studentId).neq('status', 'cancelado'),
    supabase
      .from('placement_results')
      .select('created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('placement_invites')
      .select('status, valid_from, valid_until')
      .eq('student_id', studentId)
      .eq('status', 'pending'),
  ])

  return evaluatePlacementEligibility({
    placementTestCompleted: profile?.placement_test_completed,
    latestResultAt: latestResult?.created_at || null,
    contracts: (contracts || []) as Array<{ status?: string | null; data_inicio?: string | null; data_fim?: string | null }>,
    invites: (invites || []) as Array<{ status?: string | null; valid_from?: string | null; valid_until?: string | null }>,
  })
}

export async function generatePlacementQuestions(
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' = 'A1',
  module: 'grammar' | 'reading' | 'listening' = 'grammar'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { questions: [], error: 'Faça login para iniciar o nivelamento.' }
  }

  const eligibility = await getPlacementGate(supabase, user.id)
  if (!eligibility.allowed) {
    return { questions: [], error: eligibility.description }
  }

  const modulePrompts = {
    grammar: `Gere 15 perguntas de múltipla escolha focadas em Gramática e Vocabulário de nível CEFR ${level}.`,
    reading: `Gere um pequeno texto em inglês de nível CEFR ${level} (aprox. 150 palavras) seguido de 5 perguntas de múltipla escolha sobre o texto.`,
    listening: `Gere uma transcrição de um monólogo (ex: relato pessoal, diário, anúncio, ou história narrada por apenas UMA mulher) em inglês de nível CEFR ${level} (simulando um áudio feminino) seguido de 5 perguntas de múltipla escolha sobre o que foi dito.`,
  }

  const prompt = `
    Trabalhe como um especialista em design de testes Cambridge/CEFR.
    ${modulePrompts[module]}

    REGRAS CRÍTICAS:
    1. Retorne APENAS o objeto JSON.
    2. Sem preâmbulos, sem "Aqui está o seu JSON", sem explicações.
    3. Garanta que o JSON seja VÁLIDO e siga exatamente este formato:
    {
      "module": "${module}",
      "text": "Texto ou diálogo (apenas para reading/listening, caso contrário null)",
      "questions": [
        {
          "id": 1,
          "question": "Pergunta em inglês",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0
        }
      ]
    }
  `

  try {
    const response = await generateAIContent(prompt, undefined, 'application/json')
    if (!response) throw new Error('AI returned empty response')

    const parsed = extractAndParseJSON(response) as { text?: unknown; questions?: unknown }

    // Validação estrutural: descarta itens malformados da IA antes de exibir (#3).
    const validQuestions = validateGeneratedQuestions(parsed?.questions)
    const minRequired = module === 'grammar' ? 6 : 3
    if (validQuestions.length < minRequired) {
      return { questions: [], error: 'Não foi possível validar as questões geradas. Tente novamente.' }
    }

    // Gabarito encriptado num token opaco; NÃO vai legível para o cliente.
    const keyToken = encryptPlacementKey({
      module,
      level,
      key: validQuestions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer })),
      issuedAt: Date.now(),
    })

    const clientQuestions = validQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }))

    return {
      module,
      text: typeof parsed?.text === 'string' ? parsed.text : null,
      questions: clientQuestions,
      keyToken,
    }
  } catch (error) {
    console.error('Error in generatePlacementQuestions:', error)
    return { questions: [], error: 'Falha técnica ao processar questões da IA. Por favor, tente novamente.' }
  }
}

const MODULE_LABEL: Record<string, string> = {
  grammar: 'Gramática & Vocabulário',
  reading: 'Leitura',
  listening: 'Compreensão Oral',
}

type SkillBreakdownEntry = {
  module: string
  level: string
  score: number
  total: number
  ratio: number
  estimatedLevel: string
}

type StructuredInsights = {
  strengths: string[]
  gaps: string[]
  firstLessonsFocus: string[]
}

function buildInsightsMarkdown(level: string, skills: SkillBreakdownEntry[], data: StructuredInsights) {
  const skillLines = skills
    .map((s) => `- **${MODULE_LABEL[s.module] || s.module}** (testado em ${s.level}): ${s.score}/${s.total} (${Math.round(s.ratio * 100)}%)`)
    .join('\n')

  const bullets = (items: string[]) =>
    items.length ? items.map((i) => `- ${i}`).join('\n') : '- Não observado'

  return [
    `**Nível sugerido:** ${level}`,
    '',
    '**Desempenho por habilidade**',
    skillLines || '- Não observado',
    '',
    '**Pontos de Destaque**',
    bullets(data.strengths),
    '',
    '**Pontos de Melhoria**',
    bullets(data.gaps),
    '',
    '**Foco das primeiras aulas**',
    bullets(data.firstLessonsFocus),
  ].join('\n')
}

function fallbackInsights(level: string, skills: SkillBreakdownEntry[]): StructuredInsights {
  const sorted = [...skills].sort((a, b) => b.ratio - a.ratio)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  return {
    strengths: best ? [`Melhor desempenho em ${MODULE_LABEL[best.module] || best.module} (${Math.round(best.ratio * 100)}%).`] : [],
    gaps: worst && worst !== best ? [`Reforçar ${MODULE_LABEL[worst.module] || worst.module} (${Math.round(worst.ratio * 100)}%).`] : [],
    firstLessonsFocus: [`Consolidar fundamentos de nível ${level} antes de avançar.`],
  }
}

// Generates diagnostic insights from the ACTUAL missed items + per-skill scores,
// constrained to a fixed JSON shape so the output is reliable (not hallucinated
// from an aggregate count, and not free-form prose).
async function generateAIInsights(
  level: string,
  skills: SkillBreakdownEntry[],
  missed: Array<{ module: string; question: string; chosen: string; correct: string }>
): Promise<string> {
  const skillSummary = skills
    .map((s) => `${MODULE_LABEL[s.module] || s.module}: ${s.score}/${s.total} (${Math.round(s.ratio * 100)}%) @ ${s.level}`)
    .join('; ')

  const missedSummary = missed
    .slice(0, 12)
    .map((m) => `[${MODULE_LABEL[m.module] || m.module}] "${m.question}" — marcou "${m.chosen}", correto "${m.correct}"`)
    .join('\n')

  const prompt = `
    Você é um coordenador pedagógico de inglês. Nível sugerido para o aluno: CEFR ${level}.
    Desempenho por habilidade: ${skillSummary || 'sem dados'}.
    Questões que o aluno ERROU (use APENAS estas para diagnosticar lacunas reais; não invente):
    ${missedSummary || 'Nenhum erro registrado.'}

    Retorne APENAS um objeto JSON válido, sem preâmbulos, neste formato exato:
    {
      "strengths": ["frase curta", "..."],
      "gaps": ["lacuna específica baseada nos erros acima", "..."],
      "firstLessonsFocus": ["foco prático para as primeiras aulas", "..."]
    }
    Regras: 2 a 4 itens por lista, frases curtas em português, profissional e encorajador.
    NÃO inclua nada fora do JSON.
  `

  try {
    const response = await generateAIContent(prompt, undefined, 'application/json')
    const parsed = response ? (extractAndParseJSON(response) as Partial<StructuredInsights>) : null
    const toStrings = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, 4)
        : []
    const structured: StructuredInsights = {
      strengths: toStrings(parsed?.strengths),
      gaps: toStrings(parsed?.gaps),
      firstLessonsFocus: toStrings(parsed?.firstLessonsFocus),
    }
    const hasContent = structured.strengths.length || structured.gaps.length || structured.firstLessonsFocus.length
    return buildInsightsMarkdown(level, skills, hasContent ? structured : fallbackInsights(level, skills))
  } catch {
    return buildInsightsMarkdown(level, skills, fallbackInsights(level, skills))
  }
}

// Corrige um módulo no servidor a partir do token (gabarito), devolvendo só o
// placar para o cliente decidir a adaptação de nível. NÃO devolve o gabarito.
export async function gradePlacementModule(input: { keyToken: string; selections: PlacementSelection[] }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')

  const payload = decryptPlacementKey(input?.keyToken)
  if (!payload) {
    throw new Error('Sessão de teste inválida. Reinicie o nivelamento.')
  }

  const { score, total } = gradePlacementSelections(payload.key, input?.selections || [])
  return JSON.parse(JSON.stringify({ score, total }))
}

export async function evaluatePlacementTest(input: {
  modules: PlacementModuleSubmission[]
  attemptedLevel: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const studentId = user.id
  const eligibility = await getPlacementGate(supabase, studentId)
  if (!eligibility.allowed) {
    throw new Error(eligibility.description)
  }

  const modules = Array.isArray(input?.modules) ? input.modules : []
  if (modules.length === 0) {
    throw new Error('Nenhuma resposta recebida para avaliação.')
  }

  // Pontuação 100% server-side: corrige cada módulo pelo seu token encriptado.
  // O `meta` (texto/opções) vem do cliente apenas para histórico/exibição e NÃO
  // influencia o placar nem o nível.
  let score = 0
  let total = 0
  const storedAnswers: Array<{
    id: number
    module: string
    question: string | null
    options: string[] | null
    selected: number | null
    correct: boolean
    correctAnswer: number
  }> = []
  const missed: Array<{ module: string; question: string; chosen: string; correct: string }> = []
  // Per-skill accumulation so each module gets its own level estimate instead of
  // being pooled into a single, count-weighted ratio.
  const moduleStats = new Map<string, { level: string; score: number; total: number }>()

  for (const mod of modules) {
    const payload = decryptPlacementKey(mod?.keyToken)
    if (!payload) {
      throw new Error('Sessão de teste inválida. Reinicie o nivelamento.')
    }
    const graded = gradePlacementSelections(payload.key, mod?.selections || [])
    score += graded.score
    total += graded.total

    const moduleName = payload.module || 'grammar'
    const stat = moduleStats.get(moduleName) || { level: payload.level || 'A1', score: 0, total: 0 }
    stat.score += graded.score
    stat.total += graded.total
    moduleStats.set(moduleName, stat)

    const metaById = new Map((mod?.meta || []).map((m) => [m.id, m]))
    for (const g of graded.graded) {
      const meta = metaById.get(g.id)
      const question = typeof meta?.question === 'string' ? meta.question : null
      const options = Array.isArray(meta?.options) ? meta.options : null
      storedAnswers.push({
        id: g.id,
        module: moduleName,
        question,
        options,
        selected: g.selected,
        correct: g.correct,
        correctAnswer: g.correctAnswer,
      })
      if (!g.correct && question && options) {
        missed.push({
          module: moduleName,
          question,
          chosen: g.selected !== null ? options[g.selected] ?? '(em branco)' : '(em branco)',
          correct: options[g.correctAnswer] ?? '(desconhecido)',
        })
      }
    }
  }

  if (total === 0) {
    throw new Error('Nenhuma resposta válida para avaliação.')
  }

  const attemptedLevel = (PLACEMENT_LEVELS as readonly string[]).includes(input?.attemptedLevel)
    ? input.attemptedLevel
    : 'A1'

  // Per-skill level estimate: symmetric (can promote AND demote) and clamped to
  // the supported A1–C1 range (placement_results.cefr_level CHECK constraint).
  const estimateLevelIndex = (testedLevel: string, ratio: number) => {
    const testedIdx = Math.max(0, (PLACEMENT_LEVELS as readonly string[]).indexOf(testedLevel))
    let delta: number
    if (ratio >= 0.85) delta = 1
    else if (ratio >= 0.6) delta = 0
    else if (ratio >= 0.4) delta = -1
    else delta = -2
    return Math.max(0, Math.min(PLACEMENT_LEVELS.length - 1, testedIdx + delta))
  }

  const skillBreakdown: SkillBreakdownEntry[] = Array.from(moduleStats.entries()).map(([module, s]) => {
    const ratio = s.total > 0 ? s.score / s.total : 0
    const estimatedIdx = estimateLevelIndex(s.level, ratio)
    return {
      module,
      level: s.level,
      score: s.score,
      total: s.total,
      ratio,
      estimatedLevel: PLACEMENT_LEVELS[estimatedIdx],
    }
  })

  // Overall level = average of the per-skill estimates (equal weight per skill),
  // falling back to the attempted level if a skill estimate is somehow missing.
  const estimateIdxs = skillBreakdown.map((s) => (PLACEMENT_LEVELS as readonly string[]).indexOf(s.estimatedLevel))
  const overallIdx = estimateIdxs.length
    ? Math.round(estimateIdxs.reduce((a, b) => a + b, 0) / estimateIdxs.length)
    : Math.max(0, (PLACEMENT_LEVELS as readonly string[]).indexOf(attemptedLevel))
  const suggestedLevel = PLACEMENT_LEVELS[Math.max(0, Math.min(PLACEMENT_LEVELS.length - 1, overallIdx))]
  const confirmed = suggestedLevel === attemptedLevel

  const nivelMap: Record<string, string> = {
    A1: 'iniciante',
    A2: 'basico',
    B1: 'intermediario',
    B2: 'intermediario',
    C1: 'avancado',
  }

  const insights = await generateAIInsights(suggestedLevel, skillBreakdown, missed)

  const { error: resultError } = await supabase.from('placement_results').insert({
    student_id: studentId,
    cefr_level: suggestedLevel,
    score,
    total_questions: total,
    answers: storedAnswers,
    insights,
  })

  if (resultError) console.error('Error saving placement record:', resultError)

  const { error } = await supabase
    .from('profiles')
    .update({
      cefr_level: suggestedLevel,
      nivel: nivelMap[suggestedLevel] || 'iniciante',
      placement_test_completed: true,
    })
    .eq('id', studentId)

  if (error) {
    console.error('Database update error:', error)
    throw new Error('Erro ao atualizar perfil no banco de dados.')
  }

  // Consume any pending invite: a completed test satisfies the release no
  // matter which eligibility rule granted access, so invites are one-shot.
  // (RLS allows students to transition their OWN invites to 'used' only.)
  const { error: inviteError } = await supabase
    .from('placement_invites')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('status', 'pending')

  if (inviteError) console.error('Error consuming placement invite:', inviteError)

  const result = {
    suggestedLevel,
    suggestedNivel: nivelMap[suggestedLevel],
    attemptedLevel,
    score,
    total,
    confirmed,
    promoted: !confirmed && (PLACEMENT_LEVELS as readonly string[]).indexOf(suggestedLevel) > (PLACEMENT_LEVELS as readonly string[]).indexOf(attemptedLevel),
    skillBreakdown,
    insights,
  }

  return JSON.parse(JSON.stringify(result))
}

async function requireProfessor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') throw new Error('Apenas professores podem gerenciar convites de teste')

  return user
}

// Creates an explicit invite (with optional validity window) instead of the
// legacy `placement_test_completed = false` toggle. Any previous pending invite
// for the student is revoked first, so the latest invite is the source of truth.
export async function requestNewPlacementTest(
  studentId: string,
  window?: { validFrom?: string | null; validUntil?: string | null }
) {
  const supabase = await createClient()
  const user = await requireProfessor(supabase)

  const validFrom = window?.validFrom || null
  const validUntil = window?.validUntil || null
  if (validFrom && validUntil && new Date(validFrom).getTime() > new Date(validUntil).getTime()) {
    throw new Error('A data de início do convite não pode ser depois do fim.')
  }

  const { error: revokeError } = await supabase
    .from('placement_invites')
    .update({ status: 'revoked' })
    .eq('student_id', studentId)
    .eq('status', 'pending')

  if (revokeError) throw new Error('Falha ao substituir convite anterior')

  const { error } = await supabase.from('placement_invites').insert({
    student_id: studentId,
    created_by: user.id,
    valid_from: validFrom,
    valid_until: validUntil,
  })

  if (error) throw new Error('Falha ao criar convite de novo teste')
  return { success: true }
}

export async function revokePlacementInvite(studentId: string) {
  const supabase = await createClient()
  await requireProfessor(supabase)

  const { error } = await supabase
    .from('placement_invites')
    .update({ status: 'revoked' })
    .eq('student_id', studentId)
    .eq('status', 'pending')

  if (error) throw new Error('Falha ao revogar convite')
  return { success: true }
}

export async function getPlacementAudio(text: string) {
  // Require an authenticated user: this action triggers a (cached) Gemini TTS
  // call, so leaving it open would let anyone burn the shared free-tier quota.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // Reuse a previously synthesized clip when the same script comes up again,
  // instead of paying for a fresh TTS generation every time.
  return await getCachedOrGenerateAudio(text)
}
