import { createClient } from '@/lib/supabase/server'
import { Award } from 'lucide-react'
import { completedYearsSince, loyaltyDiscountPercent, LOYALTY_MAX_PERCENT } from '@/lib/loyalty'

/**
 * Mostra ao aluno o "tempo de casa" e o desconto de fidelidade conquistado
 * (aplicado nas próximas renovações). Retenção/motivação.
 */
export default async function LoyaltyCard({ alunoId }: { alunoId: string }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contratos')
    .select('data_inicio')
    .eq('aluno_id', alunoId)
    .order('data_inicio', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data?.data_inicio) {
    return null
  }

  const now = new Date()
  const years = completedYearsSince(data.data_inicio, now)
  const percent = loyaltyDiscountPercent(data.data_inicio, now)
  const atCap = percent >= LOYALTY_MAX_PERCENT

  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm shadow-emerald-200/30">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
          <Award className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Fidelidade</p>
          {percent > 0 ? (
            <p className="text-sm font-bold leading-relaxed text-emerald-900/80">
              Você tem <span className="font-black">{years} ano{years === 1 ? '' : 's'} de casa</span> e já
              acumulou <span className="font-black">{percent}% de desconto fidelidade</span>
              {atCap ? ' (máximo)' : ''} para aplicar nas próximas renovações. Obrigado por seguir com a gente! 💚
            </p>
          ) : (
            <p className="text-sm font-bold leading-relaxed text-emerald-900/80">
              Complete <span className="font-black">1 ano de casa</span> e ganhe{' '}
              <span className="font-black">5% de desconto fidelidade</span> na sua próxima renovação (até 15%).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
