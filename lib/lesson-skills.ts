export type SkillScores = {
  speaking: number | null
  listening: number | null
  reading: number | null
  writing: number | null
}

export const SKILL_KEYS = ['speaking', 'listening', 'reading', 'writing'] as const

function clampSkill(value: unknown): number | null {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > 10) return null
  return n
}

// Normalizes raw AI skill output: each skill is an integer 1–10 or null
// (the AI returns null for skills it did not observe in the lesson).
export function normalizeSkillScores(raw: unknown): SkillScores {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    speaking: clampSkill(obj.speaking),
    listening: clampSkill(obj.listening),
    reading: clampSkill(obj.reading),
    writing: clampSkill(obj.writing),
  }
}

export function hasAnySkillScore(scores: SkillScores): boolean {
  return SKILL_KEYS.some((key) => scores[key] !== null)
}

// Per-skill rolling average across lessons, ignoring nulls (skills never
// observed stay null instead of being dragged down by missing data).
export function averageSkillScores(list: SkillScores[]): SkillScores {
  const out: SkillScores = { speaking: null, listening: null, reading: null, writing: null }
  for (const key of SKILL_KEYS) {
    const values = list.map((s) => s[key]).filter((v): v is number => typeof v === 'number')
    out[key] = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null
  }
  return out
}
