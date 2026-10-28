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
    expect(day.closedCutoff).toBe(false)
    expect(day.closesAt).toBeNull()
  })

  it('marks a whole-day cut-off closure as closed instead of available', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      closedCutoff: true,
      closesAt: '2026-10-29T16:00:00.000Z',
    })
    expect(day.status).toBe('closed')
    expect(day.closedCutoff).toBe(true)
    expect(day.closesAt).toBe('2026-10-29T16:00:00.000Z')
  })

  it('marks a day closed when every time slot has closed', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      timeSlots: [
        { time: '09:00', capacity: 5, booked: 0, closed: true, closesAt: '2026-08-10T07:00:00.000Z' },
        { time: '14:00', capacity: 5, booked: 0, closed: true, closesAt: '2026-08-10T12:00:00.000Z' },
      ],
    })
    expect(day.status).toBe('closed')
    expect(day.slots.every((slot) => slot.closed)).toBe(true)
  })

  it('keeps a day available when at least one slot is still open', () => {
    const day = mapCalendarDay({
      ...base,
      status: 'AVAILABLE',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      timeSlots: [
        { time: '09:00', capacity: 5, booked: 0, closed: true, closesAt: '2026-08-10T07:00:00.000Z' },
        { time: '14:00', capacity: 5, booked: 0, closed: false, closesAt: '2026-08-10T12:00:00.000Z' },
      ],
    })
    expect(day.status).toBe('available')
    expect(day.slots.map((slot) => slot.closed)).toEqual([true, false])
  })

  it('lets blocked, full, past and closed windows keep their own precedence', () => {
    const blocked = mapCalendarDay({
      ...base,
      status: 'BLOCKED',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      closedCutoff: true,
    })
    expect(blocked.status).toBe('blocked')

    const full = mapCalendarDay({
      ...base,
      status: 'FULL',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      closedCutoff: true,
    })
    expect(full.status).toBe('full')

    const past = mapCalendarDay({
      ...base,
      status: 'PAST',
      capacity: 10,
      baseCapacity: 10,
      overrideCapacity: null,
      closedCutoff: true,
    })
    expect(past.status).toBe('past')
  })
})