'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Trophy, Target, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface SkillData {
  speaking: number
  listening: number
  reading: number
  writing: number
  mes_referencia: string
}

const CEFR_BENCHMARKS: Record<string, Record<string, number>> = {
  'A1': { speaking: 2, listening: 2, reading: 2, writing: 2 },
  'A2': { speaking: 4, listening: 4, reading: 4, writing: 4 },
  'B1': { speaking: 6, listening: 6, reading: 6, writing: 6 },
  'B2': { speaking: 8, listening: 8, reading: 8, writing: 8 },
  'C1': { speaking: 9, listening: 9, reading: 9, writing: 9 },
  'C2': { speaking: 10, listening: 10, reading: 10, writing: 10 },
}

export default function SkillsRadar({ data }: { data: SkillData[] }) {
  const [selectedCefr, setSelectedCefr] = useState<string | null>(null)

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8">
        <Trophy className="w-8 h-8 text-slate-300" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma avaliação realizada ainda</p>
      </div>
    )
  }

  const currentData = data[0]
  const previousData = data[1] || null

  const chartData = [
    { subject: 'Speaking', A: currentData.speaking, B: selectedCefr ? CEFR_BENCHMARKS[selectedCefr].speaking : 0 },
    { subject: 'Listening', A: currentData.listening, B: selectedCefr ? CEFR_BENCHMARKS[selectedCefr].listening : 0 },
    { subject: 'Reading', A: currentData.reading, B: selectedCefr ? CEFR_BENCHMARKS[selectedCefr].reading : 0 },
    { subject: 'Writing', A: currentData.writing, B: selectedCefr ? CEFR_BENCHMARKS[selectedCefr].writing : 0 },
  ]

  const calculateGrowth = () => {
    if (!previousData) return null
    const currentAvg = (currentData.speaking + currentData.listening + currentData.reading + currentData.writing) / 4
    const prevAvg = (previousData.speaking + previousData.listening + previousData.reading + previousData.writing) / 4
    if (prevAvg === 0) return 0
    return Math.round(((currentAvg - prevAvg) / prevAvg) * 100)
  }

  const growth = calculateGrowth()

  const checkBenchmarkReached = (cefr: string) => {
    const benchmark = CEFR_BENCHMARKS[cefr]
    return currentData.speaking >= benchmark.speaking &&
           currentData.listening >= benchmark.listening &&
           currentData.reading >= benchmark.reading &&
           currentData.writing >= benchmark.writing
  }

  return (
    <div className="space-y-8">
      {/* CEFR Selection */}
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.keys(CEFR_BENCHMARKS).map((level) => (
          <button
            key={level}
            onClick={() => setSelectedCefr(selectedCefr === level ? null : level)}
            className={`
              px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${selectedCefr === level 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
            `}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Radar Chart Section */}
      <div className="w-full h-80 relative">
        <div className="absolute top-0 right-0 flex flex-col items-end gap-2 z-10">
          {growth !== null && growth !== 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${growth >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${growth < 0 ? 'rotate-180' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{growth >= 0 ? '+' : ''}{growth}%</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            
            <Radar
              name="Suas Skills"
              dataKey="A"
              stroke="#2563eb"
              strokeWidth={3}
              fill="#3b82f6"
              fillOpacity={0.3}
            />

            {selectedCefr && (
              <Radar
                name={`Nível ${selectedCefr}`}
                dataKey="B"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="#8b5cf6"
                fillOpacity={0.05}
              />
            )}
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 800
              }} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Evolution Insights Section */}
      <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 space-y-4">
        <div className="flex items-center gap-2 text-blue-600">
          <Sparkles className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Caminho da Evolução</p>
        </div>
        
        <div className="space-y-4">
          {selectedCefr ? (
            <div className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                  {checkBenchmarkReached(selectedCefr) ? 'Marco Alcançado:' : 'Rumo ao Nível:'} {selectedCefr}
                </p>
                {checkBenchmarkReached(selectedCefr) && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-600 leading-relaxed">
                <p className="mb-2">
                  {checkBenchmarkReached(selectedCefr) 
                    ? `Parabéns! Suas competências atuais já consolidaram os requisitos técnicos do nível ${selectedCefr} (CEFR Global Scale). 🚀` 
                    : `Para atingir a proficiência plena do nível ${selectedCefr}, foque no desenvolvimento das seguintes competências:`}
                </p>
                <ul className="space-y-2 mt-2">
                  {[
                    { key: 'speaking', label: 'Produção Oral & Fluência' },
                    { key: 'listening', label: 'Compreensão Auditiva' },
                    { key: 'reading', label: 'Competência Pragmática (Leitura)' },
                    { key: 'writing', label: 'Expressão Escrita Estruturada' }
                  ].map((skill) => {
                    const reached = (currentData as any)[skill.key] >= (CEFR_BENCHMARKS[selectedCefr] as any)[skill.key]
                    return (
                      <li key={skill.key} className="flex items-center gap-2">
                        {reached ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={reached ? 'text-slate-900' : 'text-slate-500 font-medium'}>
                          {skill.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-[9px] text-slate-400 italic font-medium pt-3 border-t border-slate-50">
                  * Benchmarks baseados no Quadro Comum Europeu de Referência para Línguas.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-500 italic leading-relaxed text-center px-4 py-2">
              Selecione um nível CEFR acima para mapear sua jornada até o próximo objetivo.
            </p>
          )}

          {growth !== null && growth > 0 && (
            <div className="flex items-start gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-1">Ritmo de Crescimento</p>
                <p className="text-[11px] font-medium text-emerald-600/80 leading-relaxed">
                  Sua média subiu <span className="font-black">{growth}%</span> em relação à última avaliação. Continue nesse ritmo!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
