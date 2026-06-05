'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Target, AlertTriangle, TrendingDown, BookMarked } from 'lucide-react'

type Props = {
  weakestSkill: { label: string; value: number } | null
  leechWords: string[]
  recentErrors: string
  recentErrorsLabel?: string
}

// Teacher-only "what to focus on next lesson" — aggregates the weakest skill,
// the vocabulary the student keeps failing, and the recent error notes the AI
// flagged. All from data the page already has.
export default function NextLessonPrep({ weakestSkill, leechWords, recentErrors, recentErrorsLabel }: Props) {
  const hasContent = Boolean(weakestSkill) || leechWords.length > 0 || Boolean(recentErrors)
  if (!hasContent) return null

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
        <Target className="h-3.5 w-3.5" /> Foco da próxima aula
      </p>

      <div className="mt-3 space-y-3">
        {weakestSkill && (
          <div className="flex items-start gap-2">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs text-slate-700">
              Habilidade mais fraca (estimativa IA): <strong>{weakestSkill.label}</strong> ({weakestSkill.value}/10) — vale priorizar.
            </p>
          </div>
        )}

        {leechWords.length > 0 && (
          <div className="flex items-start gap-2">
            <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-xs text-slate-700">
              Vocabulário a reforçar: {leechWords.map((w) => <strong key={w} className="mr-1">{w}</strong>)}
            </p>
          </div>
        )}

        {recentErrors && (
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <AlertTriangle className="h-3 w-3" /> Erros recentes
              {recentErrorsLabel ? <span className="font-semibold normal-case text-slate-400">· {recentErrorsLabel}</span> : null}
            </p>
            <div className="prose prose-sm mt-1 max-w-none text-xs text-slate-600 [&_h3]:text-[11px] [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-slate-500 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:list-disc [&_strong]:text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{recentErrors}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
