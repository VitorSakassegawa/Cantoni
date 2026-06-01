'use server'

import { generateAIContent, generateAIAudio, extractAndParseJSON } from '@/lib/ai'
import type { PlacementModuleSubmission, PlacementSelection } from '@/lib/dashboard-types'
import { gradePlacementSelections, validateGeneratedQuestions } from '@/lib/placement-test-utils'
import { encryptPlacementKey, decryptPlacementKey } from '@/lib/placement-token'
import { createClient } from '@/lib/supabase/server'
import { evaluatePlacementEligibility } from '@/lib/placement-eligibility'

const PLACEMENT_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

async function getPlacementGate(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const [{ data: profile }, { data: contracts }, { data: latestResult }] = await Promise.all([
    supabase.from('profiles').select('placement_test_completed').eq('id', studentId).single(),
    supabase.from('contratos').select('status, data_inicio, data_fim').eq('aluno_id', studentId).neq('status', 'cancelado'),
    supabase
      .from('placement_results')
      .select('created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return evaluatePlacementEligibility({
    placementTestCompleted: profile?.placement_test_completed,
    latestResultAt: latestResult?.created_at || null,
    contracts: (contracts || []) as Array<{ status?: string | null; data_inicio?: string | null; data_fim?: string | null }>,
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

async function generateAIInsights(answers: { correct: boolean }[], level: string) {
  const prompt = `
    Analise o desempenho deste aluno em um teste de nivelamento de inglês CEFR ${level}.
    Respostas: ${JSON.stringify(answers)}

    Trabalhe como um coordenador pedagógico experiente.
    Gere um resumo curto (markdown) com:
    1. **Pontos de Destaque** (O que o aluno domina).
    2. **Pontos de Melhoria** (Gaps gramaticais ou de leitura/listening).
    3. **Sugestão Pedagógica** (Foco das primeiras 10 aulas).

    Seja direto, profissional e encorajador.
  `

  try {
    return await generateAIContent(prompt)
  } catch {
    return 'Insights automáticos indisponíveis no momento.'
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
    question: string | null
    options: string[] | null
    selected: number | null
    correct: boolean
    correctAnswer: number
  }> = []

  for (const mod of modules) {
    const payload = decryptPlacementKey(mod?.keyToken)
    if (!payload) {
      throw new Error('Sessão de teste inválida. Reinicie o nivelamento.')
    }
    const graded = gradePlacementSelections(payload.key, mod?.selections || [])
    score += graded.score
    total += graded.total

    const metaById = new Map((mod?.meta || []).map((m) => [m.id, m]))
    for (const g of graded.graded) {
      const meta = metaById.get(g.id)
      storedAnswers.push({
        id: g.id,
        question: typeof meta?.question === 'string' ? meta.question : null,
        options: Array.isArray(meta?.options) ? meta.options : null,
        selected: g.selected,
        correct: g.correct,
        correctAnswer: g.correctAnswer,
      })
    }
  }

  if (total === 0) {
    throw new Error('Nenhuma resposta válida para avaliação.')
  }

  const ratio = score / total
  const attemptedLevel = (PLACEMENT_LEVELS as readonly string[]).includes(input?.attemptedLevel)
    ? input.attemptedLevel
    : 'A1'

  let suggestedLevel = attemptedLevel
  let confirmed = false

  if (ratio >= 0.7) {
    confirmed = true
  } else if (ratio < 0.4) {
    const idx = PLACEMENT_LEVELS.indexOf(attemptedLevel as (typeof PLACEMENT_LEVELS)[number])
    suggestedLevel = idx > 0 ? PLACEMENT_LEVELS[idx - 1] : 'A1'
  }

  const nivelMap: Record<string, string> = {
    A1: 'iniciante',
    A2: 'basico',
    B1: 'intermediario',
    B2: 'intermediario',
    C1: 'avancado',
  }

  const insights = await generateAIInsights(
    storedAnswers.map((a) => ({ correct: a.correct })),
    suggestedLevel
  )

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

  const result = {
    suggestedLevel,
    suggestedNivel: nivelMap[suggestedLevel],
    score,
    total,
    confirmed,
    insights,
  }

  return JSON.parse(JSON.stringify(result))
}

export async function requestNewPlacementTest(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') throw new Error('Apenas professores podem solicitar novos testes')

  const { error } = await supabase
    .from('profiles')
    .update({ placement_test_completed: false })
    .eq('id', studentId)

  if (error) throw new Error('Falha ao resetar teste')
  return { success: true }
}

export async function getPlacementAudio(text: string) {
  return await generateAIAudio(text)
}
