import 'server-only'
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

export async function generateLessonAnalysisV2(notes: string, studentInfo: { name: string, level: string, lessonType: string, date: string }) {
  const prompt = `
    You are an expert English language assistant specialized in transforming lesson transcripts into structured learning summaries.
    Your task is to convert raw transcripts from 1:1 English lessons into a standardized lesson summary.

    STRICT RULES:
    - Always follow the exact template structure provided.
    - Do NOT invent or assume information that is not present in the transcript.
    - If information is missing, write "Not observed".
    - Keep the language clear, simple, and professional.
    - Adapt explanations to the student level (${studentInfo.level}).
    - Be concise and objective.
    - Avoid repetition.
    - Do NOT include any performance feedback or evaluation.
    - Only extract real corrections and examples from the transcript.
    - Vocabulary must be relevant and actually used during the lesson.
    - Corrections must include a short explanation.
    - Do NOT skip any section of the template.
    - Use tables exactly where specified.

    Student Name: ${studentInfo.name}
    Level: ${studentInfo.level}
    Lesson Type: ${studentInfo.lessonType}
    Duration: [XX minutes]
    Date: ${studentInfo.date}

    Transcript:
    "${notes}"

    Generate the lesson summary using the template below.
    
    IMPORTANT: You must return a JSON object with the following fields:
    - "summary_en": The full summary in English (Markdown).
    - "summary_pt": The full summary in Portuguese (Markdown).
    - "vocabulary": A list of objects { "word": string, "translation": string, "example": string }.
    - "homework": A string describing the homework task mentioned.
    - "due_date": A string (YYYY-MM-DD) if a deadline was explicitly mentioned, otherwise null.

    TEMPLATE (to be used for both summary_en and summary_pt, translated accordingly):
    📘 Lesson Summary – [Student Name]  
    Date: [DD/MM/YYYY]  
    Level: [A1–C2]  
    Lesson Type: [TYPE]  
    Duration: [XX min]

    ---
    🎯 Lesson Objective
    ---
    🧠 What We Covered
    ---
    🗣️ Key Vocabulary & Expressions (Use Tables)
    ---
    ❗ Corrections & Improvements (Use Tables)
    ---
    🧩 Common Mistakes Pattern
    ---
    📝 Homework / Practice
    ---
    🔁 Review From Previous Lesson
    ---
    🚀 Next Lesson Plan
  `
  const response = await generateAIContent(prompt, PRIMARY_MODEL, 'application/json')
  return extractAndParseJSON(response)
}

function pcmToBase64Wav(pcmBase64: string): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64')
  
  // WAV Header for 16-bit, 24kHz, 1 channel PCM
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmBuffer.length
  const chunkSize = 36 + dataSize
  
  const header = Buffer.alloc(44)
  // RIFF chunk descriptor
  header.write('RIFF', 0)
  header.writeUInt32LE(chunkSize, 4)
  header.write('WAVE', 8)
  // fmt sub-chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  // data sub-chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  
  const wavBuffer = Buffer.concat([header, pcmBuffer])
  return wavBuffer.toString('base64')
}

export async function generateAIAudio(text: string, modelName: string = "gemini-2.5-flash-preview-tts"): Promise<string | null> {
  console.log(`--- Starting generateAIAudio with ${modelName} ---`)
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: modelName })

    const audioPromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Please provide the audio for the following text: "${text}"` }] }],
      generationConfig: {
        // @ts-ignore
        responseModalities: ["AUDIO"]
      }
    })

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 45000)
    )

    const result: any = await Promise.race([audioPromise, timeoutPromise])
    const response = await result.response
    const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
    
    if (part?.inlineData?.data) {
      console.log(`Audio generated successfully with ${modelName}. Converting PCM to WAV...`)
      return pcmToBase64Wav(part.inlineData.data)
    }

    throw new Error('No audio data in response')
  } catch (error: any) {
    console.error(`Error with ${modelName}:`, error.message || error)
    return null
  } finally {
    console.log(`--- Finished generateAIAudio (${modelName}) ---`)
  }
}

/**
 * Robustly extracts and parses JSON from an AI response string.
 * Handles markdown fences, extra text, and basic malformed JSON.
 */
export function extractAndParseJSON(text: string): any {
  let content = text.trim()
  
  // 1. Remove markdown fences if present
  if (content.startsWith('```')) {
    content = content.replace(/^```(json)?/, '').replace(/```$/, '').trim()
  }

  try {
    return JSON.parse(content)
  } catch (e) {
    // 2. If standard parse fails, try to find the first '{' and last '}'
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    
    if (start !== -1 && end !== -1 && end > start) {
      const jsonBlock = content.substring(start, end + 1)
      try {
        return JSON.parse(jsonBlock)
      } catch (innerError) {
        console.error('Failed to parse extracted JSON block:', innerError)
        // 3. Last ditch: return null or throw to be handled by caller
        throw new Error('Could not parse JSON from AI response')
      }
    }
    
    throw e
  }
}
