import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlashcardReview from '@/components/dashboard/FlashcardReview'
import AddFlashcardForm from '@/components/dashboard/AddFlashcardForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrainCircuit, Plus, Info } from 'lucide-react'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const { data: dueCards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('aluno_id', user.id)
    .lte('next_review', now)
    .order('created_at')

  const { data: totalCards } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact' })
    .eq('aluno_id', user.id)

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
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
            <p className="text-2xl font-black leading-tight text-slate-900">{totalCards?.length || 0}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
          </div>
          <div className="px-6 py-3 text-center">
            <p className="text-2xl font-black leading-tight text-indigo-600">{dueCards?.length || 0}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Para revisar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {dueCards && dueCards.length > 0 ? (
            <FlashcardReview cards={dueCards} />
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
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-indigo-600">
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
