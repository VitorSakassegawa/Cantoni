const TRANSCRIPT_HEADER = '## Transcript imported from Google Meet'

export function extractVisibleLessonNotes(notes?: string | null) {
  const trimmedNotes = notes?.trim() || ''
  if (!trimmedNotes) {
    return null
  }

  if (!trimmedNotes.includes(TRANSCRIPT_HEADER)) {
    return trimmedNotes
  }

  const [manualNotes] = trimmedNotes.split(TRANSCRIPT_HEADER)
  const cleanedManualNotes = manualNotes.trim().replace(/\n+---\n*$/g, '').trim()
  return cleanedManualNotes || null
}

export function hasImportedTranscript(notes?: string | null) {
  return (notes || '').includes(TRANSCRIPT_HEADER)
}
