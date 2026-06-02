// Gemini 2.5 Flash (and the 1.5 fallbacks) handle ~1M tokens, so we can keep
// far more of the transcript than the old 14k cap, which dropped the middle of
// most 45-min lessons (where corrections/vocabulary live).
export function truncateTranscriptForAI(text: string, maxLength = 100000) {
  const normalized = text.trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  const headLength = Math.max(1, Math.floor(maxLength * 0.6))
  const tailLength = Math.max(1, maxLength - headLength)
  const head = normalized.slice(0, headLength).trimEnd()
  const tail = normalized.slice(-tailLength).trimStart()

  return [
    head,
    '',
    '[Transcript truncated for AI processing. Middle section omitted.]',
    '',
    tail,
  ].join('\n')
}
