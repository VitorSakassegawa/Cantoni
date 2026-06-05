import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlashcardReview from '@/components/dashboard/FlashcardReview'
import AddFlashcardForm from '@/components/dashboard/AddFlashcardForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrainCircuit, Plus, Info, AlertTriangle } from 'lucide-react'
import { LEECH_THRESHOLD } from '@/lib/flashcards-srs'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const DAILY_REVIEW_CAP = 30
  const now = new Date().toISOString()

  // Most-overdue first, capped per session so a student returning after a long
  // break isn't buried under every overdue card at once.
  const { data: dueCards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('aluno_id', user.id)
    .lte('next_review', now)
    .order('next_review', { ascending: true })
    .limit(DAILY_REVIEW_CAP)

  const { count: dueCount } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('aluno_id', user.id)
    .lte('next_review', now)

  const { count: totalCount } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('aluno_id', user.id)

  // Leeches: cards that keep being failed. Tolerant of the `lapses` column not
  // existing yet (pre-migration) — on error we just show no leech section.
  const { data: leechRows } = await supabase
    .from('flashcards')
    .select('id, word, translation, lapses')
    .eq('aluno_id', user.id)
    .gte('lapses', LEECH_THRESHOLD)
    .order('lapses', { ascending: false })
    .limit(10)
  const leechCards = (leechRows ?? []) as Array<{ id: string; word: string; translation: string; lapses: number }>

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-600">
            <BrainCircuit className="h-3 w-3" />
            Spaced Repetition System
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 md:text-5xl">
            Seu Banco de <span className="italic text-indigo-600">Palavras</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm font-medium text-slate-500">
            Aprenda e memorize novos vocabulários de forma eficiente usando nossa inteligência
            de repetição espaçada.
          </p>
        </div>

        <div className="flex rounded-3xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/50">
          <div className="border-r border-slate-100 px-6 py-3 text-center">
            <p className="text-2xl font-black leading-tight text-slate-900">{totalCount || 0}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total</p>
          </div>
          <div className="px-6 py-3 text-center">
            <p className="text-2xl font-black leading-tight text-indigo-600">{dueCount || 0}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Para revisar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {dueCards && dueCards.length > 0 ? (
            <div className="space-y-4">
              {(dueCount || 0) > dueCards.length && (
                <p className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-xs font-semibold text-indigo-700">
                  Mostrando {dueCards.length} de {dueCount} palavras pendentes nesta sessão. Conclua estas e volte para revisar o restante.
                </p>
              )}
              <FlashcardReview cards={dueCards} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-8 rounded-[3rem] border border-slate-100 bg-white p-16 text-center shadow-2xl shadow-slate-200/20">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-200">
                <BrainCircuit className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter text-slate-900">
                  Nenhuma palavra para revisar agora!
                </h3>
                <p className="mx-auto max-w-sm text-sm font-medium text-slate-500">
                  Seu cérebro já fixou os conteúdos atuais. Volte mais tarde ou adicione novas
                  palavras da sua última aula.
                </p>
              </div>
              <div className="flex max-w-md items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-left">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
                <p className="text-xs leading-relaxed text-slate-500">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-widest text-indigo-600">
                    Dica de Estudo
                  </span>
                  Adicione palavras que você teve dificuldade na aula para que o sistema te lembre
                  de revisá-las nos momentos ideais da curva de esquecimento.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="glass-card overflow-hidden border-none shadow-2xl shadow-indigo-600/5">
            <CardHeader className="bg-indigo-600 pb-4 text-white">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                <Plus className="h-4 w-4" /> Adicionar nova palavra
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <AddFlashcardForm />
            </CardContent>
          </Card>

          {leechCards.length > 0 && (
            <div className="space-y-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-xs font-black uppercase tracking-widest">Palavras que estão te desafiando</h4>
              </div>
              <p className="text-xs leading-relaxed text-amber-700/80">
                Você errou estas palavras várias vezes. Vale revisá-las com calma ou comentar com seu professor na próxima aula.
              </p>
              <ul className="space-y-2">
                {leechCards.map((card) => (
                  <li key={card.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2">
                    <span className="text-sm font-bold text-slate-800">{card.word}</span>
                    <span className="text-xs text-slate-500">{card.translation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 rounded-[2rem] text-white shadow-xl shadow-blue-900/10 lms-gradient p-8">
            <h4 className="text-sm font-black uppercase tracking-tight">Como funciona o SRS?</h4>
            <p className="text-xs leading-relaxed text-blue-100/70">
              O sistema utiliza o algoritmo <span className="font-bold text-white">Spaced Repetition</span> para
              calcular quando você está prestes a esquecer uma palavra.
              <br />
              <br />
              Nas revisões, as palavras que você marcar como mais difíceis aparecerão com mais
              frequência, enquanto as fáceis levarão semanas para reaparecer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
