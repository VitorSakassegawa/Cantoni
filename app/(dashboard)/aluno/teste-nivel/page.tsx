'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { evaluatePlacementEligibility, type PlacementEligibilityResult } from '@/lib/placement-eligibility'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Video,
  Volume2,
} from 'lucide-react'
import {
  evaluatePlacementTest,
  generatePlacementQuestions,
  getPlacementAudio,
} from '@/lib/actions/placement-test'
import type {
  PlacementAnswer,
  PlacementEvaluationResult,
  PlacementLevel,
  PlacementModule,
  PlacementQuestionSet,
} from '@/lib/dashboard-types'

type PlacementStep = 'intro' | 'auto-eval' | 'quiz' | 'result'

const LEVEL_OPTIONS: Array<{ level: PlacementLevel; title: string; description: string }> = [
  { level: 'A1', title: 'Iniciante (A1)', description: 'Entendo frases simples e consigo me apresentar.' },
  { level: 'A2', title: 'Básico (A2)', description: 'Consigo lidar com conversas curtas sobre rotina e trabalho.' },
  { level: 'B1', title: 'Pré-intermediário (B1)', description: 'Já consigo me virar em viagens e situações do dia a dia.' },
  { level: 'B2', title: 'Intermediário alto (B2)', description: 'Falo com mais fluidez e entendo textos mais densos.' },
  { level: 'C1', title: 'Avançado (C1)', description: 'Uso o idioma com segurança em contextos acadêmicos e profissionais.' },
]

const MODULE_LABELS: Record<PlacementModule, string> = {
  grammar: 'Grammar & Vocabulary',
  reading: 'Reading Comprehension',
  listening: 'Listening Simulation',
}

const MODULE_SEQUENCE: PlacementModule[] = ['grammar', 'reading', 'listening']
const LEVEL_SEQUENCE: PlacementLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

function getReadableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export default function LevelTestPage() {
  const [step, setStep] = useState<PlacementStep>('intro')
  const [currentLevel, setCurrentLevel] = useState<PlacementLevel>('A1')
  const [module, setModule] = useState<PlacementModule>('grammar')
  const [questions, setQuestions] = useState<PlacementQuestionSet['questions']>([])
  const [currentModuleData, setCurrentModuleData] = useState<PlacementQuestionSet | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])
  const [loading, setLoading] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [result, setResult] = useState<PlacementEvaluationResult | null>(null)
  const [playCount, setPlayCount] = useState(0)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [isLastConfirmation, setIsLastConfirmation] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [cachedAudio, setCachedAudio] = useState<string | null>(null)
  const [eligibility, setEligibility] = useState<PlacementEligibilityResult | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(true)

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function loadEligibility() {
      setEligibilityLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setEligibility({
          allowed: false,
          reason: 'blocked',
          title: 'Faça login novamente',
          description: 'Sua sessão precisa estar ativa para iniciar o nivelamento.',
        })
        setEligibilityLoading(false)
        return
      }

      const [{ data: profile }, { data: contracts }, { data: latestResult }] = await Promise.all([
        supabase.from('profiles').select('placement_test_completed').eq('id', user.id).single(),
        supabase.from('contratos').select('status, data_inicio, data_fim').eq('aluno_id', user.id).neq('status', 'cancelado'),
        supabase
          .from('placement_results')
          .select('created_at')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      setEligibility(
        evaluatePlacementEligibility({
          placementTestCompleted: profile?.placement_test_completed,
          latestResultAt: latestResult?.created_at || null,
          contracts: (contracts || []) as Array<{ status?: string | null; data_inicio?: string | null; data_fim?: string | null }>,
        })
      )
      setEligibilityLoading(false)
    }

    void loadEligibility()
  }, [])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0
  const modulePosition = MODULE_SEQUENCE.indexOf(module) + 1

  const introHighlights = useMemo(
    () => [
      {
        title: 'Padrão Cambridge (CEFR)',
        description: 'O teste usa a mesma lógica de progressão de proficiência adotada internacionalmente.',
      },
      {
        title: 'Leitura adaptativa de nível',
        description: 'A dificuldade se ajusta ao seu desempenho para evitar diagnósticos superficiais.',
      },
      {
        title: 'Foco pedagógico prático',
        description: 'O resultado ajuda a calibrar plano, material e ritmo das primeiras aulas.',
      },
    ],
    []
  )

  async function loadModule(nextLevel: PlacementLevel, nextModule: PlacementModule) {
    setLoading(true)
    try {
      const data = (await generatePlacementQuestions(nextLevel, nextModule)) as PlacementQuestionSet
      if (!data.questions?.length) {
        toast.error(data.error || 'Erro ao gerar questões. Tente novamente.')
        return false
      }

      setCurrentLevel(nextLevel)
      setModule(nextModule)
      setQuestions(data.questions)
      setCurrentModuleData(data)
      setCurrentQuestionIndex(0)
      setStep('quiz')
      return true
    } catch (error) {
      toast.error(getReadableError(error, 'Erro ao conectar com a IA.'))
      return false
    } finally {
      setLoading(false)
    }
  }

  async function startQuiz(startLevel?: PlacementLevel) {
    if (eligibilityLoading) return
    if (!eligibility?.allowed) {
      toast.error(eligibility?.description || 'Novo teste ainda não liberado.')
      return
    }
    await loadModule(startLevel || currentLevel, 'grammar')
  }

  function handleAutoEval(level: PlacementLevel) {
    void startQuiz(level)
  }

  function handleAnswer(optionIndex: number) {
    if (!currentQuestion) return

    const newAnswers: PlacementAnswer[] = [
      ...answers,
      {
        ...currentQuestion,
        selected: optionIndex,
        correct: optionIndex === currentQuestion.correctAnswer,
      },
    ]
    setAnswers(newAnswers)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((value) => value + 1)
      return
    }

    if (module === 'listening') {
      setIsLastConfirmation(true)
      return
    }

    void finishQuiz(newAnswers)
  }

  async function finishQuiz(finalAnswers: PlacementAnswer[]) {
    if (module === 'listening') {
      setIsLastConfirmation(false)
      setShowProcessing(true)
      await new Promise((resolve) => setTimeout(resolve, 1800))
      setFinishing(true)
      try {
        const evaluation = (await evaluatePlacementTest(
          finalAnswers.map((answer) => ({ correct: answer.correct })),
          currentLevel
        )) as PlacementEvaluationResult
        setResult(evaluation)
        setStep('result')
      } catch (error) {
        toast.error(getReadableError(error, 'Erro ao salvar resultado.'))
      } finally {
        setFinishing(false)
      }
      return
    }

    const latestModuleAnswers = finalAnswers.slice(-questions.length)
    const moduleScore = latestModuleAnswers.filter((answer) => answer.correct).length
    const ratio = moduleScore / questions.length

    let nextLevel = currentLevel
    const levelIndex = LEVEL_SEQUENCE.indexOf(currentLevel)

    if (ratio > 0.8 && levelIndex < LEVEL_SEQUENCE.length - 1) {
      nextLevel = LEVEL_SEQUENCE[levelIndex + 1]
    } else if (ratio < 0.4 && levelIndex > 0) {
      nextLevel = LEVEL_SEQUENCE[levelIndex - 1]
    }

    const nextModule = module === 'grammar' ? 'reading' : 'listening'
    setPlayCount(0)
    setCachedAudio(null)
    setAudioCurrentTime(0)
    setAudioDuration(0)

    const loaded = await loadModule(nextLevel, nextModule)
    if (!loaded) {
      toast.error('Erro ao carregar o próximo módulo.')
    }
  }

  async function playAudio() {
    if (playCount >= 2) {
      toast.error('Limite de 2 reproduções atingido.')
      return
    }

    if (!currentModuleData?.text) return

    setLoadingAudio(true)
    try {
      let audioBase64 = cachedAudio
      if (!audioBase64) {
        audioBase64 = await getPlacementAudio(currentModuleData.text)
        if (audioBase64) {
          setCachedAudio(audioBase64)
        }
      }

      if (!audioBase64) {
        toast.error('Falha ao gerar o áudio com IA. Tente novamente.')
        return
      }

      setLoadingAudio(false)
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
      audio.onloadedmetadata = () => setAudioDuration(audio.duration)
      audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime)
      audio.onended = () => {
        setPlayCount((value) => value + 1)
        setAudioCurrentTime(0)
      }
      void audio.play()
    } catch (error) {
      toast.error(getReadableError(error, 'Erro ao processar o áudio.'))
    } finally {
      setLoadingAudio(false)
    }
  }

  function restartFlow() {
    setStep('intro')
    setCurrentLevel('A1')
    setModule('grammar')
    setQuestions([])
    setCurrentModuleData(null)
    setCurrentQuestionIndex(0)
    setAnswers([])
    setLoading(false)
    setFinishing(false)
    setResult(null)
    setPlayCount(0)
    setLoadingAudio(false)
    setIsLastConfirmation(false)
    setShowProcessing(false)
    setAudioDuration(0)
    setAudioCurrentTime(0)
    setCachedAudio(null)
  }

  if (showProcessing && !result) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-indigo-600/20 rounded-[2.5rem] animate-ping" />
          <div className="relative bg-indigo-600 w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <BrainCircuit className="w-14 h-14 text-white animate-pulse" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            <Loader2 className="w-3 h-3 animate-spin" /> Analisando seu desempenho
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Processando seu mapeamento</h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
            Estamos cruzando suas respostas com os parâmetros Cambridge para chegar ao diagnóstico final.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['Grammar', 'Reading', 'Listening'].map((skill) => (
            <div
              key={skill}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2 duration-700"
            >
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: '100%' }} />
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-2">{skill}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLastConfirmation) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-20 h-20 rounded-[2rem] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em]">Etapas concluídas</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Excelente trabalho</h1>
          <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
            Você completou todos os módulos. Agora vamos gerar seu diagnóstico técnico final.
          </p>
        </div>

        <div className="pt-8 space-y-4">
          <Button
            onClick={() => void finishQuiz(answers)}
            className="w-full h-20 rounded-[2.5rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-center gap-4">
              <span>Gerar meu resultado</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400"
            onClick={() => setIsLastConfirmation(false)}
          >
            Voltar ao último módulo
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> IA + Cambridge CEFR
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Mapeamento de <span className="text-indigo-600">proficiência</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl mx-auto">
            Uma avaliação técnica e adaptativa para identificar seu ponto exato de partida em inglês.
          </p>
        </div>

        <div className={`rounded-[2rem] border px-6 py-5 ${eligibility?.allowed ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liberação do teste</p>
          <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
            {eligibilityLoading ? 'Verificando regras do portal...' : eligibility?.title}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            {eligibilityLoading
              ? 'Estamos validando se este é um momento adequado para um novo nivelamento.'
              : eligibility?.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden p-10 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Como funciona</h3>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  Um fluxo rápido, adaptativo e mais útil para o seu plano.
                </h2>
              </div>

              <div className="space-y-6">
                {introHighlights.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep('auto-eval')}
              disabled={eligibilityLoading || !eligibility?.allowed}
              className="mt-12 w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
            >
              <ArrowRight className="w-5 h-5" />
              {eligibilityLoading ? 'Validando acesso' : eligibility?.allowed ? 'Escolher nível inicial' : 'Aguardando liberação'}
            </Button>
          </Card>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Diagnóstico mais preciso</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  A dificuldade muda com base nas suas respostas para evitar um resultado superficial.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl space-y-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center shadow-inner">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">3 módulos</p>
                <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                  Gramática, leitura e listening para medir compreensão, estrutura e repertório.
                </p>
              </div>
            </div>

            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl space-y-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-inner">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Resultado aplicável</p>
                <p className="text-[11px] text-white/70 font-medium leading-relaxed">
                  O diagnóstico alimenta o material, o ritmo de aula e os próximos objetivos pedagógicos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'auto-eval') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <div className="space-y-4">
          <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Etapa 1 de 2</h2>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Como você avalia seu inglês hoje?
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Isso nos ajuda a definir um ponto de partida mais coerente para o teste.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {LEVEL_OPTIONS.map((item) => (
            <button
              key={item.level}
              onClick={() => handleAutoEval(item.level)}
              disabled={loading}
              className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left group flex items-center justify-between gap-6"
            >
              <div className="space-y-1">
                <p className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-tight">{item.description}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          className="text-[10px] font-black uppercase tracking-widest text-slate-400"
          onClick={() => setStep('intro')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  if (step === 'quiz') {
    if (!currentQuestion) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Preparando seu próximo desafio...</p>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">
                Módulo {modulePosition} de 3
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-500">
                {MODULE_LABELS[module]}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-500">Nível {currentLevel}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Questão {currentQuestionIndex + 1} de {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {currentModuleData?.text ? (
            <div className="lg:col-span-5 animate-in slide-in-from-left-4 duration-500">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                {module === 'reading' ? <BookOpen className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                {module === 'reading' ? 'Contexto de leitura' : 'Áudio da questão'}
              </h3>

              {module === 'reading' ? (
                <div className="p-8 rounded-[3.5rem] bg-indigo-50/50 border border-indigo-100/50 text-slate-700 font-medium leading-relaxed text-sm italic shadow-inner">
                  &quot;{currentModuleData.text}&quot;
                </div>
              ) : (
                <div className="p-12 rounded-[3.5rem] bg-slate-900 text-white flex flex-col items-center justify-center gap-6 text-center border-none shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-600/10 group-hover:bg-indigo-600/20 transition-colors" />
                  <div className="relative z-10 space-y-5">
                    <button
                      onClick={() => void playAudio()}
                      disabled={playCount >= 2 || loadingAudio || audioCurrentTime > 0}
                      className={`mx-auto w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 transition-all ${
                        playCount >= 2
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/40'
                      }`}
                    >
                      {loadingAudio ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : audioCurrentTime > 0 ? (
                        <>
                          <Volume2 className="w-8 h-8 animate-pulse" />
                          <span className="text-xs mt-1 font-mono font-bold">
                            {Math.floor(audioCurrentTime)}/{Math.floor(audioDuration || 0)}s
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-10 h-10" />
                          <span className="text-xs mt-1 font-black uppercase tracking-widest">
                            {playCount}/2
                          </span>
                        </>
                      )}
                    </button>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        {loadingAudio
                          ? 'Gerando áudio com IA...'
                          : audioCurrentTime > 0
                            ? 'Reproduzindo áudio...'
                            : playCount >= 2
                              ? 'Limite atingido'
                              : 'Ouvir áudio da questão'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium max-w-[220px] mx-auto leading-relaxed">
                        {loadingAudio
                          ? 'A geração do áudio pode levar alguns segundos.'
                          : audioCurrentTime > 0
                            ? 'Escute com atenção antes de responder.'
                            : 'Você pode reproduzir este áudio até duas vezes.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <Card
            className={`${currentModuleData?.text ? 'lg:col-span-7' : 'lg:col-span-12'} glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden p-12 relative`}
          >
            {loading ? (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Ajustando dificuldade...</h3>
                <p className="text-sm text-slate-500 font-medium">
                  A próxima etapa está sendo calibrada com base no seu desempenho.
                </p>
              </div>
            ) : null}

            <div className="space-y-12">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{currentQuestion.question}</h2>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    disabled={loading}
                    onClick={() => handleAnswer(index)}
                    className="group relative flex items-center p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center text-xs font-black mr-6">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-base font-bold text-slate-600 group-hover:text-slate-900">
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
          {finishing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Trophy className="w-10 h-10" />}
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 leading-tight">Mapeamento concluído</h1>
          <p className="text-slate-500 text-lg font-medium">
            Processamos {answers.length} respostas com base nos critérios Cambridge/CEFR.
          </p>
        </div>

        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-indigo-50 border relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Nível sugerido
              </p>
              <div className="text-8xl font-black text-indigo-600 tracking-tighter">
                {result?.suggestedLevel || '...'}
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">
                {result?.suggestedNivel || 'Processando'}
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4">
              <div className="flex items-center gap-3 text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Validação técnica</p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed whitespace-pre-wrap">
                {result?.insights ||
                  `Diagnóstico concluído para o nível ${result?.suggestedLevel}. Sua jornada foi calibrada com sucesso.`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-8 border-t border-slate-100 mt-8">
              <Link
                href="/aluno"
                className="flex w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 no-underline"
              >
                <span className="translate-y-[1px]">Acessar meu dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Button
                variant="ghost"
                className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400"
                onClick={restartFlow}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refazer nivelamento
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full -ml-24 -mb-24 opacity-50" />
        </div>
      </div>
    )
  }

  return null
}
