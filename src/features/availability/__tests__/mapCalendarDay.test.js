import { describe, it, expect } from 'vitest'
import { mapCalendarDay } from '../api'

describe('mapCalendarDay status derivation', () => {
  const base = {
    date: '2026-08-10',
    dayOfWeek: 1,
    isOperatingDay: true,
    booked: 2,
    remaining: 3,
    capacityUnit: 'people',
    groupsPerSlot: null,
    maxGroupSize: null,
    cutoffMinutes: null,
    timeSlots: [],
    hasOverride: true,
  }

  it('marks a day Limited when the override capacity is below the tour default', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 5,
      baseCapacity: 10,
      overrideCapacity: 5,
    })
    expect(day.status).toBe('limited')
    expect(day.baseCapacity).toBe(10)
    expect(day.overrideCapacity).toBe(5)
  })

  it('keeps an override at or above the base capacity available', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 15,
      baseCapacity: 10,
      overrideCapacity: 15,
    })
    expect(day.status).toBe('available')
  })

  it('keeps an equal override available', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: 10,
    })
    expect(day.status).toBe('available')
  })

  it('passes through a backend limited status', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'LIMITED',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
    })
    expect(day.status).toBe('limited')
  })

  it('does not override full or blocked days', () => {
    const full = mapCalendarDay({
      ...base,
      status: 'FULL',
      capacity: 5,
      baseCapacity: 10,
      overrideCapacity: 5,
    })
    expect(full.status).toBe('full')

    const blocked = mapCalendarDay({
      ...base,
      status: 'BLOCKED',
      capacity: 5,
      baseCapacity: 10,
      overrideCapacity: 5,
    })
    expect(blocked.status).toBe('blocked')
  })

  it('defaults missing status and capacity fields safely', () => {
    const day = mapCalendarDay({ date: '2026-08-10' })
    expect(day.status).toBe('available')
    expect(day.baseCapacity).toBeUndefined()
    expect(day.overrideCapacity).toBeNull()
    expect(day.capacityUnit).toBe('people')
  })
})