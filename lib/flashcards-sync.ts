import type { VocabularyEntry } from '@/lib/dashboard-types'

function normalizeText(value?: string | null) {
  return (value || '').trim()
}

function normalizeWordKey(value?: string | null) {
  return normalizeText(value).toLowerCase()
}

export function buildFlashcardSyncPlan(
  existingWords: Array<string | null | undefined>,
  vocabulary: VocabularyEntry[] | null | undefined
) {
  const existingWordKeys = new Set(existingWords.map((word) => normalizeWordKey(word)).filter(Boolean))
  const seenIncomingKeys = new Set<string>()

  const normalizedVocabulary = (vocabulary || [])
    .map((entry) => ({
      word: normalizeText(entry.word),
      translation: normalizeText(entry.translation),
      example: normalizeText(entry.example),
      key: normalizeWordKey(entry.word),
    }))
    .filter((entry) => entry.word && entry.translation)

  const toInsert = normalizedVocabulary.filter((entry) => {
    if (!entry.key || existingWordKeys.has(entry.key) || seenIncomingKeys.has(entry.key)) {
      return false
    }

    seenIncomingKeys.add(entry.key)
    return true
  })

  return {
    toInsert: toInsert.map((entry) => ({
      word: entry.word,
      translation: entry.translation,
      example: entry.example,
    })),
    skipped: normalizedVocabulary.length - toInsert.length,
  }
}
