import { describe, it, expect } from 'vitest'
import {
  toMinutes,
  productDurationMinutes,
  sumStopMinutes,
  stopDurationsExceedProduct,
  formatMinutes,
} from '../utils/durationValidation'

describe('toMinutes', () => {
  it('converts each unit to minutes', () => {
    expect(toMinutes(2, 'hours')).toBe(120)
    expect(toMinutes(90, 'minutes')).toBe(90)
    expect(toMinutes(1, 'days')).toBe(1440)
  })

  it('treats null/NaN values as zero', () => {
    expect(toMinutes(null, 'hours')).toBe(0)
    expect(toMinutes(undefined, 'hours')).toBe(0)
    expect(toMinutes('abc', 'hours')).toBe(0)
  })

  it('falls back to minutes for unknown units', () => {
    expect(toMinutes(5, 'weeks')).toBe(5)
  })
})

describe('productDurationMinutes', () => {
  it('returns minutes for hours', () => {
    expect(productDurationMinutes(4, 'hours')).toBe(240)
  })

  it('returns minutes for days', () => {
    expect(productDurationMinutes(2, 'days')).toBe(2880)
  })

  it('returns null when duration is unset or non-positive', () => {
    expect(productDurationMinutes(null, 'hours')).toBeNull()
    expect(productDurationMinutes(0, 'hours')).toBeNull()
    expect(productDurationMinutes(-1, 'hours')).toBeNull()
  })

  it('defaults to hours when unit missing', () => {
    expect(productDurationMinutes(2, undefined)).toBe(120)
  })
})

describe('sumStopMinutes', () => {
  it('sums mixed units', () => {
    const stops = [
      { timeSpent: 2, timeSpentUnit: 'hours' },
      { timeSpent: 30, timeSpentUnit: 'minutes' },
    ]
    expect(sumStopMinutes(stops)).toBe(150)
  })

  it('ignores stops without a numeric timeSpent', () => {
    const stops = [
      { timeSpent: 2, timeSpentUnit: 'hours' },
      { timeSpent: null, timeSpentUnit: 'minutes' },
      {},
    ]
    expect(sumStopMinutes(stops)).toBe(120)
  })

  it('returns 0 for empty or non-array input', () => {
    expect(sumStopMinutes([])).toBe(0)
    expect(sumStopMinutes(undefined)).toBe(0)
  })
})

describe('stopDurationsExceedProduct', () => {
  const stops = [
    { timeSpent: 3, timeSpentUnit: 'hours' },
    { timeSpent: 30, timeSpentUnit: 'minutes' },
  ]

  it('flags when stops exceed the product duration', () => {
    expect(stopDurationsExceedProduct(stops, 2, 'hours')).toBe(true)
  })

  it('passes when within range', () => {
    expect(stopDurationsExceedProduct(stops, 4, 'hours')).toBe(false)
  })

  it('passes when exactly equal', () => {
    expect(stopDurationsExceedProduct(stops, 3.5, 'hours')).toBe(false)
  })

  it('does not flag when product duration is unset', () => {
    expect(stopDurationsExceedProduct(stops, null, 'hours')).toBe(false)
  })
})

describe('formatMinutes', () => {
  it('formats minutes, hours, and combos', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(150)).toBe('2h 30m')
  })

  it('handles zero and rounding', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(59.6)).toBe('1h')
  })
})