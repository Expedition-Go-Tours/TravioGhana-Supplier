import { describe, it, expect } from 'vitest'
import { buildPayload } from '../useAutoSave'

describe('buildPayload nested -> flat mapping', () => {
  it('maps nested categorization to flat keys', () => {
    const state = {
      title: 'Test',
      categorization: { category: 'transport', difficulty: 'hard', duration: { value: 4, unit: 'hours' } },
      productContent: { writingLanguage: 'Bislama' },
      // Pricing lives in the builder's flat buffers (top level), which
      // buildSchedulesAndPricing projects into the nested payload.
      pricingCategories: [{ name: 'Adult', price: 100 }],
      photos: [],
      options: [],
      fullDescription: 'desc',
    }

    const payload = buildPayload(state)
    expect(payload.category).toBe('transport')
    expect(payload.difficulty).toBe('hard')
    expect(payload.duration).toBe(4)
    expect(payload.durationUnit).toBe('hours')
    expect(payload.language).toBe('Bislama')
    expect(payload.schedulesAndPricing.travelerDetails.pricingCategories).toEqual([
      { name: 'Adult', price: 100, tiers: [] },
    ])
  })
})