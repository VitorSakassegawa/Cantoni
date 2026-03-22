'use server'

import { generateAIContent } from '@/lib/ai'

export async function generatePlacementQuestions(level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' = 'A1') {
  const prompt = `
    Gere 5 perguntas de múltipla escolha para um teste de nivelamento de inglês no nível CEFR ${level}.
    As perguntas devem cobrir gramática, vocabulário e compreensão.
    
    Retorne APENAS um JSON no seguinte formato:
    {
      "questions": [
        {
          "id": 1,
          "question": "Texto da pergunta",
          "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
          "correctAnswer": 0,
          "explanation": "Por que esta é a correta?"
        }
      ]
    }
    
    Responda apenas com o JSON válido.
  `
  
  try {
    const response = await generateAIContent(prompt)
    // Clean potential markdown code blocks
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('Error generating placement questions:', error)
    return { questions: [] }
  }
}

import { createClient } from '@/lib/supabase/server'

export async function evaluatePlacementTest(answers: { correct: boolean }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  
  const studentId = user.id
  const score = answers.filter(a => a.correct).length
  const total = answers.length
  const ratio = score / total

  let suggestedLevel = 'A1'
  let suggestedNivel = 'Beginner'

  if (ratio >= 0.8) {
    suggestedLevel = 'B1'
    suggestedNivel = 'Intermediate'
  } else if (ratio >= 0.5) {
    suggestedLevel = 'A2'
    suggestedNivel = 'Elementary'
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      cefr_level: suggestedLevel,
      nivel: suggestedNivel,
      placement_test_completed: true 
    })
    .eq('id', studentId)

  if (error) throw error

  return { suggestedLevel, suggestedNivel, score, total }
}
