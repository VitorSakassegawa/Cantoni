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

export async function evaluatePlacementTest(answers: { questionId: number, selectedOption: number }[], studentId: string) {
  // Logic to calculate score and update student level in Supabase
  // For now, return a placeholder
  return { suggestedLevel: 'B1', score: 80 }
}
