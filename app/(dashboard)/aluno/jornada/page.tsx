import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Flame,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react'
import {
  buildJourneyAchievements,
  buildJourneyLevel,
  buildJourneyMissions,
  buildPersonalBestWeek,
  type AchievementRarity,
  type JourneyAchievement,
  type WeeklyPerformance,
} from '@/lib/gamification'

function iconForAchievement(icon: JourneyAchievement['icon']) {
  switch (icon) {
    case 'brain':
      return BrainCircuit
    case 'check':
      return CheckCircle2
    case 'trophy':
      return Trophy
    default:
      return Flame
  }
}

function rarityClasses(rarity: AchievementRarity, unlocked: boolean) {
  if (!unlocked) {
    return {
      card: 'border-slate-100 bg-slate-50/80',
      icon: 'bg-white text-slate-400',
      badge: 'secondary' as const,
    }
  }

  switch (rarity) {
    case 'legendary':
      return {
        card: 'border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-white shadow-xl shadow-amber-200/40',
        icon: 'bg-amber-500 text-white',
        badge: 'warning' as const,
      }
    case 'epic':
      return {
        card: 'border-indigo-200 bg-gradient-to-br from-indigo-100 via-white to-blue-50 shadow-xl shadow-indigo-200/35',
        icon: 'bg-indigo-600 text-white',
        badge: 'default' as const,
      }
    case 'rare':
      return {
        card: 'border-blue-200 bg-blue-50/80 shadow-lg shadow-blue-200/30',
        icon: 'bg-blue-600 text-white',
        badge: 'default' as const,
      }
    default:
      return {
        card: 'border-emerald-200 bg-emerald-50/80 shadow-lg shadow-emerald-200/25',
        icon: 'bg-emerald-600 text-white',
        badge: 'success' as const,
      }
  }
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 6)
  next.setHours(23, 59, 59, 999)
  return next
}

function formatWeekLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export const dynamic = 'force-dynamic'

export default async function AlunoJornadaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, streak_count, best_streak, last_activity_date')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professor') redirect('/professor')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('id')
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')

  const contractIds = ((contratos || []) as Array<{ id: number }>).map((entry) => entry.id)
  const now = new Date().toISOString()
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())

  const [{ count: dueFlashcardsCount }, { count: totalFlashcardsCount }, { count: pendingHomeworkCount }, { count: completedHomeworkCount }, { count: completedLessonsCount }, { count: weeklyFlashcardsCount }, { count: weeklyHomeworkCount }, { count: weeklyLessonsCount }] =
    await Promise.all([
      supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', user.id)
        .lte('next_review', now),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('aluno_id', user.id),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .eq('has_homework', true)
        .eq('homework_completed', false),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .eq('homework_completed', true),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .in('status', ['dada', 'finalizado']),
      supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString()),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .eq('homework_completed', true)
        .gte('data_hora', weekStart.toISOString())
        .lte('data_hora', weekEnd.toISOString()),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .in('status', ['dada', 'finalizado'])
        .gte('data_hora', weekStart.toISOString())
        .lte('data_hora', weekEnd.toISOString()),
    ])

  const weeklyHistory: WeeklyPerformance[] = []
  for (let index = 0; index < 6; index += 1) {
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - index * 7)
    const start = startOfWeek(baseDate)
    const end = endOfWeek(baseDate)

    const [{ count: lessons }, { count: homework }, { count: flashcards }] = await Promise.all([
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .in('status', ['dada', 'finalizado'])
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString()),
      supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .in('contrato_id', contractIds.length > 0 ? contractIds : [-1])
        .eq('homework_completed', true)
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString()),
      supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('aluno_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
    ])

    const score = (lessons || 0) * 25 + (homework || 0) * 18 + (flashcards || 0) * 4
    weeklyHistory.push({
      label: `${formatWeekLabel(start)} - ${formatWeekLabel(end)}`,
      score,
      lessons: lessons || 0,
      homework: homework || 0,
      flashcards: flashcards || 0,
    })
  }

  const snapshot = {
    streakCount: profile?.streak_count || 0,
    bestStreak: profile?.best_streak || 0,
    lastActivityDate: profile?.last_activity_date,
    flashcardsDue: dueFlashcardsCount || 0,
    totalFlashcards: totalFlashcardsCount || 0,
    pendingHomework: pendingHomeworkCount || 0,
    completedHomework: completedHomeworkCount || 0,
    completedLessons: completedLessonsCount || 0,
    weeklyLessons: weeklyLessonsCount || 0,
    weeklyHomework: weeklyHomeworkCount || 0,
    weeklyFlashcards: weeklyFlashcardsCount || 0,
    weeklyHistory,
  }

  const { missions, weeklyMissions, streakSummary, streakRules } = buildJourneyMissions(snapshot)
  const achievements = buildJourneyAchievements(snapshot)
  const levelSummary = buildJourneyLevel(snapshot)
  const personalBest = buildPersonalBestWeek(snapshot)

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1e3a8a] p-10 text-white shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 h-full w-[50%] bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              Jornada do aluno
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Consistência virou progresso visível
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-blue-100/80">
              Veja seu XP, seu nível, suas metas e sua melhor semana pessoal usando aulas, flashcards e homework que já existem no portal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:min-w-[360px]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Streak atual</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{snapshot.streakCount} dias</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">XP total</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{levelSummary.xp}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Star className="h-4 w-4 text-amber-500" /> XP e nível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Nível atual</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{levelSummary.level}</p>
                <p className="text-[11px] font-medium text-slate-500">{levelSummary.title}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Melhor recorde</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{streakSummary.bestStreak}</p>
                <p className="text-[11px] font-medium text-slate-500">dias de streak</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo nível</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                  {Math.max(0, levelSummary.nextLevelXp - levelSummary.xp)}
                </p>
                <p className="text-[11px] font-medium text-slate-500">XP restantes</p>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Barra de progressão</p>
                  <p className="mt-2 text-lg font-black tracking-tight text-blue-900">
                    {levelSummary.currentLevelXp} XP dentro do nível {levelSummary.level}
                  </p>
                </div>
                <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
                  {levelSummary.progressPct}%
                </Badge>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${levelSummary.progressPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Sparkles className="h-4 w-4 text-indigo-500" /> Ritmo de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Resumo</p>
              <p className="mt-2 text-lg font-black tracking-tight text-blue-900">{streakSummary.headline}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flashcards</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{snapshot.totalFlashcards}</p>
                <p className="text-[11px] font-medium text-slate-500">{snapshot.flashcardsDue} para revisar</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homework</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{snapshot.completedHomework}</p>
                <p className="text-[11px] font-medium text-slate-500">{snapshot.pendingHomework} pendente(s)</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regras do streak</p>
              <div className="mt-4 space-y-3">
                {streakRules.map((rule) => (
                  <div key={rule} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-600">
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Target className="h-4 w-4 text-blue-500" /> Missões da semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {weeklyMissions.map((mission) => (
              <div
                key={mission.id}
                className={`rounded-3xl border px-5 py-5 ${
                  mission.status === 'done'
                    ? 'border-emerald-100 bg-emerald-50/80'
                    : 'border-amber-100 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black tracking-tight text-slate-900">{mission.title}</p>
                        <Badge variant={mission.status === 'done' ? 'success' : 'warning'} className="text-[8px] font-black uppercase tracking-widest">
                          {mission.status === 'done' ? 'Concluída' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-500">{mission.description}</p>
                    </div>
                    <Link
                      href={mission.href}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
                    >
                      {mission.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>
                        {mission.current}/{mission.target} {mission.unitLabel}
                      </span>
                      <span>{mission.progressPct}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${mission.progressPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Trophy className="h-4 w-4 text-amber-500" /> Ranking pessoal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Melhor semana</p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{personalBest.bestWeek.label}</p>
              <p className="text-sm font-medium text-slate-500">{personalBest.bestWeek.score} XP acumulados</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semana atual</p>
              <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{personalBest.currentWeek.label}</p>
              <p className="text-sm font-medium text-slate-500">{personalBest.rankLabel}</p>
            </div>

            <div className="space-y-3">
              {snapshot.weeklyHistory.map((week) => (
                <div key={week.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black tracking-tight text-slate-900">{week.label}</p>
                      <p className="text-[11px] font-medium text-slate-500">
                        {week.lessons} aula(s) • {week.homework} homework • {week.flashcards} flashcard(s)
                      </p>
                    </div>
                    <Badge variant={week.score === personalBest.bestWeek.score ? 'warning' : 'secondary'} className="text-[9px] font-black uppercase tracking-widest">
                      {week.score} XP
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            <Trophy className="h-4 w-4 text-amber-500" /> Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {achievements.all.map((achievement) => {
              const Icon = iconForAchievement(achievement.icon)
              const ui = rarityClasses(achievement.rarity, achievement.unlocked)

              return (
                <div key={achievement.id} className={`rounded-3xl border px-5 py-5 transition-all ${ui.card}`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${ui.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={ui.badge} className="text-[8px] font-black uppercase tracking-widest">
                      {achievement.unlocked ? achievement.rarity : 'bloqueada'}
                    </Badge>
                  </div>
                  <div className="mt-5 space-y-2">
                    <p className="text-sm font-black tracking-tight text-slate-900">{achievement.title}</p>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-500">{achievement.description}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {achievement.progressLabel}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/aluno/flashcards" className="group rounded-[2rem] border border-indigo-100 bg-indigo-50 px-6 py-6 shadow-xl shadow-indigo-100/40 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Banco de palavras</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{snapshot.totalFlashcards}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">Expanda seu vocabulário e mantenha a memória ativa.</p>
        </Link>
        <Link href="/aluno/aulas" className="group rounded-[2rem] border border-blue-100 bg-blue-50 px-6 py-6 shadow-xl shadow-blue-100/40 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Homework</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{snapshot.pendingHomework}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">Veja tarefas pendentes e mantenha sua consistência.</p>
        </Link>
        <Link href="/aluno" className="group rounded-[2rem] border border-emerald-100 bg-emerald-50 px-6 py-6 shadow-xl shadow-emerald-100/40 transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Aulas concluídas</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{snapshot.completedLessons}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">Seu progresso real aparece quando você mantém o ritmo.</p>
        </Link>
      </div>
    </div>
  )
}
