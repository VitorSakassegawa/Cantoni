import { NextRequest, NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { applyPercentToPricing, getPricingSettings, pricingToColumns } from '@/lib/pricing'

function authStatus(message: string) {
  const m = message.toLowerCase()
  return m.includes('acesso') || m.includes('autenticad') ? 403 : 500
}

// Reajuste anual (ex.: IPCA acumulado): aplica um percentual aos preços-padrão.
// Vale apenas para contratos NOVOS criados a partir daqui (não toca contratos existentes).
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireProfessor()
    const body = await request.json()

    const percent = Number(body.percent)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return NextResponse.json(
        { error: 'Informe um percentual de reajuste válido (entre 0 e 100).' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const before = await getPricingSettings(supabase)
    const after = applyPercentToPricing(before, percent)

    const { error } = await supabase
      .from('pricing_settings')
      .update({ ...pricingToColumns(after), updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', true)

    if (error) {
      console.error('pricing reajuste error:', error)
      return NextResponse.json({ error: 'Falha ao aplicar o reajuste.' }, { status: 500 })
    }

    await supabase.from('pricing_adjustments').insert({
      kind: 'ipca',
      percent,
      prices_before: before,
      prices_after: after,
      note: typeof body.note === 'string' ? body.note.trim() || null : null,
      created_by: user.id,
    })

    return NextResponse.json({ pricing: after })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return NextResponse.json({ error: message }, { status: authStatus(message) })
  }
}
