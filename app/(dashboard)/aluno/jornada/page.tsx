import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Flame, Sparkles, Target, Trophy } from 'lucide-react'
import { buildJourneyAchievements, buildJourneyMissions, type JourneyAchievement } from '@/lib/gamification'

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

  const [{ count: dueFlashcardsCount }, { count: totalFlashcardsCount }, { count: pendingHomeworkCount }, { count: completedHomeworkCount }, { count: completedLessonsCount }] =
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
    ])

  const snapshot = {
    streakCount: profile?.streak_count || 0,
    bestStreak: profile?.best_streak || 0,
    lastActivityDate: profile?.last_activity_date,
    flashcardsDue: dueFlashcardsCount || 0,
    totalFlashcards: totalFlashcardsCount || 0,
    pendingHomework: pendingHomeworkCount || 0,
    completedHomework: completedHomeworkCount || 0,
    completedLessons: completedLessonsCount || 0,
  }

  const { missions, streakSummary, streakRules } = buildJourneyMissions(snapshot)
  const achievements = buildJourneyAchievements(snapshot)

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      <div className="relative overflow-hidden rounded-[2.5rem] p-10 bg-[#1e3a8a] text-white shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              Jornada do Aluno
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Seu streak merece um espaço próprio
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-blue-100/80">
              Aqui você acompanha sua consistência, suas metas do dia e as conquistas já desbloqueadas com aulas, flashcards e homework.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:min-w-[320px]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Streak atual</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{snapshot.streakCount} dias</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Melhor recorde</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{streakSummary.bestStreak} dias</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Target className="h-4 w-4 text-blue-500" /> Missões do dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {missions.map((mission) => (
              <div
                key={mission.id}
                className={`rounded-3xl border px-5 py-5 ${
                  mission.status === 'done'
                    ? 'border-emerald-100 bg-emerald-50/80'
                    : 'border-amber-100 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              </div>
            ))}
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
              return (
                <div
                  key={achievement.id}
                  className={`rounded-3xl border px-5 py-5 transition-all ${
                    achievement.unlocked
                      ? 'border-amber-200 bg-amber-50/80 shadow-lg shadow-amber-200/30'
                      : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        achievement.unlocked ? 'bg-amber-500 text-white' : 'bg-white text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={achievement.unlocked ? 'success' : 'secondary'} className="text-[8px] font-black uppercase tracking-widest">
                      {achievement.unlocked ? 'Desbloqueada' : 'Em progresso'}
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
