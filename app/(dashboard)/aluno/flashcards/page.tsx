import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlashcardReview from '@/components/dashboard/FlashcardReview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BrainCircuit, Languages, Plus, Info } from 'lucide-react'
import { addFlashcard } from '@/lib/actions/flashcards'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4">
            <BrainCircuit className="w-3 h-3" />
            Spaced Repetition System
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">
            Seu Banco de <span className="text-indigo-600 italic">Palavras</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-lg">
            Aprenda e memorize novos vocabulários de forma eficiente usando nossa inteligência de repetição espaçada.
          </p>
        </div>
        
        <div className="flex bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="px-6 py-3 border-r border-slate-100 text-center">
            <p className="text-2xl font-black text-slate-900 leading-tight">{totalCards?.length || 0}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
          </div>
          <div className="px-6 py-3 text-center">
            <p className="text-2xl font-black text-indigo-600 leading-tight">{dueCards?.length || 0}</p>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Para Revisar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left: Review Area */}
        <div className="lg:col-span-2 space-y-8">
          {dueCards && dueCards.length > 0 ? (
            <FlashcardReview cards={dueCards} />
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-8 bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center">
                <BrainCircuit className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Nenhuma palavra para revisar agora!</h3>
                <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
                  Seu cérebro já fixou os conteúdos atuais. Volte mais tarde ou adicione novas palavras da sua última aula.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 text-left max-w-md">
                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="font-black text-indigo-600 uppercase text-[9px] block mb-1 tracking-widest">Dica de Estudo</span>
                  Adicione palavras que você teve dificuldade na aula para que o sistema te lembre de revisá-las nos momentos ideais da curva de esquecimento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Add New Word */}
        <div className="space-y-6">
          <Card className="glass-card border-none shadow-2xl shadow-indigo-600/5 overflow-hidden">
            <CardHeader className="pb-4 bg-indigo-600 text-white">
              <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-[0.2em]">
                <Plus className="w-4 h-4" /> Adicionar Nova Palavra
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <form action={async (formData) => {
                'use server'
                const word = formData.get('word') as string
                const translation = formData.get('translation') as string
                const example = formData.get('example') as string
                await addFlashcard(word, translation, example)
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavra ou Expressão</label>
                  <div className="relative">
                    <Input name="word" required placeholder="Ex: Overwhelmed" className="h-12 bg-slate-50 border-none rounded-xl font-bold placeholder:text-slate-300 pl-10 focus:ring-2 focus:ring-indigo-500/20" />
                    <Languages className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tradução</label>
                  <div className="relative">
                    <Input name="translation" required placeholder="Ex: Sobrecarregado" className="h-12 bg-slate-50 border-none rounded-xl font-bold placeholder:text-slate-300 pl-10 focus:ring-2 focus:ring-indigo-500/20" />
                    <Languages className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exemplo de Uso (Opcional)</label>
                  <Input name="example" placeholder="Ex: I feel overwhelmed with work today." className="h-12 bg-slate-50 border-none rounded-xl font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20" />
                </div>

                <Button type="submit" className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-xl transition-all mt-4">
                  SALVAR NO BANCO
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="p-8 lms-gradient rounded-[2rem] text-white space-y-4 shadow-xl shadow-blue-900/10">
            <h4 className="font-black text-sm uppercase tracking-tight">Como funciona o SRS?</h4>
            <p className="text-xs text-blue-100/70 leading-relaxed">
              O sistema utiliza o algoritmo <span className="text-white font-bold">Spaced Repetition</span> para calcular quando você está prestes a esquecer uma palavra. 
              <br /><br />
              Nas revisões, as palavras que você marcar como mais difíceis aparecerão com mais frequência, enquanto as fáceis levarão semanas para reaparecer.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  )
}
