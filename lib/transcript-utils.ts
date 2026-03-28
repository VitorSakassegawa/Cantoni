export function truncateTranscriptForAI(text: string, maxLength = 14000) {
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
