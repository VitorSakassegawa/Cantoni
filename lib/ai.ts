import { GoogleGenerativeAI } from '@google/generative-ai'

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY is not defined!')
    throw new Error('Configuração de IA incompleta (API Key ausente). No Vercel, adicione GEMINI_API_KEY.')
  }
  return new GoogleGenerativeAI(apiKey)
}

// Mode discovery confirmed: gemini-2.5-flash and gemini-2.0-flash are available
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview'
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite'
const STABLE_FALLBACK = 'gemini-2.0-flash'

export async function generateAIContent(
  prompt: string, 
  modelName: string = PRIMARY_MODEL,
  responseMimeType: string = 'text/plain'
) {
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType }
    })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error(`Error with model ${modelName}:`, error)

    // Check for 403 or specific preview model errors
    if (modelName === PRIMARY_MODEL) {
      console.log(`Retrying with fallback model: ${FALLBACK_MODEL}`)
      return generateAIContent(prompt, FALLBACK_MODEL, responseMimeType)
    }

    if (modelName === FALLBACK_MODEL) {
      console.log(`Retrying with stable fallback: ${STABLE_FALLBACK}`)
      return generateAIContent(prompt, STABLE_FALLBACK, responseMimeType)
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

export async function generateAIAudio(text: string) {
  try {
    const genAI = getGenAI()
    // Using discovered TTS model
    const modelName = "gemini-2.5-flash-preview-tts"
    const model = genAI.getGenerativeModel({ model: modelName })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Generate spoken audio for this text: "${text}".` }] }],
      // Omitting responseMimeType as it caused 400 Bad Request
    })

    const response = await result.response
    // Audio is usually in parts[0].inlineData
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    return part?.inlineData?.data || null
  } catch (error) {
    console.error('Error with primary audio model:', error)
    return null
  }
}
