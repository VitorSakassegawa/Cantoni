import { Sparkles } from 'lucide-react'
import type { SkillScores } from '@/lib/lesson-skills'

const SKILLS: Array<{ key: keyof SkillScores; label: string }> = [
  { key: 'speaking', label: 'Speaking' },
  { key: 'listening', label: 'Listening' },
  { key: 'reading', label: 'Reading' },
  { key: 'writing', label: 'Writing' },
]

// Read-only panel: rolling average of the AI's per-lesson skill estimates.
// Complements (does not replace) the professor's monthly manual evaluation.
export default function AiSkillEstimate({
  scores,
  lessonCount,
}: {
  scores: SkillScores
  lessonCount: number
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600">
          <Sparkles className="h-3.5 w-3.5" /> Estimativa da IA por habilidade
        </p>
        <span className="text-[11px] font-semibold text-indigo-400">
          média de {lessonCount} aula{lessonCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {SKILLS.map(({ key, label }) => {
          const value = scores[key]
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{label}</span>
                <span className="text-slate-400">{value === null ? 'sem dados' : `${value}/10`}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: value === null ? '0%' : `${(value / 10) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-indigo-700/70">
        Estimado automaticamente a partir das transcrições — complementa, não substitui, sua avaliação mensal.
      </p>
    </div>
  )
}
