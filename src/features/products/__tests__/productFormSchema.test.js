import { describe, it, expect } from 'vitest'
import {
  stepSchemas,
  MEETING_POINT_DESCRIPTION_MAX_CHARS,
  PICKUP_DESCRIPTION_MAX_CHARS,
} from '../productFormSchema'

const step13 = stepSchemas[13]

describe('stepSchemas[13] (Meeting point or pickup)', () => {
  const base = { meetingMode: 'meeting_point' }

  it('rejects meetingPointDescription over 200 characters', () => {
    const result = step13.safeParse({
      ...base,
      meetingPointDescription: 'x'.repeat(MEETING_POINT_DESCRIPTION_MAX_CHARS + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts meetingPointDescription at exactly 200 characters', () => {
    const result = step13.safeParse({
      ...base,
      meetingPointDescription: 'x'.repeat(MEETING_POINT_DESCRIPTION_MAX_CHARS),
    })
    expect(result.success).toBe(true)
  })

  it('rejects pickupDescription over 200 characters', () => {
    const result = step13.safeParse({
      meetingMode: 'pickup',
      pickupDescription: 'x'.repeat(PICKUP_DESCRIPTION_MAX_CHARS + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts pickupDescription at exactly 200 characters', () => {
    const result = step13.safeParse({
      meetingMode: 'pickup',
      pickupDescription: 'x'.repeat(PICKUP_DESCRIPTION_MAX_CHARS),
    })
    expect(result.success).toBe(true)
  })

  it('keeps both description fields optional (empty strings pass)', () => {
    const result = step13.safeParse({
      ...base,
      meetingPointDescription: '',
      pickupDescription: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts arrivalTimeType 20min and 25min', () => {
    expect(step13.safeParse({ ...base, arrivalTimeType: '20min' }).success).toBe(true)
    expect(step13.safeParse({ ...base, arrivalTimeType: '25min' }).success).toBe(true)
  })
})
