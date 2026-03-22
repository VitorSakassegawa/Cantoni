'use server'

import { generateAIContent } from '@/lib/ai'

export async function generatePlacementQuestions(
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' = 'A1',
  module: 'grammar' | 'reading' | 'listening' = 'grammar'
) {
  const modulePrompts = {
    grammar: `Gere 15 perguntas de múltipla escolha focadas em Gramática e Vocabulário de nível CEFR ${level}.`,
    reading: `Gere um pequeno texto em inglês de nível CEFR ${level} (aprox. 150 palavras) seguido de 5 perguntas de múltipla escolha sobre o texto.`,
    listening: `Gere uma transcrição de um diálogo cotidiano em inglês de nível CEFR ${level} (simulando um áudio) seguido de 5 perguntas de múltipla escolha sobre o que foi discutido.`
  }

  const prompt = `
    Trabalhe como um especialista em design de testes Cambridge/CEFR.
    ${modulePrompts[module]}
    
    Retorne APENAS um JSON no seguinte formato:
    {
      "module": "${module}",
      "text": "Texto ou diálogo (apenas para reading/listening, caso contrário null)",
      "questions": [
        {
          "id": 1,
          "question": "Pergunta",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0
        }
      ]
    }
  `
  
  try {
    const response = await generateAIContent(prompt)
    if (!response) throw new Error('AI returned empty response')
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    
    // Deep clone to ensure it's a plain object for Next.js 15
    return JSON.parse(JSON.stringify(parsed))
  } catch (error) {
    console.error('Error generating advanced questions:', error)
    return { questions: [], error: 'Falha ao gerar questões' }
  }
}

import { createClient } from '@/lib/supabase/server'

export async function evaluatePlacementTest(answers: { correct: boolean }[], attemptedLevel: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  
  const studentId = user.id
  const score = answers.filter(a => a.correct).length
  const total = answers.length
  const ratio = score / total

  let suggestedLevel = attemptedLevel
  let confirmed = false

  // Calibragem sugerida: 70% no nível atual confirma o nível. 
  // Se abaixo de 40%, sugere um nível abaixo.
  // Se acima de 90%, sugere que o aluno tente o nível acima (lógica adaptativa no front).
  
  if (ratio >= 0.7) {
    confirmed = true
  } else if (ratio < 0.4) {
    // Reduz o nível
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1']
    const idx = levels.indexOf(attemptedLevel)
    suggestedLevel = idx > 0 ? levels[idx - 1] : 'A1'
  }

  const nivelMap: Record<string, string> = {
    'A1': 'iniciante',
    'A2': 'basico',
    'B1': 'intermediario',
    'B2': 'intermediario', // Or map to something else if needed, but per constraint it must be one of the 6
    'C1': 'avancado'
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      cefr_level: suggestedLevel,
      nivel: nivelMap[suggestedLevel] || 'iniciante',
      placement_test_completed: true 
    })
    .eq('id', studentId)

  if (error) {
    console.error('Database update error:', error)
    throw new Error('Erro ao atualizar perfil no banco de dados.')
  }

  return { suggestedLevel, suggestedNivel: nivelMap[suggestedLevel], score, total, confirmed }
}
