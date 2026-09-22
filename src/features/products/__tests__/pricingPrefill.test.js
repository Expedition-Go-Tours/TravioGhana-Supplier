import { describe, it, expect, beforeEach } from 'vitest'
import { tourToProduct } from '../pages/ProductBuilderPage'
import { useProductBuilderStore } from '../productBuilderStore'

// Regression: after an admin accepts a saved update, the persisted option
// availability schedules no longer carry `pricingCategories` (buildPayload
// strips them — the backend enforces one price list per option). On reload the
// builder must re-derive them from the option's pricing, otherwise the schedule
// wizard's Pricing Categories step is empty and the next autosave is rejected
// with "no price list configured".

const DAY = [{ startTime: '08:00', endTime: '18:00' }]
const WEEK = { Monday: DAY, Tuesday: DAY, Wednesday: DAY, Thursday: DAY, Friday: DAY, Saturday: DAY, Sunday: DAY }

const cats = [
  { name: 'Child', price: 80, minAge: 0, maxAge: 17, tiers: [] },
  { name: 'Adult', price: 100, minAge: 18, maxAge: 59, tiers: [] },
  { name: 'Senior', price: 120, minAge: 60, maxAge: 99, tiers: [] },
]

// Mirrors GET /tours/:id for an ACTIVE tour whose option schedules were saved
// through buildPayload (i.e. stripped of schedule-level pricingCategories).
function apiTour() {
  const scheduleWithoutCats = {
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
    minParticipants: 1,
    maxParticipants: 15,
  }
  return {
    id: 'tour1',
    title: 'Waterfalls',
    status: 'ACTIVE',
    productContent: {
      options: [{
        id: 'opt1',
        title: 'Waterfalls ',
        pricing: { pricingModel: 'perPerson', pricingApproach: 'dependsOnAge', currency: 'USD', pricingCategories: JSON.parse(JSON.stringify(cats)), minParticipants: 1, maxParticipants: 15 },
        availability: { scheduleType: 'operatingHours', schedules: [scheduleWithoutCats], weeklySchedule: JSON.parse(JSON.stringify(WEEK)), timeSlots: [] },
        cutoff: { cutoffMinutes: 20 },
      }],
    },
    schedulesAndPricing: {
      travelerDetails: { pricingModel: 'perPerson', pricingApproach: 'dependsOnAge', pricingCategories: JSON.parse(JSON.stringify(cats)), minParticipants: 1, maxParticipants: 15 },
      availability: { scheduleType: 'operatingHours', weeklySchedule: JSON.parse(JSON.stringify(WEEK)), timeSlots: [] },
      pricingSchedules: { currency: 'USD', schedules: [{ ...scheduleWithoutCats, pricingCategories: JSON.parse(JSON.stringify(cats)) }] },
    },
    bookingAndTickets: {},
    categorization: {},
  }
}

describe('pricing categories prefill after reload', () => {
  beforeEach(() => {
    useProductBuilderStore.getState().reset()
  })

  it('re-derives schedule pricingCategories from the option price list', () => {
    const product = tourToProduct(apiTour())
    expect(product.schedules[0].pricingCategories.length).toBe(3)

    useProductBuilderStore.getState().loadDraft(product)
    useProductBuilderStore.getState().editSchedule(0)

    const s = useProductBuilderStore.getState()
    expect(s.pricingCategories.map((c) => c.name)).toEqual(['Child', 'Adult', 'Senior'])
    expect(s.pricingCategories.map((c) => c.price)).toEqual([80, 100, 120])
  })
})
