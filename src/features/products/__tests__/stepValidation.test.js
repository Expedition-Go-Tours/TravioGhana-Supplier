import { describe, it, expect } from 'vitest'
import { validateStep } from '../stepValidation'

function step7State(over = {}) {
  return {
    whatsIncluded: ['a', 'b', 'c'],
    whatsNotIncluded: [],
    foodProvided: true,
    meals: [],
    drinksIncluded: false,
    showDietaryRestrictions: false,
    dietaryOptions: [],
    duration: 1,
    durationUnit: 'hours',
    ...over,
  }
}

describe('validateStep (step 7 meals)', () => {
  it('requires at least one meal when food is provided', () => {
    const errors = validateStep(7, step7State())
    expect(errors.meals).toBeDefined()
  })

  it('requires a type and format for each meal', () => {
    const errors = validateStep(7, step7State({ meals: [{ type: '', format: '' }] }))
    expect(errors['meals.0.type']).toBeDefined()
    expect(errors['meals.0.format']).toBeDefined()
  })

  it('accepts a complete meal', () => {
    const errors = validateStep(7, step7State({ meals: [{ type: 'Lunch', format: 'Buffet' }] }))
    expect(errors.meals).toBeUndefined()
    expect(errors['meals.0.type']).toBeUndefined()
    expect(errors['meals.0.format']).toBeUndefined()
  })

  it('skips the meals requirement for multi-day tours', () => {
    const errors = validateStep(7, step7State({ duration: 2, durationUnit: 'days' }))
    expect(errors.meals).toBeUndefined()
  })
})

function validSchedule(over = {}) {
  return {
    name: 'Summer',
    type: 'operatingHours',
    startDate: '2026-06-01',
    hasEndDate: false,
    endDate: '',
    weeklySchedule: { Monday: [{ startTime: '09:00', endTime: '17:00' }] },
    timeSlots: [],
    pricingModel: 'perPerson',
    pricingApproach: 'dependsOnAge',
    pricingCategories: [{ name: 'Adult', minAge: 18, maxAge: 99, price: 100, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    uniformPrice: null,
    groupSizes: [],
    minParticipants: 1,
    maxParticipants: 10,
    maxGroupsPerTimeSlot: 1,
    additionalPersonsEnabled: false,
    additionalPersonPrice: null,
    ...over,
  }
}

describe('validateStep (step 15 pricing & availability)', () => {
  it('accepts a valid selected option', () => {
    const schedule = validSchedule()
    const errors = validateStep(15, {
      options: [{ id: 'o1', title: 'Standard', availability: { schedules: [schedule] }, pricing: {} }],
      selectedOptionId: 'o1',
      schedules: [schedule],
    })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('ignores reset live buffers when a valid schedule is committed', () => {
    const schedule = validSchedule()
    const errors = validateStep(15, {
      options: [{ id: 'o1', title: 'Standard', availability: { schedules: [schedule] }, pricing: {} }],
      selectedOptionId: 'o1',
      schedules: [schedule],
      // simulate a cancelled "Add schedule" that reset the editor buffers
      pricingModel: 'perPerson',
      pricingApproach: 'dependsOnAge',
      pricingCategories: [{ name: 'Child', price: null, minAge: 0, maxAge: 17, tiers: [] }],
      uniformPrice: null,
      groupSizes: [],
      timeSlots: [],
      minParticipants: 1,
      maxParticipants: 10,
    })
    expect(errors.schedules).toBeUndefined()
    expect(errors.pricingCategories).toBeUndefined()
  })

  it('flags a selected option with no schedules', () => {
    const errors = validateStep(15, {
      options: [{ id: 'o1', title: 'Standard', availability: { schedules: [] }, pricing: {} }],
      selectedOptionId: 'o1',
      schedules: [],
    })
    expect(errors.schedules).toBeDefined()
  })

  it('flags a multi-option product where one option is incomplete', () => {
    const schedule = validSchedule()
    const errors = validateStep(15, {
      options: [
        { id: 'o1', title: 'Standard', availability: { schedules: [schedule] }, pricing: {} },
        { id: 'o2', title: 'Premium', availability: { schedules: [] }, pricing: {} },
      ],
      selectedOptionId: 'o1',
      schedules: [schedule],
    })
    expect(errors.schedules).toBeDefined()
  })

  it('validates top-level schedules for legacy products with no options', () => {
    const errors = validateStep(15, {
      options: [],
      schedules: [validSchedule()],
    })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('flags additional-persons enabled without a price', () => {
    const schedule = validSchedule({ additionalPersonsEnabled: true, additionalPersonPrice: null })
    const errors = validateStep(15, {
      options: [{ id: 'o1', title: 'Standard', availability: { schedules: [schedule] }, pricing: {} }],
      selectedOptionId: 'o1',
      schedules: [schedule],
    })
    expect(errors.additionalPersonPrice).toBeDefined()
  })
})
