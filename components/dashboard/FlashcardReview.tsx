'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrainCircuit, CheckCircle2, ChevronRight, Volume2, RotateCcw } from 'lucide-react'
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
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 lms-gradient-soft rounded-[3rem] border-2 border-dashed border-blue-200">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-blue-900 tracking-tighter">Tudo revisado! 🚀</h3>
          <p className="text-sm text-slate-500 font-medium">Você concluiu todo o seu banco de palavras para hoje.</p>
        </div>
        <Button 
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-8 shadow-lg shadow-blue-500/20"
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
      await updateFlashcardReview(currentCard.id, quality)
      if (currentIdx < cards.length - 1) {
        setIsFlipped(false)
        setCurrentIdx(prev => prev + 1)
      } else {
        setCompleted(true)
      }
    } catch (e) {
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
    <div className="max-w-xl mx-auto space-y-8">
      {/* Session Progress */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-indigo-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Sessão de Estudo: {currentIdx + 1} de {cards.length}
          </span>
        </div>
        <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* The Card */}
      <div 
        className={`relative h-80 w-full perspective-1000 cursor-pointer group`}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute inset-0 backface-hidden">
            <Card className="w-full h-full glass-card border-none flex flex-col items-center justify-center p-10 text-center shadow-2xl relative overflow-hidden">
              <Badge className="absolute top-6 left-6 bg-slate-100 text-slate-400 border-none font-black text-[9px] uppercase tracking-widest">FRENTE</Badge>
              <button 
                onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                disabled={audioLoading}
                className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center border border-slate-100 disabled:opacity-50"
              >
                {audioLoading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <p className="text-4xl font-black text-blue-900 tracking-tighter leading-tight">{currentCard.word}</p>
              <div className="mt-8 flex items-center justify-center gap-2 text-indigo-400 group-hover:text-indigo-600 transition-colors animate-bounce">
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Clique para ver</span>
              </div>
            </Card>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <Card className="w-full h-full bg-indigo-50 border-none flex flex-col items-center justify-center p-10 text-center shadow-2xl relative overflow-hidden">
              <Badge className="absolute top-6 left-6 bg-indigo-600 text-white border-none font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-600/20">VERSO</Badge>
              <button 
                onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                disabled={audioLoading}
                className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white text-indigo-400 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center border border-indigo-100 shadow-sm shadow-indigo-200/20 disabled:opacity-50"
              >
                {audioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tradução</p>
                  <p className="text-3xl font-black text-indigo-900 tracking-tighter">{currentCard.translation}</p>
                </div>
                {currentCard.example && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Exemplo</p>
                    <p className="text-sm font-semibold text-slate-600 italic">"{currentCard.example}"</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className={`transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Qual foi o nível de dificuldade?</p>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              onClick={() => handleReview(q)}
              disabled={loading}
              className={`
                h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all
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
        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest mt-4 px-2">
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
