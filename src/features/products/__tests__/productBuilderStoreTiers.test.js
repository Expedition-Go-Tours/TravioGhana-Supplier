import { beforeEach, describe, expect, it } from 'vitest'
import { useProductBuilderStore } from '../productBuilderStore'

const state = () => useProductBuilderStore.getState()
const bands = (catIndex) =>
  (state().pricingCategories[catIndex].tiers || []).map((t) => `${t.from}-${t.to}`)
const allBands = () =>
  state().pricingCategories.map((c) => (c.tiers || []).map((t) => `${t.from}-${t.to}`))

const category = (name, tiers = []) => ({
  name,
  minAge: name === 'Adult' ? 18 : 0,
  maxAge: name === 'Adult' ? 99 : 17,
  price: name === 'Adult' ? 100 : 50,
  tiers,
})

/** Two categories and a 10-person cap, the state the reported flow starts from. */
function seed() {
  state().setField('maxParticipants', 10)
  state().setField('pricingCategories', [category('Adult'), category('Child')])
}

describe('pricing tiers', () => {
  beforeEach(seed)

  it('gives every category the same structure when a tier is added', () => {
    state().addCategoryTier(0)
    expect(allBands()).toEqual([['1-1', '2-10'], ['1-1', '2-10']])
  })

  it('continues from a shortened band instead of resetting it', () => {
    // The reported flow: one tier 1-10, shortened to 1-4, then "Add tier".
    state().setField('pricingCategories', [
      category('Adult', [{ id: 'a', from: 1, to: 10, pricePerPerson: 100 }]),
    ])

    state().updateCategoryTier(0, 0, { to: 4 })
    expect(bands(0)).toEqual(['1-4'])

    state().addCategoryTier(0)
    expect(bands(0)).toEqual(['1-4', '5-10'])

    state().addCategoryTier(0)
    expect(bands(0)).toEqual(['1-4', '5-5', '6-10'])
  })

  it('keeps a shortened chain identical across categories', () => {
    state().addCategoryTier(0) // both [1-1, 2-10]
    state().updateCategoryTier(0, 0, { to: 4 })
    expect(allBands()).toEqual([['1-4', '5-10'], ['1-4', '5-10']])

    state().addCategoryTier(0)
    expect(allBands()).toEqual([['1-4', '5-5', '6-10'], ['1-4', '5-5', '6-10']])
  })

  it('removes the same tier from every category', () => {
    state().addCategoryTier(0)
    state().updateCategoryTier(0, 0, { to: 4 })
    state().addCategoryTier(0) // [1-4, 5-5, 6-10] everywhere

    state().removeCategoryTier(0, 1)
    expect(allBands()).toEqual([['1-5', '6-10'], ['1-5', '6-10']])
  })

  it('never empties a category that only has one tier', () => {
    state().setField('pricingCategories', [
      category('Adult', [
        { id: 'a', from: 1, to: 1, pricePerPerson: 100 },
        { id: 'b', from: 2, to: 10, pricePerPerson: 80 },
      ]),
      category('Child', [{ id: 'c', from: 1, to: 4, pricePerPerson: 50 }]),
    ])

    state().removeCategoryTier(0, 0)
    // Adult absorbs the removed band; Child keeps its only tier.
    expect(allBands()).toEqual([['1-10'], ['1-4']])
  })

  it('keeps prices with their band when a neighbouring tier is removed', () => {
    state().setField('pricingCategories', [
      category('Adult', [
        { id: 'a', from: 1, to: 4, pricePerPerson: 100 },
        { id: 'b', from: 5, to: 5, pricePerPerson: 80 },
        { id: 'c', from: 6, to: 10, pricePerPerson: 60 },
      ]),
    ])

    state().removeCategoryTier(0, 1)
    const tiers = state().pricingCategories[0].tiers
    expect(tiers.map((t) => `${t.from}-${t.to}`)).toEqual(['1-5', '6-10'])
    expect(tiers.map((t) => t.pricePerPerson)).toEqual([100, 60])
  })
})
