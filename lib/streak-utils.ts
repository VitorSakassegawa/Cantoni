export const STUDENT_STREAK_RULES = [
  'Seu streak sobe 1 ponto quando você faz ao menos uma atividade válida em um novo dia.',
  'Atividades válidas: revisar flashcards, adicionar flashcards e enviar homework.',
  'Aula concluída também conta como atividade para o dia em que ela for registrada no sistema.',
  'Se você repetir várias atividades no mesmo dia, o streak não sobe mais de uma vez.',
  'Se passar um dia inteiro sem atividade válida, o streak reinicia para 1 na próxima atividade.',
] as const

export function calculateNextStreak(
  currentStreak: number,
  lastActivityDate: string | null | undefined,
  activityDate: string
) {
  if (lastActivityDate === activityDate) {
    return {
      streakCount: currentStreak || 1,
      lastActivityDate: activityDate,
      changed: false,
    }
  }

  const activity = new Date(`${activityDate}T12:00:00`)
  const previous = lastActivityDate ? new Date(`${lastActivityDate}T12:00:00`) : null

  if (previous && previous.getTime() > activity.getTime()) {
    return {
      streakCount: currentStreak || 0,
      lastActivityDate,
      changed: false,
    }
  }

  const yesterday = new Date(activity)
  yesterday.setDate(yesterday.getDate() - 1)
  const isConsecutiveDay =
    previous && previous.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]

  return {
    streakCount: isConsecutiveDay ? Math.max(1, currentStreak || 0) + 1 : 1,
    lastActivityDate: activityDate,
    changed: true,
  }
}

export function getStreakSummary(input: {
  streakCount: number
  bestStreak: number
  lastActivityDate?: string | null
  today?: string
}) {
  const today = input.today || new Date().toISOString().split('T')[0]
  const countedToday = input.lastActivityDate === today
  const bestStreak = Math.max(input.bestStreak || 0, input.streakCount || 0)
  const remainingToBest = Math.max(0, bestStreak - (input.streakCount || 0))

  let headline = countedToday
    ? 'Hoje já contou para seu streak.'
    : 'Faça uma atividade hoje para manter sua sequência.'

  if ((input.streakCount || 0) === 0) {
    headline = 'Comece hoje sua primeira sequência.'
  } else if (remainingToBest === 0 && (input.streakCount || 0) > 0) {
    headline = countedToday
      ? 'Você está no seu melhor ritmo atual.'
      : 'Uma atividade hoje mantém seu melhor ritmo.'
  } else if (remainingToBest === 1) {
    headline = countedToday
      ? 'Falta 1 dia para bater seu recorde.'
      : 'Faça uma atividade hoje; depois faltará 1 dia para bater seu recorde.'
  }

  return {
    countedToday,
    bestStreak,
    remainingToBest,
    headline,
  }
}
