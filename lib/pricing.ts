import type { SupabaseClient } from '@supabase/supabase-js'
import { DURATION_SPECS, lessonsForDuration, type ContractDuration } from './contract-durations.ts'

export type DurationTierPrice = { price1x: number; price2x: number }

// Preços-padrão por tipo de contrato. Fonte da verdade é a tabela
// pricing_settings (singleton). `tiers` (opcional) guarda o preço-pacote por
// duração do "cardápio" (mensal→anual); quando ausente, o preço é derivado do
// preço-por-aula semestral, e os descontos de compromisso são configurados na UI.
export type ContractPricing = {
  semestral1x: number // pacote semestral, 1x/semana (20 aulas)
  semestral2x: number // pacote semestral, 2x/semana (40 aulas)
  avulsa: number // valor por aula avulsa (ad-hoc)
  tiers?: Partial<Record<ContractDuration, DurationTierPrice>>
}

export const DEFAULT_PRICING: ContractPricing = {
  semestral1x: 1920,
  semestral2x: 2880,
  avulsa: 90,
}

const round2 = (n: number) => Math.round(n * 100) / 100

function semestralPerClass(prices: ContractPricing, freq: 1 | 2): number {
  return freq === 1
    ? prices.semestral1x / DURATION_SPECS.semestral.lessons1x
    : prices.semestral2x / DURATION_SPECS.semestral.lessons2x
}

/**
 * Preço-pacote (total) de uma duração do cardápio numa dada frequência.
 * Prioridade: tier configurado → preço semestral existente → derivado do
 * preço-por-aula semestral × nº fixo de aulas do tier.
 */
export function packagePriceFor(prices: ContractPricing, duration: ContractDuration, freq: 1 | 2): number {
  const tier = prices.tiers?.[duration]
  if (tier) {
    return round2(freq === 1 ? tier.price1x : tier.price2x)
  }
  if (duration === 'semestral') {
    return round2(freq === 1 ? prices.semestral1x : prices.semestral2x)
  }
  return round2(semestralPerClass(prices, freq) * lessonsForDuration(duration, freq))
}

// Aplica um percentual (ex.: IPCA acumulado) a todos os preços-padrão (e tiers).
export function applyPercentToPricing(prices: ContractPricing, percent: number): ContractPricing {
  const factor = 1 + (Number(percent) || 0) / 100
  const next: ContractPricing = {
    semestral1x: round2(prices.semestral1x * factor),
    semestral2x: round2(prices.semestral2x * factor),
    avulsa: round2(prices.avulsa * factor),
  }
  if (prices.tiers) {
    const scaledTiers: Partial<Record<ContractDuration, DurationTierPrice>> = {}
    for (const [key, value] of Object.entries(prices.tiers)) {
      if (!value) continue
      scaledTiers[key as ContractDuration] = {
        price1x: round2(value.price1x * factor),
        price2x: round2(value.price2x * factor),
      }
    }
    next.tiers = scaledTiers
  }
  return next
}

type PricingRow = {
  price_semestral_1x?: number | string | null
  price_semestral_2x?: number | string | null
  price_avulsa?: number | string | null
  tier_pricing?: unknown
}

// Durações configuráveis no cardápio (semestral usa as colunas próprias; avulsa
// é por aula). Apenas estas vão em tier_pricing.
const MENU_TIERS: ContractDuration[] = ['mensal', 'bimestral', 'trimestral', 'anual']

function parseTierPricing(value: unknown): ContractPricing['tiers'] {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const tiers: Partial<Record<ContractDuration, DurationTierPrice>> = {}
  for (const tier of MENU_TIERS) {
    const entry = source[tier] as { price1x?: unknown; price2x?: unknown } | undefined
    const p1 = Number(entry?.price1x)
    const p2 = Number(entry?.price2x)
    if (Number.isFinite(p1) && p1 > 0 && Number.isFinite(p2) && p2 > 0) {
      tiers[tier] = { price1x: round2(p1), price2x: round2(p2) }
    }
  }
  return Object.keys(tiers).length > 0 ? tiers : undefined
}

export function pricingFromRow(row: PricingRow | null | undefined): ContractPricing {
  const num = (value: unknown, fallback: number) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? round2(n) : fallback
  }
  if (!row) return DEFAULT_PRICING
  const result: ContractPricing = {
    semestral1x: num(row.price_semestral_1x, DEFAULT_PRICING.semestral1x),
    semestral2x: num(row.price_semestral_2x, DEFAULT_PRICING.semestral2x),
    avulsa: num(row.price_avulsa, DEFAULT_PRICING.avulsa),
  }
  const tiers = parseTierPricing(row.tier_pricing)
  if (tiers) {
    result.tiers = tiers
  }
  return result
}

export function pricingToColumns(prices: ContractPricing) {
  return {
    price_semestral_1x: prices.semestral1x,
    price_semestral_2x: prices.semestral2x,
    price_avulsa: prices.avulsa,
    tier_pricing: prices.tiers ?? null,
  }
}

// Lê o singleton de preços. Aceita o client do browser ou do server; em qualquer
// falha (tabela ausente, sem permissão) cai no DEFAULT_PRICING para não quebrar.
export async function getPricingSettings(supabase: SupabaseClient): Promise<ContractPricing> {
  try {
    const { data } = await supabase
      .from('pricing_settings')
      .select('price_semestral_1x, price_semestral_2x, price_avulsa, tier_pricing')
      .eq('id', true)
      .maybeSingle()
    return pricingFromRow(data as PricingRow | null)
  } catch {
    return DEFAULT_PRICING
  }
}
