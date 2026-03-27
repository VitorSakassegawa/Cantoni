import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import type { VocabularyEntry } from '@/lib/dashboard-types'

function normalizeText(value?: string | null) {
  return (value || '').trim()
}

export async function syncFlashcardsFromVocabulary(
  studentId: string,
  vocabulary: VocabularyEntry[] | null | undefined
) {
  const validVocabulary = (vocabulary || [])
    .map((entry) => ({
      word: normalizeText(entry.word),
      translation: normalizeText(entry.translation),
      example: normalizeText(entry.example),
    }))
    .filter((entry) => entry.word && entry.translation)

  if (!studentId || validVocabulary.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  const supabase = await createServiceClient()
  let inserted = 0
  let skipped = 0

  for (const entry of validVocabulary) {
    const { data: existingCard } = await supabase
      .from('flashcards')
      .select('id')
      .eq('aluno_id', studentId)
      .ilike('word', entry.word)
      .maybeSingle()

    if (existingCard) {
      skipped += 1
      continue
    }

    const { error } = await supabase.from('flashcards').insert({
      aluno_id: studentId,
      word: entry.word,
      translation: entry.translation,
      example: entry.example || null,
      next_review: new Date().toISOString(),
    })

    if (error) {
      throw error
    }

    inserted += 1
  }

  return { inserted, skipped }
}
