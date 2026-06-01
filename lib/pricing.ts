import type { SupabaseClient } from '@supabase/supabase-js'

// Preços-padrão por tipo de contrato. Fonte da verdade passa a ser a tabela
// pricing_settings (singleton); os valores abaixo são apenas fallback/seed,
// idênticos aos antigos hardcoded em lib/utils/contract-logic.ts.
export type ContractPricing = {
  semestral1x: number // pacote semestral, 1x/semana (20 aulas)
  semestral2x: number // pacote semestral, 2x/semana (40 aulas)
  avulsa: number // valor por aula avulsa (ad-hoc)
}

export const DEFAULT_PRICING: ContractPricing = {
  semestral1x: 1920,
  semestral2x: 2880,
  avulsa: 90,
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Aplica um percentual (ex.: IPCA acumulado) a todos os preços-padrão.
export function applyPercentToPricing(prices: ContractPricing, percent: number): ContractPricing {
  const factor = 1 + (Number(percent) || 0) / 100
  return {
    semestral1x: round2(prices.semestral1x * factor),
    semestral2x: round2(prices.semestral2x * factor),
    avulsa: round2(prices.avulsa * factor),
  }
}

type PricingRow = {
  price_semestral_1x?: number | string | null
  price_semestral_2x?: number | string | null
  price_avulsa?: number | string | null
}

export function pricingFromRow(row: PricingRow | null | undefined): ContractPricing {
  const num = (value: unknown, fallback: number) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? round2(n) : fallback
  }
  if (!row) return DEFAULT_PRICING
  return {
    semestral1x: num(row.price_semestral_1x, DEFAULT_PRICING.semestral1x),
    semestral2x: num(row.price_semestral_2x, DEFAULT_PRICING.semestral2x),
    avulsa: num(row.price_avulsa, DEFAULT_PRICING.avulsa),
  }
}

export function pricingToColumns(prices: ContractPricing) {
  return {
    price_semestral_1x: prices.semestral1x,
    price_semestral_2x: prices.semestral2x,
    price_avulsa: prices.avulsa,
  }
}

// Lê o singleton de preços. Aceita o client do browser ou do server; em qualquer
// falha (tabela ausente, sem permissão) cai no DEFAULT_PRICING para não quebrar.
export async function getPricingSettings(supabase: SupabaseClient): Promise<ContractPricing> {
  try {
    const { data } = await supabase
      .from('pricing_settings')
      .select('price_semestral_1x, price_semestral_2x, price_avulsa')
      .eq('id', true)
      .maybeSingle()
    return pricingFromRow(data as PricingRow | null)
  } catch {
    return DEFAULT_PRICING
  }
}
