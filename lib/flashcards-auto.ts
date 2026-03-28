import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import type { VocabularyEntry } from '@/lib/dashboard-types'
import { buildFlashcardSyncPlan } from '@/lib/flashcards-sync'

export async function syncFlashcardsFromVocabulary(
  studentId: string,
  vocabulary: VocabularyEntry[] | null | undefined
) {
  if (!studentId || !vocabulary || vocabulary.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  const supabase = await createServiceClient()
  const { data: existingCards, error: existingCardsError } = await supabase
    .from('flashcards')
    .select('word')
    .eq('aluno_id', studentId)

  if (existingCardsError) {
    throw existingCardsError
  }

  const syncPlan = buildFlashcardSyncPlan(
    (existingCards || []).map((card) => card.word),
    vocabulary
  )

  if (syncPlan.toInsert.length === 0) {
    return { inserted: 0, skipped: syncPlan.skipped }
  }

  const { error } = await supabase.from('flashcards').insert(
    syncPlan.toInsert.map((entry) => ({
      aluno_id: studentId,
      word: entry.word,
      translation: entry.translation,
      example: entry.example || null,
      next_review: new Date().toISOString(),
    }))
  )

  if (error) {
    throw error
  }

  return { inserted: syncPlan.toInsert.length, skipped: syncPlan.skipped }
}
