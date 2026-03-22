'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { generatePlacementQuestions } from '@/lib/actions/placement-test'
import { Sparkles, ArrowRight, CheckCircle2, Trophy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LevelTestPage() {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('A1')
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)

  async function startQuiz() {
    setLoading(true)
    try {
      const data = await generatePlacementQuestions(currentLevel)
      if (data.questions?.length) {
        setQuestions(data.questions)
        setStep('quiz')
      } else {
        toast.error('Erro ao gerar questões. Tente novamente.')
      }
    } catch (err) {
      toast.error('Erro ao conectar com a IA.')
    } finally {
      setLoading(false)
    }
  }

  function handleAnswer(optionIndex: number) {
    const question = questions[currentQuestionIndex]
    const isCorrect = optionIndex === question.correctAnswer
    
    const newAnswers = [...answers, { questionId: question.id, selected: optionIndex, correct: isCorrect }]
    setAnswers(newAnswers)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Calculate final score
      const finalScore = newAnswers.filter(a => a.correct).length
      setScore(finalScore)
      setStep('result')
    }
  }

  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100/50 mb-4">
            <Sparkles className="w-3.5 h-3.5" /> IA Placement Test
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Qual seu nível de inglês?</h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Nosso teste inteligente usa IA para avaliar suas habilidades e sugerir o melhor ponto de partida para sua jornada.
          </p>
        </div>

        <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
          <CardContent className="p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: BookOpen, title: '25 Questões', desc: 'Gramática e Vocábulo' },
                { icon: Clock, title: '15 Minutos', desc: 'Tempo estimado' },
                { icon: Trophy, title: 'Certificado', desc: 'Nível CEFR Sugerido' }
              ].map((item, i) => (
                <div key={i} className="text-center space-y-2 p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
                  <div className="w-10 h-10 rounded-2xl bg-white text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{item.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{item.desc}</p>
                </div>
              ))}
            </div>

            <Button 
              onClick={startQuiz}
              disabled={loading}
              className="w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
              {loading ? 'Preparando Questões...' : 'Iniciar Teste de Nivelamento'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'quiz') {
    const question = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Questão {currentQuestionIndex + 1} de {questions.length}</span>
            <span>{Math.round(progress)}% Completo</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
        </div>

        <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden p-12">
          <div className="space-y-12">
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {question.question}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {question.options.map((option: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="group relative flex items-center p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center text-xs font-black mr-6">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-base font-bold text-slate-600 group-hover:text-slate-900">{option}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-12">
      <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30 animate-bounce">
        <Trophy className="w-10 h-10" />
      </div>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-slate-900">Parabéns! Teste concluído.</h1>
        <p className="text-slate-500 text-lg font-medium">Sua pontuação final foi de {score}/{questions.length}.</p>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-indigo-50 border relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Nível Sugerido</p>
          <div className="text-8xl font-black text-indigo-600 tracking-tighter">B1</div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Intermediate English</p>
          
          <div className="pt-8 border-t border-slate-100 mt-8">
            <Button className="w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20">
              Ir para o Dashboard
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full -ml-24 -mb-24 opacity-50" />
      </div>
    </div>
  )
}

function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )
}

function BookOpen(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  )
}
