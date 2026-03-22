'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { generatePlacementQuestions, evaluatePlacementTest, getPlacementAudio } from '@/lib/actions/placement-test'
import { Sparkles, ArrowRight, CheckCircle2, Trophy, Loader2, Target, Layers, BrainCircuit, BookOpen, Video, Volume2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LevelTestPage() {
  const [step, setStep] = useState<'intro' | 'auto-eval' | 'quiz' | 'result'>('intro')
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('A1')
  const [module, setModule] = useState<'grammar' | 'reading' | 'listening'>('grammar')
  const [questions, setQuestions] = useState<any[]>([])
  const [currentModuleData, setCurrentModuleData] = useState<any>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [score, setScore] = useState(0)
  const [playCount, setPlayCount] = useState(0)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [isLastConfirmation, setIsLastConfirmation] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)

  useEffect(() => {
    // Stop any speaking when leaving or changing state
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [step, module])

  async function startQuiz(startLevel?: any) {
    const levelToUse = startLevel || currentLevel
    console.log('Starting quiz for level:', levelToUse, 'module:', module)
    setLoading(true)
    try {
      const data = await generatePlacementQuestions(levelToUse, module)
      console.log('AI Response:', data)
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setCurrentModuleData(data)
        setStep('quiz')
      } else {
        toast.error(data.error || 'Erro ao gerar questões. Tente novamente.')
      }
    } catch (err) {
      console.error('Start Quiz Error:', err)
      toast.error('Erro ao conectar com a IA.')
    } finally {
      setLoading(false)
    }
  }

  function handleAutoEval(level: any) {
    setCurrentLevel(level)
    startQuiz(level)
  }

  function handleAnswer(optionIndex: number) {
    if (!questions[currentQuestionIndex]) return
    
    const question = questions[currentQuestionIndex]
    const isCorrect = optionIndex === question.correctAnswer
    
    const newAnswers = [...answers, { questionId: question.id, selected: optionIndex, correct: isCorrect }]
    setAnswers(newAnswers)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      if (module === 'listening') {
        setIsLastConfirmation(true)
      } else {
        finishQuiz(newAnswers)
      }
    }
  }

  async function finishQuiz(finalAnswers: any[]) {
    // If it's the last module, evaluate. Otherwise, move to next module.
    if (module === 'listening') {
      setIsLastConfirmation(false)
      setShowProcessing(true)
      // Small artificial delay for "beauty" transition
      await new Promise(r => setTimeout(r, 2500))
      setFinishing(true)
      try {
        const data = await evaluatePlacementTest(finalAnswers, currentLevel) 
        console.log('Evaluation Result Success:', data)
        setResult(data)
        setScore(data.score)
        setStep('result')
      } catch (err) {
        console.error('Finish Quiz Evaluation Error:', err)
        toast.error('Erro ao salvar resultado.')
      } finally {
        setFinishing(false)
      }
    } else {
      // Logic for adaptive branching
      const moduleScore = finalAnswers.slice(-questions.length).filter(a => a.correct).length
      const ratio = moduleScore / questions.length
      
      let nextLevel = currentLevel
      if (ratio > 0.8 && currentLevel !== 'C1') {
        const levels: any[] = ['A1', 'A2', 'B1', 'B2', 'C1']
        nextLevel = levels[levels.indexOf(currentLevel) + 1]
      } else if (ratio < 0.4 && currentLevel !== 'A1') {
        const levels: any[] = ['A1', 'A2', 'B1', 'B2', 'C1']
        nextLevel = levels[levels.indexOf(currentLevel) - 1]
      }

      setCurrentLevel(nextLevel)
      const nextModule = module === 'grammar' ? 'reading' : 'listening'
      setModule(nextModule)
      setCurrentQuestionIndex(0)
      setPlayCount(0) // Reset audio play count for next module
      
      // Load next module
      setLoading(true)
      try {
        const data = await generatePlacementQuestions(nextLevel, nextModule)
        setQuestions(data.questions)
        setCurrentModuleData(data)
      } catch (err) {
        toast.error('Erro ao carregar próximo módulo.')
      } finally {
        setLoading(false)
      }
    }
  }

  const playAudio = async () => {
    if (playCount >= 2) {
      toast.error('Limite de 2 reproduções atingido.')
      return
    }
    if (!currentModuleData?.text) return

    setLoadingAudio(true)
    try {
      const audioBase64 = await getPlacementAudio(currentModuleData.text)
      
      if (!audioBase64) {
        toast.error('Falha ao gerar áudio com IA. Tente novamente.')
        return
      }

      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
      audio.onended = () => {
        setLoadingAudio(false)
        setPlayCount(prev => prev + 1)
      }
      audio.play()
    } catch (err) {
      toast.error('Erro ao processar áudio.')
      setLoadingAudio(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> IA & Data-Driven Assessment
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Mapeamento de <span className="text-indigo-600">Proficiência</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl mx-auto">
            Uma avaliação técnica rigorosa baseada nos padrões internacionais <strong>CEFR (Cambridge)</strong> para identificar seu ponto exato de partida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden p-10 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">O Racional Técnico</h3>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Ciência e Tecnologia atreladas ao seu aprendizado.</h2>
              </div>
              
              <div className="space-y-6">
                {[
                  { title: 'Padrão Cambridge (CEFR)', desc: 'Alinhamento total com o Quadro Europeu Comum de Referência para Línguas.' },
                  { title: 'Análise Adaptativa via IA', desc: 'Nossa inteligência artificial calibra a dificuldade para um diagnóstico ultra-preciso.' },
                  { title: 'Diagnóstico de Skills', desc: 'Identificação de gaps em gramática, vocabulário e estrutura sintática.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => setStep('auto-eval')}
              className="mt-12 w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3"
            >
              <ArrowRight className="w-5 h-5" />
              Escolher Nível Inicial
            </Button>
          </Card>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Precisão de 98%</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Modelagem estatística para evitar falsos positivos no seu nível de fluência.</p>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl space-y-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center shadow-inner">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Multicamadas</p>
                <p className="text-[11px] text-white/50 font-medium leading-relaxed">Avaliamos desde o Use of English até a complexidade de estruturas verbais.</p>
              </div>
            </div>

            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl space-y-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-inner">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">AI Powered</p>
                <p className="text-[11px] text-white/70 font-medium leading-relaxed">Hardware de última geração processando seu perfil pedagógico em tempo real.</p>
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
          <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Step 01: Percepção</h2>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Como você avalia seu inglês hoje?</h1>
          <p className="text-slate-500 font-medium text-sm">Isso ajudará a definir o ponto de partida do algoritmo.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[
            { level: 'A1', title: 'Iniciante (A1)', desc: 'Consigo entender frases básicas e me apresentar.' },
            { level: 'A2', title: 'Básico (A2)', desc: 'Entendo conversas simples sobre rotina e trabalho.' },
            { level: 'B1', title: 'Intermediário (B1)', desc: 'Consigo lidar com a maioria das situações em viagens.' },
            { level: 'B2', title: 'Independente (B2)', desc: 'Falo com fluidez e entendo textos complexos.' },
            { level: 'C1', title: 'Avançado (C1)', desc: 'Uso a língua de forma flexível e para fins profissionais.' }
          ].map((item) => (
            <button
              key={item.level}
              onClick={() => handleAutoEval(item.level)}
              disabled={loading}
              className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left group flex items-center justify-between gap-6"
            >
              <div className="space-y-1">
                <p className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.title}</p>
                <p className="text-xs text-slate-500 font-medium leading-tight">{item.desc}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
                {loading && currentLevel === item.level ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'quiz') {
    if (!questions.length || !questions[currentQuestionIndex]) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Preparando seu desafio...</p>
        </div>
      )
    }
    const question = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const moduleName = module === 'grammar' ? 'Grammar & Vocab' : module === 'reading' ? 'Reading Comprehension' : 'Listening Simulation'

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="text-indigo-600 font-bold">{moduleName} • Nível {currentLevel}</span>
            <span>{Math.round(progress)}% Completo</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {currentModuleData?.text && (
            <div className="lg:col-span-5 animate-in slide-in-from-left-4 duration-500">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                {module === 'reading' ? <BookOpen className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                {module === 'reading' ? 'Contexto de Leitura' : 'Áudio da Questão'}
              </h3>
              
              {module === 'reading' ? (
                <div className="p-8 rounded-[3.5rem] bg-indigo-50/50 border border-indigo-100/50 text-slate-700 font-medium leading-relaxed text-sm italic shadow-inner">
                  "{currentModuleData.text}"
                </div>
              ) : (
                <div className="p-12 rounded-[3.5rem] bg-slate-900 text-white flex flex-col items-center justify-center gap-6 text-center border-none shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-600/10 group-hover:bg-indigo-600/20 transition-colors" />
                  <div className="relative z-10 space-y-4">
                    <button
                      onClick={playAudio}
                      disabled={playCount >= 2 || loadingAudio}
                      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                        playCount >= 2 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-110 active:scale-95 shadow-2xl shadow-indigo-500/40'
                      }`}
                    >
                      {loadingAudio ? (
                        <RotateCcw className="w-8 h-8 animate-spin" />
                      ) : (
                        <Volume2 className="w-8 h-8" />
                      )}
                      {!loadingAudio && <span className="text-[10px] font-black mt-1 uppercase tracking-widest">{playCount}/2</span>}
                    </button>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        {loadingAudio ? 'PROCESSANDO VOZ IA...' : playCount >= 2 ? 'LIMITE ATINGIDO' : 'OUVIR ÁUDIO DA QUESTÃO'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {loadingAudio ? 'Gerando áudio natural...' : 'Toque para ouvir a simulação'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Card className={`${currentModuleData?.text ? 'lg:col-span-7' : 'lg:col-span-12'} glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden p-12 relative`}>
            {loading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Ajustando dificuldade...</h3>
                <p className="text-sm text-slate-500 font-medium">Nossa IA está calibrando seu próximo desafio com base no seu desempenho.</p>
              </div>
            )}
            
            <div className="space-y-12">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {question.question}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {question.options.map((option: string, i: number) => (
                  <button
                    key={i}
                    disabled={loading}
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
      </div>
    )
  }

  if (showProcessing && !result) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-indigo-600/20 rounded-[2.5rem] animate-ping" />
          <div className="relative bg-indigo-600 w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <BrainCircuit className="w-14 h-14 text-white animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            <Loader2 className="w-3 h-3 animate-spin" /> Analisando Performance
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Processando seu Mapeamento...</h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
            Nossa IA está cruzando seus dados com os parâmetros <strong>Cambridge</strong> para definir seu diagnóstico final.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['Syntax', 'Lexis', 'Listening'].map((skill, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2 duration-700">
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
          <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em]">Módulos Concluídos</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Excelente trabalho!</h1>
          <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
            Você completou todas as etapas do mapeamento. Clique abaixo para gerar seu diagnóstico técnico.
          </p>
        </div>

        <div className="pt-8">
          <Button 
            onClick={() => finishQuiz(answers)}
            className="w-full h-20 rounded-[2.5rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-center gap-4">
              <span>FINALIZAR MAPEAMENTO AGORA</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 italic">
            O resultado será sincronizado com seu perfil acadêmico instantaneamente.
          </p>
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
          <h1 className="text-4xl font-black text-slate-900 leading-tight">Mapeamento Concluído!</h1>
          <p className="text-slate-500 text-lg font-medium">Processamos {answers.length} pontos de dados com critérios <strong>Cambridge/CEFR</strong>.</p>
        </div>

        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-indigo-50 border relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Nível Oficial Sugerido</p>
              <div className="text-8xl font-black text-indigo-600 tracking-tighter">{result?.suggestedLevel || '...'}</div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">{result?.suggestedNivel || 'Processando...'}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4">
              <div className="flex items-center gap-3 text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Validação Técnica</p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Diagnóstico concluído para o nível <strong>{result?.suggestedLevel}</strong>. 
                Sua jornada de aprendizado foi calibrada com sucesso.
              </p>
            </div>

            <div className="pt-8 border-t border-slate-100 mt-8">
              <Link href="/aluno" className="flex w-full h-16 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 no-underline">
                <span className="translate-y-[1px]">ACESSAR MEU DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
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

