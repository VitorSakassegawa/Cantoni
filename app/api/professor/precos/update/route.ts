import { NextRequest, NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPricingSettings, pricingToColumns, type ContractPricing } from '@/lib/pricing'

function authStatus(message: string) {
  const m = message.toLowerCase()
  return m.includes('acesso') || m.includes('autenticad') ? 403 : 500
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireProfessor()
    const body = await request.json()
    const supabase = await createClient()

    const before = await getPricingSettings(supabase)

    const parse = (value: unknown, fallback: number) => {
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : fallback
    }
    const next: ContractPricing = {
      semestral1x: parse(body.semestral1x, before.semestral1x),
      semestral2x: parse(body.semestral2x, before.semestral2x),
      avulsa: parse(body.avulsa, before.avulsa),
    }

    const { error } = await supabase
      .from('pricing_settings')
      .update({ ...pricingToColumns(next), updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', true)

    if (error) {
      console.error('pricing update error:', error)
      return NextResponse.json({ error: 'Falha ao salvar os preços.' }, { status: 500 })
    }

    const changed =
      before.semestral1x !== next.semestral1x ||
      before.semestral2x !== next.semestral2x ||
      before.avulsa !== next.avulsa

    if (changed) {
      await supabase.from('pricing_adjustments').insert({
        kind: 'manual',
        percent: null,
        prices_before: before,
        prices_after: next,
        note: typeof body.note === 'string' ? body.note.trim() || null : null,
        created_by: user.id,
      })
    }

    return NextResponse.json({ pricing: next })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return NextResponse.json({ error: message }, { status: authStatus(message) })
  }
}
