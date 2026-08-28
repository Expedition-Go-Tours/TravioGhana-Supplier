import { describe, it, expect, beforeEach } from 'vitest'
import { useProductBuilderStore } from '../productBuilderStore'

const EMPTY_WEEK = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }

const pricedCategory = (over = {}) => ({
  name: 'Adult',
  price: 100,
  minAge: 18,
  maxAge: 59,
  notAllowed: false,
  ticketNotRequired: false,
  needsAdult: false,
  idRequired: false,
  idType: '',
  tiers: [{ id: 't1', from: 1, to: 5, pricePerPerson: 90 }],
  ...over,
})

function seed(overrides = {}) {
  useProductBuilderStore.setState({
    scheduleType: 'operatingHours',
    pricingModel: 'perPerson',
    schedules: [],
    weeklySchedule: { ...EMPTY_WEEK },
    dateExceptions: [],
    timeSlots: [],
    groupSizes: [],
    uniformPrice: null,
    pricingCategories: [pricedCategory()],
    minParticipants: 2,
    maxParticipants: 20,
    maxGroupsPerTimeSlot: 3,
    additionalPersonsEnabled: true,
    additionalPersonPrice: 25,
    isDirty: false,
    autosaveError: null,
    ...overrides,
  })
}

describe('confirmPricingModelChange', () => {
  beforeEach(() => {
    seed()
  })

  it('wipes schedules, pricing and capacity, then applies the new model', () => {
    const { confirmPricingModelChange } = useProductBuilderStore.getState()
    confirmPricingModelChange('perGroup')

    const s = useProductBuilderStore.getState()
    expect(s.pricingModel).toBe('perGroup')
    expect(s.schedules).toEqual([])
    expect(s.groupSizes).toEqual([])
    expect(s.uniformPrice).toBeNull()
    expect(s.pricingCategories[0].price).toBeNull()
    expect(s.pricingCategories[0].tiers).toEqual([])
    expect(s.minParticipants).toBe(1)
    expect(s.maxParticipants).toBe(10)
    expect(s.maxGroupsPerTimeSlot).toBe(1)
    expect(s.additionalPersonsEnabled).toBe(false)
    expect(s.additionalPersonPrice).toBeNull()
    expect(s.isDirty).toBe(true)
  })

  it('leaves availability data untouched', () => {
    seed({ weeklySchedule: { ...EMPTY_WEEK, Monday: [{ startTime: '09:00', endTime: '17:00' }] }, timeSlots: [{ id: 's1', startTime: '09:00' }] })
    const { confirmPricingModelChange } = useProductBuilderStore.getState()
    confirmPricingModelChange('perPerson')

    const s = useProductBuilderStore.getState()
    expect(s.weeklySchedule.Monday).toHaveLength(1)
    expect(s.timeSlots).toHaveLength(1)
  })
})

describe('confirmScheduleTypeChange', () => {
  beforeEach(() => {
    seed()
  })

  it('switching to fixed time slots clears opening hours + date exceptions but keeps time slots', () => {
    seed({
      weeklySchedule: { ...EMPTY_WEEK, Monday: [{ startTime: '09:00', endTime: '17:00' }] },
      dateExceptions: [{ date: '2026-12-25' }],
      timeSlots: [{ id: 's1', startTime: '09:00' }],
    })
    const { confirmScheduleTypeChange } = useProductBuilderStore.getState()
    confirmScheduleTypeChange('fixedTimeSlot')

    const s = useProductBuilderStore.getState()
    expect(s.scheduleType).toBe('fixedTimeSlot')
    expect(s.weeklySchedule).toEqual(EMPTY_WEEK)
    expect(s.dateExceptions).toEqual([])
    expect(s.timeSlots).toHaveLength(1)
  })

  it('switching to operating hours clears time slots but keeps opening hours', () => {
    seed({
      scheduleType: 'fixedTimeSlot',
      timeSlots: [{ id: 's1', startTime: '09:00' }],
      weeklySchedule: { ...EMPTY_WEEK, Saturday: [{ startTime: '10:00', endTime: '18:00' }] },
    })
    const { confirmScheduleTypeChange } = useProductBuilderStore.getState()
    confirmScheduleTypeChange('operatingHours')

    const s = useProductBuilderStore.getState()
    expect(s.scheduleType).toBe('operatingHours')
    expect(s.timeSlots).toEqual([])
    expect(s.weeklySchedule.Saturday).toHaveLength(1)
  })

  it('wipes schedules and pricing buffers in both directions', () => {
    seed({ schedules: [{ name: 'Summer' }], uniformPrice: 75 })
    const { confirmScheduleTypeChange } = useProductBuilderStore.getState()
    confirmScheduleTypeChange('fixedTimeSlot')

    const s = useProductBuilderStore.getState()
    expect(s.schedules).toEqual([])
    expect(s.uniformPrice).toBeNull()
    expect(s.pricingCategories[0].price).toBeNull()
    expect(s.pricingCategories[0].tiers).toEqual([])
    expect(s.minParticipants).toBe(1)
    expect(s.maxGroupsPerTimeSlot).toBe(1)
    expect(s.additionalPersonsEnabled).toBe(false)
    expect(s.isDirty).toBe(true)
  })

  it('keeps the pricing model unchanged', () => {
    const { confirmScheduleTypeChange } = useProductBuilderStore.getState()
    confirmScheduleTypeChange('fixedTimeSlot')
    expect(useProductBuilderStore.getState().pricingModel).toBe('perPerson')
  })
})