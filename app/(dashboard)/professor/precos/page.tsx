import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPricingSettings } from '@/lib/pricing'
import PricingSettingsClient from '@/components/dashboard/PricingSettingsClient'

export const dynamic = 'force-dynamic'

export default async function PrecosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const pricing = await getPricingSettings(supabase)
  const { data: adjustments } = await supabase
    .from('pricing_adjustments')
    .select('id, kind, percent, prices_before, prices_after, note, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return <PricingSettingsClient initialPricing={pricing} adjustments={adjustments || []} />
}
