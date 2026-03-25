'use server'

import { generateAIContent, generateAIAudio, extractAndParseJSON } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'
import { evaluatePlacementEligibility } from '@/lib/placement-eligibility'

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

    const parsed = extractAndParseJSON(response)
    return JSON.parse(JSON.stringify(parsed))
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

export async function evaluatePlacementTest(answers: { correct: boolean }[], attemptedLevel: string) {
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

  const score = answers.filter((answer) => answer.correct).length
  const total = answers.length
  const ratio = score / total

  let suggestedLevel = attemptedLevel
  let confirmed = false

  if (ratio >= 0.7) {
    confirmed = true
  } else if (ratio < 0.4) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1']
    const idx = levels.indexOf(attemptedLevel)
    suggestedLevel = idx > 0 ? levels[idx - 1] : 'A1'
  }

  const nivelMap: Record<string, string> = {
    A1: 'iniciante',
    A2: 'basico',
    B1: 'intermediario',
    B2: 'intermediario',
    C1: 'avancado',
  }

  const insights = await generateAIInsights(answers, suggestedLevel)

  const { error: resultError } = await supabase.from('placement_results').insert({
    student_id: studentId,
    cefr_level: suggestedLevel,
    score,
    total_questions: total,
    answers,
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
