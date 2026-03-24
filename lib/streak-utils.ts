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
  const isConsecutiveDay = previous && previous.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]

  return {
    streakCount: isConsecutiveDay ? Math.max(1, currentStreak || 0) + 1 : 1,
    lastActivityDate: activityDate,
    changed: true,
  }
}
