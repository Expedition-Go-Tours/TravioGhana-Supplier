import { describe, it, expect, beforeEach } from 'vitest'
import { useProductBuilderStore } from '../productBuilderStore'
import { buildPayload } from '../useAutoSave'

// Regression: the schedule wizard's "Save and continue" used to discard every
// pricing edit. saveSchedule() wrote the schedule but never committed the live
// pricing buffers onto the selected option, so the wizard-close path
// (reloadSelectedOptionBuffers) reloaded the option's stale pre-edit pricing and
// silently reverted the change. Suppliers saw the old price when they re-opened
// the step, and the payload sent to autosave / submit-for-review kept the old
// price (hence the phantom "no changes to submit" + disabled submit button).

const DAY = [{ startTime: '08:00', endTime: '18:00' }]
const WEEK = { Monday: DAY, Tuesday: DAY, Wednesday: DAY, Thursday: DAY, Friday: DAY, Saturday: DAY, Sunday: DAY }

const cat = (name, minAge, maxAge, price, tier6) => ({
  name,
  price,
  minAge,
  maxAge,
  notAllowed: false,
  ticketNotRequired: false,
  needsAdult: false,
  idRequired: false,
  idType: '',
  tiers: [
    { id: `${name}-1`, from: 1, to: 5, pricePerPerson: price },
    { id: `${name}-2`, from: 6, to: 15, pricePerPerson: tier6 },
  ],
})

const categories = () => [cat('Adult', 18, 59, 180, 95), cat('Senior', 60, 99, 200, 120), cat('Child', 0, 17, 100, 80)]

function schedule(cats) {
  return {
    name: 'Waterfalls Experience',
    type: 'operatingHours',
    startDate: '2026-08-26',
    hasEndDate: true,
    endDate: '2026-12-30',
    weeklySchedule: JSON.parse(JSON.stringify(WEEK)),
    dateExceptions: [],
    timeSlots: [],
    pricingModel: 'perPerson',
    currency: 'USD',
    pricingApproach: 'dependsOnAge',
    uniformPrice: null,
    pricingCategories: JSON.parse(JSON.stringify(cats)),
    minParticipants: 1,
    maxParticipants: 15,
  }
}

// Mirrors the product shape ProductBuilderPage.tourToProduct() hands to loadDraft().
function product() {
  const cats = categories()
  return {
    title: 'Waterfalls',
    fullDescription: 'x',
    options: [{
      id: 'opt1',
      title: 'Waterfalls ',
      pricing: { pricingModel: 'perPerson', pricingApproach: 'dependsOnAge', currency: 'USD', pricingCategories: JSON.parse(JSON.stringify(cats)), minParticipants: 1, maxParticipants: 15 },
      availability: { scheduleType: 'operatingHours', schedules: [schedule(cats)], weeklySchedule: JSON.parse(JSON.stringify(WEEK)), timeSlots: [] },
      cutoff: { cutoffMinutes: 20 },
    }],
    schedules: [schedule(cats)],
    weeklySchedule: JSON.parse(JSON.stringify(WEEK)),
    timeSlots: [],
    pricingCategories: JSON.parse(JSON.stringify(cats)),
    pricingModel: 'perPerson',
    pricingApproach: 'dependsOnAge',
    currency: 'USD',
    scheduleType: 'operatingHours',
    minParticipants: 1,
    maxParticipants: 15,
  }
}

describe('schedule wizard save preserves pricing edits', () => {
  beforeEach(() => {
    useProductBuilderStore.getState().reset()
    useProductBuilderStore.getState().loadDraft(product())
  })

  it('keeps the edited price after saveSchedule + wizard close (reloadSelectedOptionBuffers)', () => {
    // Open the wizard on the saved schedule and raise Adult 180 -> 220.
    useProductBuilderStore.getState().editSchedule(0)
    useProductBuilderStore.getState().updatePricingCategory(0, { price: 220 })
    useProductBuilderStore.getState().updateCategoryTier(0, 0, { pricePerPerson: 220 })

    // "Save and continue" then the close path.
    useProductBuilderStore.getState().saveSchedule()
    useProductBuilderStore.getState().reloadSelectedOptionBuffers()

    const s = useProductBuilderStore.getState()
    expect(s.pricingCategories[0].price).toBe(220)
    expect(buildPayload(s).options[0].pricing.pricingCategories[0].price).toBe(220)
  })

  it('still discards uncommitted scratchpad on cancel', () => {
    // Open, edit, then back out WITHOUT saving.
    useProductBuilderStore.getState().editSchedule(0)
    useProductBuilderStore.getState().updatePricingCategory(0, { price: 220 })
    useProductBuilderStore.getState().reloadSelectedOptionBuffers()

    expect(useProductBuilderStore.getState().pricingCategories[0].price).toBe(180)
  })
})
