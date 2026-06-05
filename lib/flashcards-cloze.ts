// Builds a "complete the sentence" (cloze) prompt by blanking the target word
// out of its example sentence. Returns null when the word can't be found in the
// example (different inflection, missing example, etc.) so the caller can fall
// back to a standard card.
export function buildCloze(example: string | null | undefined, word: string | null | undefined): string | null {
  const ex = (example || '').trim()
  const w = (word || '').trim()
  if (!ex || !w) return null

  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'gi')
  if (!re.test(ex)) return null

  return ex.replace(re, '_____')
}

export type CardMode = 'standard' | 'cloze' | 'audio'

// Deterministic mode per card position so the same card keeps the same mode
// within a session. Prefers cloze when an example is available; otherwise the
// audio/standard rotation. Index 0 stays standard (gentle start).
export function pickCardMode(index: number, hasCloze: boolean): CardMode {
  const seed = index % 3
  if (seed === 1 && hasCloze) return 'cloze'
  if (seed === 2) return 'audio'
  return 'standard'
}
