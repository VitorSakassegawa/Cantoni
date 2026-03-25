'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Languages, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { addFlashcard } from '@/lib/actions/flashcards'

export default function AddFlashcardForm() {
  const [loading, setLoading] = useState(false)
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [example, setExample] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await addFlashcard(word, translation, example)
      toast.success(`Palavra salva no banco! +${result.xpAwarded} XP na sua Jornada.`, {
        id: 'journey-xp',
      })
      setWord('')
      setTranslation('')
      setExample('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar flashcard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Palavra ou Expressão
        </label>
        <div className="relative">
          <Input
            name="word"
            required
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="Ex: Overwhelmed"
            className="h-12 rounded-xl border-none bg-slate-50 pl-10 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
          />
          <Languages className="absolute top-4 left-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Tradução
        </label>
        <div className="relative">
          <Input
            name="translation"
            required
            value={translation}
            onChange={(event) => setTranslation(event.target.value)}
            placeholder="Ex: Sobrecarregado"
            className="h-12 rounded-xl border-none bg-slate-50 pl-10 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
          />
          <Languages className="absolute top-4 left-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Exemplo de Uso (Opcional)
        </label>
        <Input
          name="example"
          value={example}
          onChange={(event) => setExample(event.target.value)}
          placeholder="Ex: I feel overwhelmed with work today."
          className="h-12 rounded-xl border-none bg-slate-50 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-4 flex h-14 w-full items-center gap-2 rounded-2xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-xl"
      >
        <Plus className="h-4 w-4" />
        {loading ? 'SALVANDO...' : 'SALVAR NO BANCO'}
      </Button>
    </form>
  )
}
