import assert from 'node:assert/strict'

import { applyPercentToPricing, pricingFromRow, DEFAULT_PRICING } from '../lib/pricing.ts'

// applyPercentToPricing: aplica o % e arredonda a 2 casas
assert.deepEqual(
  applyPercentToPricing({ semestral1x: 1000, semestral2x: 2000, avulsa: 100 }, 10),
  { semestral1x: 1100, semestral2x: 2200, avulsa: 110 }
)

// arredondamento (IPCA 4,62%)
const r = applyPercentToPricing({ semestral1x: 1920, semestral2x: 2880, avulsa: 90 }, 4.62)
assert.equal(r.semestral1x, 2008.7) // 1920 * 1.0462 = 2008.704
assert.equal(r.avulsa, 94.16) // 90 * 1.0462 = 94.158

// percentual inválido não altera os preços
assert.deepEqual(
  applyPercentToPricing({ semestral1x: 100, semestral2x: 200, avulsa: 50 }, Number.NaN),
  { semestral1x: 100, semestral2x: 200, avulsa: 50 }
)

// pricingFromRow: linha ausente -> default; valor <= 0 ou inválido -> default por campo
assert.deepEqual(pricingFromRow(null), DEFAULT_PRICING)
assert.deepEqual(
  pricingFromRow({ price_semestral_1x: '2500', price_semestral_2x: 0, price_avulsa: -5 }),
  { semestral1x: 2500, semestral2x: DEFAULT_PRICING.semestral2x, avulsa: DEFAULT_PRICING.avulsa }
)

console.log('pricing tests passed')
