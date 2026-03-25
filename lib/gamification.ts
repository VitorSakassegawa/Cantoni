import { STUDENT_STREAK_RULES, getStreakSummary } from '@/lib/streak-utils'

export const JOURNEY_XP_REWARDS = {
  flashcardReview: 4,
  flashcardAdd: 6,
  homeworkComplete: 18,
  lessonComplete: 25,
} as const

export type JourneyXpAction = keyof typeof JOURNEY_XP_REWARDS

export type JourneyMission = {
  id: string
  title: string
  description: string
  status: 'done' | 'pending'
  href: string
  actionLabel: string
}

export type WeeklyMission = JourneyMission & {
  target: number
  current: number
  unitLabel: string
  progressPct: number
}

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type JourneyAchievement = {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progressLabel: string
  rarity: AchievementRarity
}

export type WeeklyPerformance = {
  label: string
  score: number
  lessons: number
  homework: number
  flashcards: number
}

export type JourneySnapshot = {
  streakCount: number
  bestStreak: number
  lastActivityDate?: string | null
  flashcardsDue: number
  totalFlashcards: number
  pendingHomework: number
  completedHomework: number
  completedLessons: number
  weeklyLessons: number
  weeklyHomework: number
  weeklyFlashcards: number
  weeklyHistory: WeeklyPerformance[]
}

export type JourneyLevelSummary = {
  xp: number
  level: number
  currentLevelXp: number
  nextLevelXp: number
  progressPct: number
  title: string
}

export type JourneyXpRule = {
  id: JourneyXpAction
  title: string
  description: string
  xp: number
  href: string
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60]
const FLASHCARD_MILESTONES = [10, 25, 50, 100]
const HOMEWORK_MILESTONES = [5, 10, 20, 40]
const LESSON_MILESTONES = [5, 10, 20, 40]

function getAchievementRarity(milestone: number): AchievementRarity {
  if (milestone >= 60) return 'legendary'
  if (milestone >= 30) return 'epic'
  if (milestone >= 14) return 'rare'
  return 'common'
}

function buildMilestoneAchievement(
  prefix: string,
  title: string,
  description: string,
  icon: string,
  currentValue: number,
  milestone: number
): JourneyAchievement {
  const unlocked = currentValue >= milestone
  return {
    id: `${prefix}-${milestone}`,
    title: `${title} ${milestone}`,
    description,
    icon,
    unlocked,
    rarity: getAchievementRarity(milestone),
    progressLabel: unlocked ? `${currentValue}/${milestone}` : `${currentValue} de ${milestone}`,
  }
}

function buildProgressPct(current: number, target: number) {
  return Math.min(100, Math.round((current / target) * 100))
}

export function getXpReward(action: JourneyXpAction) {
  return JOURNEY_XP_REWARDS[action]
}

export function buildJourneyXpRules(): JourneyXpRule[] {
  return [
    {
      id: 'flashcardReview',
      title: 'Revisar flashcards',
      description: 'Cada revisão salva na sessão de estudo soma XP na sua jornada.',
      xp: JOURNEY_XP_REWARDS.flashcardReview,
      href: '/aluno/flashcards',
    },
    {
      id: 'flashcardAdd',
      title: 'Adicionar palavras novas',
      description: 'Expandir seu banco pessoal de vocabulário também vira progresso visível.',
      xp: JOURNEY_XP_REWARDS.flashcardAdd,
      href: '/aluno/flashcards',
    },
    {
      id: 'homeworkComplete',
      title: 'Enviar homework',
      description: 'Fechar tarefas no portal pesa bastante no seu ritmo semanal.',
      xp: JOURNEY_XP_REWARDS.homeworkComplete,
      href: '/aluno/aulas',
    },
    {
      id: 'lessonComplete',
      title: 'Concluir aula',
      description: 'Aulas concluídas registradas no sistema são sua maior fonte de XP.',
      xp: JOURNEY_XP_REWARDS.lessonComplete,
      href: '/aluno',
    },
  ]
}

export function buildJourneyMissions(snapshot: JourneySnapshot) {
  const streakSummary = getStreakSummary({
    streakCount: snapshot.streakCount,
    bestStreak: snapshot.bestStreak,
    lastActivityDate: snapshot.lastActivityDate,
  })

  const missions: JourneyMission[] = [
    {
      id: 'streak-today',
      title: 'Manter o streak hoje',
      description: streakSummary.countedToday
        ? 'Você já fez uma atividade válida hoje e manteve sua sequência.'
        : 'Faça uma atividade válida hoje para manter sua sequência ativa.',
      status: streakSummary.countedToday ? 'done' : 'pending',
      href: '/aluno/flashcards',
      actionLabel: streakSummary.countedToday ? 'Concluído' : 'Ir praticar',
    },
    {
      id: 'flashcards-due',
      title: 'Revisar palavras pendentes',
      description:
        snapshot.flashcardsDue > 0
          ? `${snapshot.flashcardsDue} flashcard(s) já estão prontos para revisar.`
          : 'Nenhum flashcard pendente por enquanto.',
      status: snapshot.flashcardsDue > 0 ? 'pending' : 'done',
      href: '/aluno/flashcards',
      actionLabel: snapshot.flashcardsDue > 0 ? 'Revisar agora' : 'Tudo certo',
    },
    {
      id: 'homework',
      title: 'Fechar tarefas em aberto',
      description:
        snapshot.pendingHomework > 0
          ? `${snapshot.pendingHomework} tarefa(s) ainda precisam ser concluídas.`
          : 'Nenhuma tarefa pendente neste momento.',
      status: snapshot.pendingHomework > 0 ? 'pending' : 'done',
      href: '/aluno/aulas',
      actionLabel: snapshot.pendingHomework > 0 ? 'Abrir aulas' : 'Concluído',
    },
  ]

  const weeklyMissions: WeeklyMission[] = [
    {
      id: 'weekly-lessons',
      title: 'Fechar aulas da semana',
      description: 'Aulas concluídas nesta semana contam como consistência real do seu ritmo.',
      status: snapshot.weeklyLessons >= 1 ? 'done' : 'pending',
      href: '/aluno',
      actionLabel: snapshot.weeklyLessons >= 1 ? 'Semana ativa' : 'Ver agenda',
      target: 1,
      current: snapshot.weeklyLessons,
      unitLabel: 'aula',
      progressPct: buildProgressPct(snapshot.weeklyLessons, 1),
    },
    {
      id: 'weekly-homework',
      title: 'Entregar tarefas da semana',
      description: 'Fechar homework mantém seu progresso e ajuda a sustentar o streak.',
      status: snapshot.weeklyHomework >= 2 ? 'done' : 'pending',
      href: '/aluno/aulas',
      actionLabel: snapshot.weeklyHomework >= 2 ? 'Boa semana' : 'Abrir tarefas',
      target: 2,
      current: snapshot.weeklyHomework,
      unitLabel: 'tarefas',
      progressPct: buildProgressPct(snapshot.weeklyHomework, 2),
    },
    {
      id: 'weekly-flashcards',
      title: 'Expandir o banco de palavras',
      description: 'Adicionar ou revisar vocabulário durante a semana mantém o inglês vivo fora da aula.',
      status: snapshot.weeklyFlashcards >= 5 ? 'done' : 'pending',
      href: '/aluno/flashcards',
      actionLabel: snapshot.weeklyFlashcards >= 5 ? 'Meta batida' : 'Praticar agora',
      target: 5,
      current: snapshot.weeklyFlashcards,
      unitLabel: 'palavras',
      progressPct: buildProgressPct(snapshot.weeklyFlashcards, 5),
    },
  ]

  return { missions, weeklyMissions, streakSummary, streakRules: STUDENT_STREAK_RULES }
}

export function buildJourneyAchievements(snapshot: JourneySnapshot) {
  const achievements: JourneyAchievement[] = [
    ...STREAK_MILESTONES.map((milestone) =>
      buildMilestoneAchievement(
        'streak',
        'Streak',
        'Dias consecutivos com atividades válidas registradas.',
        'flame',
        snapshot.bestStreak,
        milestone
      )
    ),
    ...FLASHCARD_MILESTONES.map((milestone) =>
      buildMilestoneAchievement(
        'flashcards',
        'Banco de palavras',
        'Quantidade total de palavras adicionadas ao seu banco pessoal.',
        'brain',
        snapshot.totalFlashcards,
        milestone
      )
    ),
    ...HOMEWORK_MILESTONES.map((milestone) =>
      buildMilestoneAchievement(
        'homework',
        'Homework',
        'Tarefas marcadas como concluídas dentro do portal.',
        'check',
        snapshot.completedHomework,
        milestone
      )
    ),
    ...LESSON_MILESTONES.map((milestone) =>
      buildMilestoneAchievement(
        'lessons',
        'Aulas concluídas',
        'Aulas registradas como concluídas no sistema.',
        'trophy',
        snapshot.completedLessons,
        milestone
      )
    ),
  ]

  return {
    unlocked: achievements.filter((achievement) => achievement.unlocked),
    locked: achievements.filter((achievement) => !achievement.unlocked),
    all: achievements,
  }
}

export function buildJourneyLevel(snapshot: JourneySnapshot): JourneyLevelSummary {
  const xp =
    snapshot.bestStreak * 12 +
    snapshot.totalFlashcards * 4 +
    snapshot.completedHomework * 18 +
    snapshot.completedLessons * 25

  const level = Math.max(1, Math.floor(xp / 120) + 1)
  const currentLevelFloor = (level - 1) * 120
  const nextLevelXp = level * 120
  const currentLevelXp = xp - currentLevelFloor
  const progressPct = Math.min(100, Math.round((currentLevelXp / 120) * 100))

  const title =
    level >= 12
      ? 'Legend'
      : level >= 8
        ? 'Master'
        : level >= 5
          ? 'Explorer'
          : level >= 3
            ? 'Momentum'
            : 'Starter'

  return {
    xp,
    level,
    currentLevelXp,
    nextLevelXp,
    progressPct,
    title,
  }
}

export function buildPersonalBestWeek(snapshot: JourneySnapshot) {
  const weeklyHistory = snapshot.weeklyHistory
  const currentWeek = weeklyHistory[0] || {
    label: 'Esta semana',
    score: snapshot.weeklyLessons * 25 + snapshot.weeklyHomework * 18 + snapshot.weeklyFlashcards * 4,
    lessons: snapshot.weeklyLessons,
    homework: snapshot.weeklyHomework,
    flashcards: snapshot.weeklyFlashcards,
  }

  const bestWeek = weeklyHistory.reduce((best, week) => {
    if (!best || week.score > best.score) return week
    return best
  }, weeklyHistory[0] || currentWeek)

  const rankLabel =
    currentWeek.score >= bestWeek.score
      ? 'Melhor semana pessoal'
      : `${Math.max(0, bestWeek.score - currentWeek.score)} XP para bater sua melhor semana`

  return {
    currentWeek,
    bestWeek,
    rankLabel,
  }
}
