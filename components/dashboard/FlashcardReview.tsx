'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrainCircuit, CheckCircle2, RotateCcw, Volume2 } from 'lucide-react'
import { updateFlashcardReview } from '@/lib/actions/flashcards'
import { getAIVocabularyAudio } from '@/lib/actions/audio'
import { buildCloze, pickCardMode } from '@/lib/flashcards-cloze'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Flashcard {
  id: string
  word: string
  translation: string
  example?: string
}

// SM-2 quality scale (0–5). We expose four honest outcomes instead of a
// 1–5 row where the two lowest buttons behaved identically.
const REVIEW_OPTIONS = [
  { quality: 1, label: 'Errei', hint: 'Não lembrei', className: 'bg-rose-500 shadow-rose-500/20' },
  { quality: 3, label: 'Difícil', hint: 'Lembrei com esforço', className: 'bg-amber-500 shadow-amber-500/20' },
  { quality: 4, label: 'Bom', hint: 'Lembrei', className: 'bg-blue-500 shadow-blue-500/20' },
  { quality: 5, label: 'Fácil', hint: 'Dominado', className: 'bg-emerald-500 shadow-emerald-500/20' },
] as const

export default function FlashcardReview({ cards }: { cards: Flashcard[] }) {
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [xpFlash, setXpFlash] = useState<{ amount: number; key: number } | null>(null)
  // Synchronous guard: `disabled={loading}` only takes effect after a re-render,
  // so rapid double-clicks can fire two reviews before the buttons disable,
  // overshooting the card index. This blocks the second call immediately.
  const submittingRef = useRef(false)

  // `currentIdx >= cards.length` guards against any out-of-range state so a stray
  // index can never render an undefined card (which would crash the page).
  if (cards.length === 0 || completed || currentIdx >= cards.length) {
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
          onClick={() => router.refresh()}
          className="rounded-2xl bg-blue-600 px-8 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20"
        >
          Revisar de novo
        </Button>
      </div>
    )
  }

  const currentCard = cards[currentIdx]
  // Study-mode variety: rotate between showing the word, a "complete the
  // sentence" cloze (when the example contains the word), and an audio prompt.
  const cloze = buildCloze(currentCard.example, currentCard.word)
  const cardMode = pickCardMode(currentIdx, Boolean(cloze))

  const handleReview = async (quality: number) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    try {
      const result = await updateFlashcardReview(currentCard.id, quality)
      setXpFlash({ amount: result.xpAwarded, key: currentIdx + 1 })
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
      submittingRef.current = false
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
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
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
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Carta virada, mostrando tradução' : 'Clique ou pressione Enter para virar a carta'}
        className="relative h-80 w-full cursor-pointer perspective-1000 group rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        onClick={() => !isFlipped && setIsFlipped(true)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isFlipped) {
            e.preventDefault()
            setIsFlipped(true)
          }
        }}
      >
        {xpFlash ? (
          <div
            key={xpFlash.key}
            className="animate-xp pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-black text-white shadow-lg shadow-emerald-500/30"
          >
            +{xpFlash.amount} XP
          </div>
        ) : null}
        <div className={`relative h-full w-full preserve-3d transition-all duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
          <div className="absolute inset-0 backface-hidden">
            <Card className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-none p-10 text-center shadow-2xl glass-card">
              <Badge className="absolute top-6 left-6 border-none bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400">
                {cardMode === 'cloze' ? 'COMPLETE' : cardMode === 'audio' ? 'OUÇA' : 'FRENTE'}
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
              {cardMode === 'cloze' ? (
                <div className="space-y-3 px-2">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Complete a frase</p>
                  <p className="text-2xl font-bold leading-snug text-blue-900">{cloze}</p>
                </div>
              ) : cardMode === 'audio' ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void speak(currentCard.word)
                    }}
                    disabled={audioLoading}
                    aria-label="Ouvir a palavra"
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 transition-transform hover:scale-105 disabled:opacity-50"
                  >
                    {audioLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Volume2 className="h-8 w-8" />}
                  </button>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ouça e recorde a palavra</p>
                </div>
              ) : (
                <p className="text-4xl font-black leading-tight tracking-tighter text-blue-900">{currentCard.word}</p>
              )}
              <div className="mt-8 flex items-center justify-center gap-2 text-indigo-400 transition-colors group-hover:text-indigo-600 animate-bounce">
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">Clique para ver</span>
              </div>
            </Card>
          </div>

          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <Card className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-none bg-indigo-50 p-10 text-center shadow-2xl">
              <Badge className="absolute top-6 left-6 border-none bg-indigo-600 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20">
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
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-indigo-400">Tradução</p>
                  <p className="text-3xl font-black tracking-tighter text-indigo-900">{currentCard.translation}</p>
                </div>
                {currentCard.example && (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400 italic">Exemplo</p>
                    <p className="text-sm font-semibold italic text-slate-600">&quot;{currentCard.example}&quot;</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ${isFlipped ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        <p className="mb-6 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Qual foi o nível de dificuldade?
        </p>
        <div className="grid grid-cols-4 gap-3">
          {REVIEW_OPTIONS.map((opt) => (
            <button
              key={opt.quality}
              onClick={() => void handleReview(opt.quality)}
              disabled={loading}
              aria-label={`${opt.label} — ${opt.hint}`}
              title={opt.hint}
              className={`
                flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-white shadow-lg transition-all hover:scale-105
                ${opt.className}
                ${loading ? 'opacity-50 grayscale' : ''}
              `}
            >
              <span className="text-sm font-black uppercase tracking-wide">{opt.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes xpFloat {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.85); }
          20% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -16px) scale(1); }
        }
        .animate-xp { animation: xpFloat 1.4s ease-out forwards; }
      `}</style>
    </div>
  )
}
