import { describe, it, expect } from 'vitest'
import {
  stepSchemas,
  MEETING_POINT_DESCRIPTION_MAX_CHARS,
  PICKUP_DESCRIPTION_MAX_CHARS,
} from '../productFormSchema'

const meetingPoint = { name: 'Main Gate', address: '123 Main St', lat: 1, lng: 1 }
const pickupLocation = { name: 'Airport', address: '1 Terminal Rd', lat: 1, lng: 1 }

describe('stepSchemas[13] (Meeting point or pickup)', () => {
  const base = { meetingMode: 'meeting_point', meetingPoints: [meetingPoint] }
  const pickupBase = { meetingMode: 'pickup', pickupType: 'address', pickupLocations: [pickupLocation], referenceStartTime: '0-15' }

  it('rejects meetingPointDescription over 200 characters', () => {
    const result = stepSchemas[13].safeParse({
      ...base,
      meetingPointDescription: 'x'.repeat(MEETING_POINT_DESCRIPTION_MAX_CHARS + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts meetingPointDescription at exactly 200 characters', () => {
    const result = stepSchemas[13].safeParse({
      ...base,
      meetingPointDescription: 'x'.repeat(MEETING_POINT_DESCRIPTION_MAX_CHARS),
    })
    expect(result.success).toBe(true)
  })

  it('rejects pickupDescription over 200 characters', () => {
    const result = stepSchemas[13].safeParse({
      ...pickupBase,
      pickupDescription: 'x'.repeat(PICKUP_DESCRIPTION_MAX_CHARS + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts pickupDescription at exactly 200 characters', () => {
    const result = stepSchemas[13].safeParse({
      ...pickupBase,
      pickupDescription: 'x'.repeat(PICKUP_DESCRIPTION_MAX_CHARS),
    })
    expect(result.success).toBe(true)
  })

  it('keeps both description fields optional (empty strings pass)', () => {
    const result = stepSchemas[13].safeParse({
      ...base,
      meetingPointDescription: '',
      pickupDescription: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts arrivalTimeType 20min and 25min', () => {
    expect(stepSchemas[13].safeParse({ ...base, arrivalTimeType: '20min' }).success).toBe(true)
    expect(stepSchemas[13].safeParse({ ...base, arrivalTimeType: '25min' }).success).toBe(true)
  })

  it('requires a meeting point when meetingMode is meeting_point', () => {
    const result = stepSchemas[13].safeParse({ meetingMode: 'meeting_point' })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'meetingPoints')).toBe(true)
  })

  it('requires a pickup area when pickupType is area', () => {
    const result = stepSchemas[13].safeParse({ meetingMode: 'pickup', pickupType: 'area', pickupAreas: [] })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'pickupAreas')).toBe(true)
  })

  it('requires a pickup location when pickupType is address', () => {
    const result = stepSchemas[13].safeParse({ meetingMode: 'pickup', pickupType: 'address', pickupLocations: [] })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'pickupLocations')).toBe(true)
  })

  it('requires a pickup time when meetingMode is pickup', () => {
    const result = stepSchemas[13].safeParse({ meetingMode: 'pickup', pickupType: 'address', pickupLocations: [pickupLocation] })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'referenceStartTime')).toBe(true)
  })

  it('accepts a pickup time with a valid pickup location', () => {
    const result = stepSchemas[13].safeParse({ meetingMode: 'pickup', pickupType: 'address', pickupLocations: [pickupLocation], referenceStartTime: '0-15' })
    expect(result.success).toBe(true)
  })

  it('requires a drop-off address for different_location', () => {
    const result = stepSchemas[13].safeParse({ ...base, dropoffOption: 'different_location', dropoffLocation: null })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'dropoffLocation')).toBe(true)
  })

  it('accepts a valid drop-off address for different_location', () => {
    const result = stepSchemas[13].safeParse({ ...base, dropoffOption: 'different_location', dropoffLocation: meetingPoint })
    expect(result.success).toBe(true)
  })
})

describe('stepSchemas[6] (Keywords)', () => {
  it('rejects fewer than 3 keywords', () => {
    expect(stepSchemas[6].safeParse({ keywords: ['a', 'b'] }).success).toBe(false)
  })

  it('accepts 3 or more keywords', () => {
    expect(stepSchemas[6].safeParse({ keywords: ['a', 'b', 'c'] }).success).toBe(true)
  })
})

describe('stepSchemas[7] (Inclusions)', () => {
  it('rejects fewer than 3 inclusions', () => {
    expect(stepSchemas[7].safeParse({ whatsIncluded: ['a', 'b'], foodProvided: false }).success).toBe(false)
  })

  it('rejects an empty inclusion item', () => {
    expect(stepSchemas[7].safeParse({ whatsIncluded: ['a', 'b', ''], foodProvided: false }).success).toBe(false)
  })

  it('accepts 3 non-empty inclusions', () => {
    expect(stepSchemas[7].safeParse({ whatsIncluded: ['a', 'b', 'c'], foodProvided: false }).success).toBe(true)
  })
})

describe('stepSchemas[9] (Extra information)', () => {
  it('requires wifiIncluded', () => {
    expect(stepSchemas[9].safeParse({}).success).toBe(false)
  })

  it('accepts a wifiIncluded boolean', () => {
    expect(stepSchemas[9].safeParse({ wifiIncluded: false }).success).toBe(true)
  })
})

describe('stepSchemas[5] (Locations)', () => {
  it('rejects a location missing a description', () => {
    const result = stepSchemas[5].safeParse({ locations: [{ name: 'Stop', description: '', timeSpent: 30 }] })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.includes('description'))).toBe(true)
  })

  it('rejects a location missing time spent', () => {
    const result = stepSchemas[5].safeParse({ locations: [{ name: 'Stop', description: 'Desc' }] })
    expect(result.success).toBe(false)
  })

  it('accepts a location with name, description and time spent', () => {
    const result = stepSchemas[5].safeParse({ locations: [{ name: 'Stop', description: 'Desc', timeSpent: 30 }] })
    expect(result.success).toBe(true)
  })
})

describe('stepSchemas[12] (Booking options) validity period', () => {
  const option = { id: 'a', title: 'Standard', isPrivate: false, skipTheLine: 'none', validity: null, validityUnit: null }

  it('requires validity and validityUnit when validityType is period', () => {
    const result = stepSchemas[12].safeParse({ options: [{ ...option, validityType: 'period', validity: null, validityUnit: null }] })
    expect(result.success).toBe(false)
    expect(result.error.issues.some((i) => i.path.join('.') === 'options.0.validity')).toBe(true)
    expect(result.error.issues.some((i) => i.path.join('.') === 'options.0.validityUnit')).toBe(true)
  })

  it('accepts a period option with validity and unit', () => {
    const result = stepSchemas[12].safeParse({ options: [{ ...option, validityType: 'period', validity: 2, validityUnit: 'days' }] })
    expect(result.success).toBe(true)
  })
})
