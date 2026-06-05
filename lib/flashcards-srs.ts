export const DEFAULT_EASE_FACTOR = 2.5
export const MIN_EASE_FACTOR = 1.3

// A card is flagged as a "leech" once it has lapsed this many times — it keeps
// resetting to interval=1 and is wasting the student's time without help.
export const LEECH_THRESHOLD = 6

export function isLeech(lapses: number | null | undefined): boolean {
  return (Number(lapses) || 0) >= LEECH_THRESHOLD
}

// Cumulative lapse counter: increments on a lapse, never decreases.
export function nextLapses(prevLapses: number | null | undefined, lapsed: boolean): number {
  const prev = Math.max(0, Number(prevLapses) || 0)
  return lapsed ? prev + 1 : prev
}

export type SRSResult = {
  interval: number
  repetitions: number
  easeFactor: number
  lapsed: boolean
}

/**
 * SuperMemo-2 (SM-2), with graded intervals so the four UI outcomes
 * (Errei / Difícil / Bom / Fácil → q = 1 / 3 / 4 / 5) actually diverge.
 * All inputs are defaulted/clamped to avoid NaN poisoning the schedule
 * if a column is ever null.
 */
export function calculateNextSRS(
  qRaw: number,
  prevIntervalRaw: number | null | undefined,
  prevRepetitionsRaw: number | null | undefined,
  prevEaseFactorRaw: number | null | undefined
): SRSResult {
  const q = Math.max(0, Math.min(5, Math.round(Number(qRaw) || 0)))
  const prevInterval = Math.max(0, Number(prevIntervalRaw) || 0)
  const prevRepetitions = Math.max(0, Number(prevRepetitionsRaw) || 0)
  let easeFactor = Number(prevEaseFactorRaw) || DEFAULT_EASE_FACTOR

  let interval: number
  let repetitions: number
  const lapsed = q < 3

  if (!lapsed) {
    if (prevRepetitions === 0) {
      interval = 1
    } else if (prevRepetitions === 1) {
      interval = q === 5 ? 6 : 4
    } else {
      // Hard grows slowly, Bom by ease factor, Fácil with a bonus —
      // always at least one day past the previous interval.
      const multiplier = q === 3 ? 1.2 : q === 4 ? easeFactor : easeFactor * 1.3
      interval = Math.max(prevInterval + 1, Math.round(prevInterval * multiplier))
    }
    repetitions = prevRepetitions + 1
  } else {
    repetitions = 0
    interval = 1
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR

  return { interval, repetitions, easeFactor, lapsed }
}
