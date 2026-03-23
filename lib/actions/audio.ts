'use server'

import { generateAIAudio } from '@/lib/ai'

export async function getAIVocabularyAudio(text: string) {
  try {
    const audioBase64 = await generateAIAudio(text)
    if (!audioBase64) return { success: false, error: 'Falha ao gerar áudio' }
    
    return { success: true, audio: audioBase64 }
  } catch (error: any) {
    console.error('Error in getAIVocabularyAudio:', error)
    return { success: false, error: error.message }
  }
}
