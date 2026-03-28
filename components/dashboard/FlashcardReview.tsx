'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrainCircuit, CheckCircle2, RotateCcw, Volume2 } from 'lucide-react'
import { updateFlashcardReview } from '@/lib/actions/flashcards'
import { getAIVocabularyAudio } from '@/lib/actions/audio'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Flashcard {
  id: string
  word: string
  translation: string
  example?: string
}

export default function FlashcardReview({ cards }: { cards: Flashcard[] }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  if (cards.length === 0 || completed) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 rounded-[3rem] border-2 border-dashed border-blue-200 p-12 text-center lms-gradient-soft">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-xl shadow-green-500/10">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tighter text-blue-900">Tudo revisado!</h3>
          <p className="text-sm font-medium text-slate-500">
            Você concluiu todo o seu banco de palavras para hoje.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20"
        >
          RECARREGAR
        </Button>
      </div>
    )
  }

  const currentCard = cards[currentIdx]

  const handleReview = async (quality: number) => {
    setLoading(true)
    try {
      const result = await updateFlashcardReview(currentCard.id, quality)
      toast.success(`Revisão salva. +${result.xpAwarded} XP na sua Jornada.`, {
        id: 'journey-xp',
        duration: 1800,
      })

      if (currentIdx < cards.length - 1) {
        setIsFlipped(false)
        setCurrentIdx((prev) => prev + 1)
      } else {
        setCompleted(true)
      }
    } catch {
      toast.error('Erro ao salvar revisão')
    } finally {
      setLoading(false)
    }
  }

  const speak = async (text: string) => {
    setAudioLoading(true)
    try {
      const res = await getAIVocabularyAudio(text)
      if (res.success && res.audio) {
        const audio = new Audio(`data:audio/wav;base64,${res.audio}`)
        await audio.play()
      } else {
        throw new Error('AI TTS failed')
      }
    } catch (err) {
      console.warn('Falling back to browser TTS:', err)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    } finally {
      setAudioLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Sessão de estudo: {currentIdx + 1} de {cards.length}
          </span>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      <div
        className="relative h-80 w-full cursor-pointer perspective-1000 group"
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className={`relative h-full w-full preserve-3d transition-all duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
          <div className="absolute inset-0 backface-hidden">
            <Card className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-none p-10 text-center shadow-2xl glass-card">
              <Badge className="absolute top-6 left-6 border-none bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                FRENTE
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void speak(currentCard.word)
                }}
                disabled={audioLoading}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
              >
                {audioLoading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <p className="text-4xl font-black leading-tight tracking-tighter text-blue-900">{currentCard.word}</p>
              <div className="mt-8 flex items-center justify-center gap-2 text-indigo-400 transition-colors group-hover:text-indigo-600 animate-bounce">
                <RotateCcw className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Clique para ver</span>
              </div>
            </Card>
          </div>

          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <Card className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-none bg-indigo-50 p-10 text-center shadow-2xl">
              <Badge className="absolute top-6 left-6 border-none bg-indigo-600 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20">
                VERSO
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void speak(currentCard.word)
                }}
                disabled={audioLoading}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-400 shadow-sm shadow-indigo-200/20 transition-all hover:bg-white hover:text-indigo-600 disabled:opacity-50"
              >
                {audioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div className="space-y-6">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-400">Tradução</p>
                  <p className="text-3xl font-black tracking-tighter text-indigo-900">{currentCard.translation}</p>
                </div>
                {currentCard.example && (
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Exemplo</p>
                    <p className="text-sm font-semibold italic text-slate-600">&quot;{currentCard.example}&quot;</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ${isFlipped ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        <p className="mb-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          Qual foi o nível de dificuldade?
        </p>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              onClick={() => void handleReview(q)}
              disabled={loading}
              className={`
                flex h-14 items-center justify-center rounded-2xl text-lg font-black transition-all
                ${q === 5 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-110' :
                  q === 4 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:scale-110' :
                  q === 3 ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-110' :
                  q === 2 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-110' :
                  'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-110'}
                ${loading ? 'opacity-50 grayscale' : ''}
              `}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-between px-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>ERREI COMPLETAMENTE</span>
          <span>DOMINADO</span>
        </div>
      </div>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}
