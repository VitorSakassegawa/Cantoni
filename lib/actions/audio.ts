'use server'

import { generateAIAudio } from '@/lib/ai'

type AIVocabularyAudioResult =
  | { success: true; audio: string }
  | { success: false; error: string }

export async function getAIVocabularyAudio(text: string): Promise<AIVocabularyAudioResult> {
  try {
    const audioBase64 = await generateAIAudio(text)
    if (!audioBase64) {
      return { success: false, error: 'Falha ao gerar audio' }
    }

    return { success: true, audio: audioBase64 }
  } catch (error: unknown) {
    console.error('Error in getAIVocabularyAudio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao gerar audio',
    }
  }
}
