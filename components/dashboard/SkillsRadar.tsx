'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

interface SkillData {
  speaking: number
  listening: number
  reading: number
  writing: number
  mes_referencia: string
}

export default function SkillsRadar({ data }: { data: SkillData[] }) {
  const chartData = data.length > 0 ? [
    { subject: 'Speaking', A: data[0].speaking, fullMark: 10 },
    { subject: 'Listening', A: data[0].listening, fullMark: 10 },
    { subject: 'Reading', A: data[0].reading, fullMark: 10 },
    { subject: 'Writing', A: data[0].writing, fullMark: 10 },
  ] : []

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8">
        <Trophy className="w-8 h-8 text-slate-300" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma avaliação realizada ainda</p>
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#2563eb"
            strokeWidth={3}
            fill="#3b82f6"
            fillOpacity={0.3}
          />
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
  )
}
