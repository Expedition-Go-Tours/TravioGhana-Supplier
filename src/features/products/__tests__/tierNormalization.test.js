import { describe, it, expect } from 'vitest'
import { normalizeCategoryTiers, normalizePricingCategories, rederiveTiersFrom } from '../tierUtils'

describe('normalizeCategoryTiers', () => {
  const mp = 10

  it('returns [] for empty/undefined input', () => {
    expect(normalizeCategoryTiers([], mp)).toEqual([])
    expect(normalizeCategoryTiers(undefined, mp)).toEqual([])
    expect(normalizeCategoryTiers(null, mp)).toEqual([])
  })

  it('fixes the reported divergent overlap (1-2 / 2-2 / 3-10) -> 1-1 / 2-2 / 3-10', () => {
    const input = [
      { from: 1, to: 2, pricePerPerson: 100 },
      { from: 2, to: 2, pricePerPerson: 90 },
      { from: 3, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-2', '3-10'])
    // prices preserved by position
    expect(out.map((t) => t.pricePerPerson)).toEqual([100, 90, 80])
  })

  it('canonicalises an overlapping two-tier (1-2 / 2-10) -> 1-1 / 2-10', () => {
    const input = [
      { from: 1, to: 2, pricePerPerson: 100 },
      { from: 2, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-10'])
  })

  it('preserves a contiguous, editable Tier 1 band (1-2 / 3-10) when there is no overlap', () => {
    const input = [
      { from: 1, to: 2, pricePerPerson: 100 },
      { from: 3, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-2', '3-10'])
    expect(out[0]).not.toBe(input[0]) // shallow-copied, not mutated
  })

  it('clamps a garbage upper bound (3-100) to maxParticipants', () => {
    const input = [
      { from: 1, to: 1, pricePerPerson: 100 },
      { from: 2, to: 100, pricePerPerson: 90 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out[1].to).toBe(10)
  })

  it('fixes a `from` that does not start at 1 (e.g. 5-6 / 7-10)', () => {
    const input = [
      { from: 5, to: 6, pricePerPerson: 100 },
      { from: 7, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-10'])
  })

  it('preserves a contiguous, intentionally-widened Tier 1 (1-3 / 4-10)', () => {
    const input = [
      { from: 1, to: 3, pricePerPerson: 100 },
      { from: 4, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-3', '4-10'])
    expect(out).not.toBe(input) // shallow-copied, not mutated
  })

  it('preserves ids and pricePerPerson through canonicalisation', () => {
    const input = [
      { id: 'a', from: 1, to: 2, pricePerPerson: 100 },
      { id: 'b', from: 2, to: 2, pricePerPerson: 90 },
      { id: 'c', from: 3, to: 10, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input, mp)
    expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(out.map((t) => t.pricePerPerson)).toEqual([100, 90, 80])
  })

  it('defaults maxParticipants to 10 and canonicalises divergent data when missing', () => {
    const input = [
      { from: 1, to: 2, pricePerPerson: 100 },
      { from: 2, to: 2, pricePerPerson: 90 },
      { from: 3, to: 100, pricePerPerson: 80 },
    ]
    const out = normalizeCategoryTiers(input) // no maxParticipants -> defaults to 10
    expect(out.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-2', '3-10'])
  })

  it('handles a single tier by setting its `to` to maxParticipants', () => {
    const input = [{ from: 1, to: 1, pricePerPerson: 100 }]
    const out = normalizeCategoryTiers(input, mp)
    expect(out).toEqual([{ from: 1, to: 10, pricePerPerson: 100 }])
  })
})

describe('normalizePricingCategories', () => {
  it('normalises every category independently without touching metadata', () => {
    const cats = [
      { name: 'Adult', minAge: 18, maxAge: 99, tiers: [{ from: 1, to: 2, pricePerPerson: 100 }, { from: 2, to: 2, pricePerPerson: 90 }, { from: 3, to: 10, pricePerPerson: 80 }] },
      { name: 'Child', minAge: 0, maxAge: 17, tiers: [{ from: 1, to: 1, pricePerPerson: 60 }, { from: 2, to: 10, pricePerPerson: 50 }] },
    ]
    const out = normalizePricingCategories(cats, 10)
    expect(out[0].tiers.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-2', '3-10'])
    expect(out[1].tiers.map((t) => `${t.from}-${t.to}`)).toEqual(['1-1', '2-10'])
    expect(out[0].name).toBe('Adult')
    expect(out[1].minAge).toBe(0)
    expect(out[0]).not.toBe(cats[0])
  })

  it('returns [] for non-array input', () => {
    expect(normalizePricingCategories(null, 10)).toEqual([])
    expect(normalizePricingCategories(undefined, 10)).toEqual([])
  })
})

describe('rederiveTiersFrom', () => {
  const base = (ranges, ids) =>
    ranges.map(([from, to], i) => ({ id: ids ? ids[i] : `t${i}`, from, to, pricePerPerson: 100 - i }))
  const bands = (tiers) => tiers.map((t) => `${t.from}-${t.to}`)

  it('widens the base tier (1-1 -> 1-3) and re-derives the whole chain (max=10)', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 0, { from: 1, to: 3 }, 10)
    expect(bands(out)).toEqual(['1-3', '4-4', '5-5', '6-10'])
  })

  it('re-derives downstream when a middle tier is widened (1-1 / 2-2 -> 2-5) (max=10)', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 1, { to: 5 }, 10)
    expect(bands(out)).toEqual(['1-1', '2-5', '6-6', '7-10'])
  })

  it('extends a middle tier to near max (2-9) and drops the zero-width tail', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 1, { to: 9 }, 10)
    expect(bands(out)).toEqual(['1-1', '2-9', '10-10'])
  })

  it('collapses everything below a base tier widened to max', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 0, { to: 10 }, 10)
    expect(bands(out)).toEqual(['1-10'])
  })

  it('pins a shrunk last tier back to max (4-10 -> 4-10) — no top gap', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 3, { to: 7 }, 10)
    expect(bands(out)).toEqual(['1-1', '2-2', '3-3', '4-10'])
  })

  it('pins a widened last tier to max (2-10 stays 2-10)', () => {
    const tiers = base([[1, 1], [2, 10]])
    const out = rederiveTiersFrom(tiers, 1, { to: 6 }, 10)
    expect(bands(out)).toEqual(['1-1', '2-10'])
  })

  it('clamps an overshoot to maxParticipants silently (idx0 to=17, max=10)', () => {
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]])
    const out = rederiveTiersFrom(tiers, 0, { to: 17 }, 10)
    expect(bands(out)).toEqual(['1-10'])
  })

  it('handles the reported edge with max=100 (edit idx0 to=17)', () => {
    const tiers = base([[1, 1], [2, 2], [3, 15], [16, 10]])
    const out = rederiveTiersFrom(tiers, 0, { to: 17 }, 100)
    expect(bands(out)).toEqual(['1-17', '18-18', '19-19', '20-100'])
  })

  it('treats a cleared `to` (null) as reaching maxParticipants', () => {
    const tiers = base([[1, 1], [2, 2], [3, 10]])
    const out = rederiveTiersFrom(tiers, 0, { to: null }, 10)
    expect(bands(out)).toEqual(['1-10'])
  })

  it('preserves pricePerPerson and id by slot through re-derivation', () => {
    const ids = ['a', 'b', 'c', 'd']
    const tiers = base([[1, 1], [2, 2], [3, 3], [4, 10]], ids)
    const out = rederiveTiersFrom(tiers, 0, { to: 3 }, 10)
    expect(out.map((t) => t.id)).toEqual(ids)
    expect(out.map((t) => t.pricePerPerson)).toEqual([100, 99, 98, 97])
  })

  it('does not mutate the input tiers', () => {
    const tiers = base([[1, 1], [2, 2], [3, 10]])
    const before = JSON.stringify(tiers)
    rederiveTiersFrom(tiers, 0, { to: 4 }, 10)
    expect(JSON.stringify(tiers)).toBe(before)
  })

  it('returns [] for empty tiers', () => {
    expect(rederiveTiersFrom([], 0, { to: 5 }, 10)).toEqual([])
  })
})
