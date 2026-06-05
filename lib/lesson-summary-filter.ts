// Removes teacher-only sections from a lesson summary so the student-facing copy
// (email + the student's own report view) stays encouraging and free of the
// error analysis. The professor view keeps the full summary.
//
// Teacher-only = "Correções & Melhorias" and "Padrão de Erros Comuns" (the
// markdown headings the AI produces). Matched on the heading text, then the
// section is dropped until the next heading or horizontal rule.
const TEACHER_ONLY_HEADING = /(corre[çc][õo]es|padr[ãa]o\s+de\s+erros|error\s+pattern|corrections|mistakes)/i

// Inverse of stripTeacherOnlySections: returns ONLY the teacher-only sections
// (corrections / error patterns) — used to surface "what to focus on" for the
// teacher in the next-lesson prep. Returns '' when there are none.
export function extractTeacherOnlySections(markdown: string | null | undefined): string {
  if (!markdown) return ''

  const out: string[] = []
  let capturing = false

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      capturing = TEACHER_ONLY_HEADING.test(heading[1])
      if (capturing) out.push(line)
      continue
    }
    if (capturing) {
      if (/^[-*_]{3,}$/.test(line.trim())) {
        capturing = false
        continue
      }
      out.push(line)
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripTeacherOnlySections(markdown: string | null | undefined): string {
  if (!markdown) return markdown ?? ''

  const out: string[] = []
  let skipping = false

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      skipping = TEACHER_ONLY_HEADING.test(heading[1])
      if (skipping) continue // drop the teacher-only heading itself
    }

    if (skipping) {
      // The section ends at the next horizontal rule (the next heading is
      // already handled above, which flips `skipping` off when appropriate).
      if (/^[-*_]{3,}$/.test(line.trim())) skipping = false
      continue
    }

    out.push(line)
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // collapse gaps left by removed sections
    .replace(/^(?:\s*[-*_]{3,}\s*\n)+/, '') // drop a leading rule left behind
    .trim()
}
