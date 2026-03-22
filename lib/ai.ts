import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// User requested model: Gemini 3.1 Flash Lite (experimental/internal)
// Fallback: Gemini 2.5 Flash Lite
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash-8b'

export async function generateAIContent(prompt: string, modelName: string = PRIMARY_MODEL) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error(`Error with model ${modelName}:`, error)
    if (modelName !== FALLBACK_MODEL) {
      console.log(`Retrying with fallback model: ${FALLBACK_MODEL}`)
      return generateAIContent(prompt, FALLBACK_MODEL)
    }
    throw error
  }
}

export async function generateLessonSummary(notes: string) {
  const prompt = `
    Você é um assistente de ensino de inglês de alta qualidade para o professor Gabriel Cantoni.
    Resuma as seguintes notas de aula de forma amigável, motivadora e extremamente organizada para o aluno.
    
    Notas da Aula:
    "${notes}"
    
    O seu retorno deve ser em Markdown e conter as seguintes seções:
    1. **Resumo da Aula (TL;DR)**: Uma frase curta e motivadora sobre o que foi visto.
    2. **Principais Tópicos**: Bullet points dos assuntos gramaticais ou conversas.
    3. **Vocabulário Novo**: Uma lista de palavras/expressões chave com tradução curta.
    4. **Dica de Estudo Personalizada**: Uma sugestão de como praticar o que foi visto.
    5. **Dever de Casa**: Reforçar se há algo pendente.
    
    Mantenha o tom premium, encorajador e profissional. Use emojis de forma moderada.
    Responda apenas com o Markdown do resumo.
  `
  return generateAIContent(prompt)
}
