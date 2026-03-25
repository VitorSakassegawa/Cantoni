import { STUDENT_STREAK_RULES, getStreakSummary } from '@/lib/streak-utils'

export type JourneyMission = {
  id: string
  title: string
  description: string
  status: 'done' | 'pending'
  href: string
  actionLabel: string
}

export type JourneyAchievement = {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progressLabel: string
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
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60]
const FLASHCARD_MILESTONES = [10, 25, 50, 100]
const HOMEWORK_MILESTONES = [5, 10, 20, 40]
const LESSON_MILESTONES = [5, 10, 20, 40]

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
    progressLabel: unlocked ? `${currentValue}/${milestone}` : `${currentValue} de ${milestone}`,
  }
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

  return { missions, streakSummary, streakRules: STUDENT_STREAK_RULES }
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
