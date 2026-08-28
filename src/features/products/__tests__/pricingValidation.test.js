import { describe, it, expect } from 'vitest'
import {
  getAgeOverlap,
  validatePricingCategories,
  validateTiers,
  validateGroupSizes,
  validateCapacity,
  validateScheduleBasics,
  hasScheduleData,
  hasPricingData,
} from '../utils/pricingValidation'

const cat = (over = {}) => ({
  name: 'Adult',
  minAge: 18,
  maxAge: 59,
  price: 100,
  notAllowed: false,
  ticketNotRequired: false,
  needsAdult: false,
  idRequired: false,
  idType: '',
  tiers: [],
  ...over,
})

describe('getAgeOverlap', () => {
  it('reports the conflicting index for two overlapping regular bands', () => {
    const cats = [cat({ minAge: 18, maxAge: 99 }), cat({ name: 'Senior', minAge: 60, maxAge: 99 })]
    expect(getAgeOverlap(cats, 0, { maxAge: 99 })).toBe(1)
    expect(getAgeOverlap(cats, 1, {})).toBe(0)
  })

  it('returns null for adjacent non-overlapping bands (Child 0-17 / Adult 18-59)', () => {
    const cats = [cat({ name: 'Child', minAge: 0, maxAge: 17 }), cat({ name: 'Adult', minAge: 18, maxAge: 59 })]
    expect(getAgeOverlap(cats, 0, {})).toBeNull()
    expect(getAgeOverlap(cats, 1, {})).toBeNull()
  })

  it('never flags an ID-required target (Student overlaps Adult is allowed)', () => {
    const cats = [cat({ name: 'Adult', minAge: 18, maxAge: 59 }), cat({ name: 'Student', minAge: 18, maxAge: 25, idRequired: true })]
    expect(getAgeOverlap(cats, 1, { maxAge: 25 })).toBeNull()
  })

  it('ignores ID-required categories when checking a regular band', () => {
    const cats = [cat({ name: 'Student', minAge: 18, maxAge: 25, idRequired: true }), cat({ name: 'Senior', minAge: 60, maxAge: 99 })]
    expect(getAgeOverlap(cats, 1, {})).toBeNull()
  })
})

describe('validatePricingCategories', () => {
  it('flags overlap between Adult 18-99 and Senior 60-99 on both categories', () => {
    const issues = validatePricingCategories([
      cat({ name: 'Adult', minAge: 18, maxAge: 99 }),
      cat({ name: 'Senior', minAge: 60, maxAge: 99 }),
    ])
    const overlap = issues.filter((i) => i.message.includes('overlaps'))
    expect(overlap).toHaveLength(2)
    expect(overlap.map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining(['pricingCategories.0.maxAge', 'pricingCategories.1.maxAge'])
    )
  })

  it('accepts contiguous GYG-style defaults (Child 0-17 / Adult 18-59 / Senior 60-99)', () => {
    const issues = validatePricingCategories([
      cat({ name: 'Child', minAge: 0, maxAge: 17 }),
      cat({ name: 'Adult', minAge: 18, maxAge: 59 }),
      cat({ name: 'Senior', minAge: 60, maxAge: 99 }),
    ])
    expect(issues.filter((i) => i.message.includes('overlaps'))).toHaveLength(0)
  })

  it('does not flag an ID-required category that overlaps its base category', () => {
    const issues = validatePricingCategories([
      cat({ name: 'Adult', minAge: 18, maxAge: 59 }),
      cat({ name: 'Student', minAge: 18, maxAge: 25, idRequired: true }),
    ])
    expect(issues.filter((i) => i.message.includes('overlaps'))).toHaveLength(0)
  })

  it('flags missing prices only when withPrices is true', () => {
    const cats = [cat({ price: null })]
    expect(validatePricingCategories(cats).filter((i) => i.message.includes('price'))).toHaveLength(1)
    expect(validatePricingCategories(cats, { withPrices: false })).toHaveLength(0)
  })

  it('flags a missing category name regardless of withPrices', () => {
    const issues = validatePricingCategories([cat({ name: '' })], { withPrices: false })
    expect(issues.some((i) => i.message.includes('category name'))).toBe(true)
  })
})

describe('validateTiers', () => {
  it('flags a tier with a range but no price', () => {
    const issues = validateTiers({ tiers: [{ from: 1, to: 1, pricePerPerson: 100 }, { from: 2, to: 10, pricePerPerson: null }] })
    expect(issues).toHaveLength(1)
    expect(issues[0].path).toEqual(['tiers', 1, 'pricePerPerson'])
    expect(issues[0].message).toBe('Enter a price for this tier')
  })

  it('flags sequential gaps between tiers', () => {
    const issues = validateTiers({ tiers: [{ from: 1, to: 1, pricePerPerson: 100 }, { from: 3, to: 10, pricePerPerson: 90 }] })
    expect(issues.some((i) => i.message.includes('sequential'))).toBe(true)
  })
})

describe('validateGroupSizes', () => {
  it('flags missing prices and overlapping bands', () => {
    const issues = validateGroupSizes([
      { from: 1, to: 5, price: null },
      { from: 3, to: 10, price: 80 },
    ])
    expect(issues.some((i) => i.message.includes('price for this group'))).toBe(true)
    expect(issues.some((i) => i.message.includes('must not overlap'))).toBe(true)
  })
})

describe('validateCapacity', () => {
  it('flags missing min/max participants and inverted ranges', () => {
    expect(validateCapacity({ minParticipants: null, maxParticipants: null })).toHaveLength(2)
    expect(validateCapacity({ minParticipants: 10, maxParticipants: 5 })[0].message).toContain('less than or equal')
  })
})

describe('validateScheduleBasics', () => {
  it('flags a missing name, missing dates, and empty schedule type requirements', () => {
    const issues = validateScheduleBasics({ scheduleType: 'fixedTimeSlot', timeSlots: [], weeklySchedule: {}, scheduleHasEndDate: false })
    expect(issues.some((i) => i.message === 'Name your schedule')).toBe(true)
    expect(issues.some((i) => i.message === 'Select a starting date')).toBe(true)
    expect(issues.some((i) => i.message === 'Add at least one time slot')).toBe(true)
  })

  it('accepts a valid weekly-hours schedule', () => {
    const issues = validateScheduleBasics({
      scheduleName: 'Summer',
      scheduleStartDate: '2026-06-01',
      scheduleHasEndDate: false,
      scheduleType: 'weekly',
      weeklySchedule: { Monday: [{ startTime: '09:00', endTime: '17:00' }] },
    })
    expect(issues).toHaveLength(0)
  })
})

describe('hasScheduleData', () => {
  it('is false for an empty schedule state', () => {
    expect(hasScheduleData({})).toBe(false)
    expect(hasScheduleData({ schedules: [], weeklySchedule: {}, timeSlots: [], dateExceptions: [] })).toBe(false)
  })

  it('detects weekly opening hours', () => {
    expect(hasScheduleData({ weeklySchedule: { Monday: [{ startTime: '09:00', endTime: '17:00' }] } })).toBe(true)
  })

  it('detects time slots', () => {
    expect(hasScheduleData({ timeSlots: [{ id: 's1', startTime: '09:00' }] })).toBe(true)
  })

  it('detects date exceptions and saved schedules', () => {
    expect(hasScheduleData({ dateExceptions: [{ date: '2026-12-25' }] })).toBe(true)
    expect(hasScheduleData({ schedules: [{ name: 'Summer' }] })).toBe(true)
  })
})

describe('hasPricingData', () => {
  it('is false when nothing is priced', () => {
    expect(hasPricingData({ pricingModel: 'perPerson', uniformPrice: null, pricingCategories: [cat({ price: null })], groupSizes: [] })).toBe(false)
  })

  it('detects a uniform price or category prices for per-person', () => {
    expect(hasPricingData({ pricingModel: 'perPerson', uniformPrice: 50, groupSizes: [] })).toBe(true)
    expect(hasPricingData({ pricingModel: 'perPerson', pricingCategories: [cat({ price: 100 })] })).toBe(true)
  })

  it('detects group-size prices for per-group', () => {
    expect(hasPricingData({ pricingModel: 'perGroup', groupSizes: [{ from: 1, to: 5, price: 300 }] })).toBe(true)
    expect(hasPricingData({ pricingModel: 'perGroup', groupSizes: [{ from: 1, to: 5, price: null }], uniformPrice: 50 })).toBe(false)
  })

  it('treats saved schedules as pricing data to protect', () => {
    expect(hasPricingData({ pricingModel: 'perPerson', schedules: [{ name: 'Summer' }], pricingCategories: [] })).toBe(true)
  })
})
