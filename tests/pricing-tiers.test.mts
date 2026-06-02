import assert from 'node:assert/strict'
import {
  DURATION_SPECS,
  isContractDuration,
  lessonsForDuration,
  installmentsForDuration,
} from '../lib/contract-durations.ts'
import {
  completedYearsSince,
  loyaltyDiscountPercent,
  applyLoyaltyDiscount,
  LOYALTY_MAX_PERCENT,
} from '../lib/loyalty.ts'
import { DEFAULT_PRICING, packagePriceFor, applyPercentToPricing } from '../lib/pricing.ts'
import { calculateContractSpecs } from '../lib/utils/contract-logic.ts'

// --- Durations ---
assert.equal(lessonsForDuration('trimestral', 1), 12)
assert.equal(lessonsForDuration('trimestral', 2), 24)
assert.equal(lessonsForDuration('anual', 2), 80)
assert.equal(installmentsForDuration('anual'), 12)
assert.equal(installmentsForDuration('mensal'), 1)
assert.equal(isContractDuration('trimestral'), true)
assert.equal(isContractDuration('ad-hoc'), false)
assert.equal(DURATION_SPECS.semestral.semesterLocked, true)
assert.equal(DURATION_SPECS.anual.semesterLocked, false)

// --- Loyalty (5%/year, cap 15%) ---
const base = new Date('2020-01-15T12:00:00')
assert.equal(completedYearsSince(base, new Date('2020-12-31T12:00:00')), 0)
assert.equal(completedYearsSince(base, new Date('2021-01-15T12:00:00')), 1)
assert.equal(completedYearsSince(base, new Date('2022-06-01T12:00:00')), 2)
assert.equal(loyaltyDiscountPercent(base, new Date('2020-06-01T12:00:00')), 0) // < 1 ano
assert.equal(loyaltyDiscountPercent(base, new Date('2021-02-01T12:00:00')), 5)
assert.equal(loyaltyDiscountPercent(base, new Date('2022-02-01T12:00:00')), 10)
assert.equal(loyaltyDiscountPercent(base, new Date('2025-02-01T12:00:00')), LOYALTY_MAX_PERCENT) // teto
assert.equal(loyaltyDiscountPercent(null, new Date()), 0)
assert.equal(applyLoyaltyDiscount(1000, 10), 900)
assert.equal(applyLoyaltyDiscount(1920, 15), 1632)

// --- packagePriceFor (defaults derived from semestral per-class) ---
// semestral 1x = 1920 (20 aulas → R$96/aula); trimestral 1x = 96 * 12 = 1152
assert.equal(packagePriceFor(DEFAULT_PRICING, 'semestral', 1), 1920)
assert.equal(packagePriceFor(DEFAULT_PRICING, 'trimestral', 1), 1152)
// semestral 2x = 2880 (40 aulas → R$72/aula); anual 2x = 72 * 80 = 5760
assert.equal(packagePriceFor(DEFAULT_PRICING, 'anual', 2), 5760)
// explicit tier wins over the derived default
const withTier = { ...DEFAULT_PRICING, tiers: { trimestral: { price1x: 999, price2x: 1800 } } }
assert.equal(packagePriceFor(withTier, 'trimestral', 1), 999)

// --- applyPercentToPricing scales base AND tiers ---
const bumped = applyPercentToPricing(withTier, 10)
assert.equal(bumped.semestral1x, 2112)
assert.equal(bumped.tiers?.trimestral?.price1x, 1098.9)

// --- calculateContractSpecs: fixed-count duration (trimestral 1x, Mondays) ---
const triSpec = calculateContractSpecs(new Date('2025-01-06T12:00:00'), 1, [1], 'trimestral')
assert.equal(triSpec.totalLessons, 12)
assert.equal(triSpec.regularLessons, 12)
assert.equal(triSpec.bonusLessons, 0)
assert.equal(triSpec.totalValue, 1152)
assert.equal(triSpec.remainingMonths, 3)
assert.equal(triSpec.isCrossSemester, false)

// --- Regression: semestral behaviour unchanged (cap 20 + full price) ---
const semSpec = calculateContractSpecs(new Date('2025-01-06T12:00:00'), 1, [1], 'semestral')
assert.equal(semSpec.regularLessons, 20)
assert.equal(semSpec.totalValue, 1920)

// --- Regression: ad-hoc unchanged (per-class * avulsa) ---
const adhoc = calculateContractSpecs(
  new Date('2025-01-06T12:00:00'),
  1,
  [1],
  'ad-hoc',
  new Date('2025-01-27T12:00:00')
)
assert.equal(adhoc.totalValue, adhoc.totalLessons * DEFAULT_PRICING.avulsa)

console.log('pricing-tiers tests passed')
