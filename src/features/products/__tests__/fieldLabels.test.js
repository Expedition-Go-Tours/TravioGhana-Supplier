/**
 * Field labels and the wizard footer's error list.
 *
 * The footer names the field a supplier must fix, so two things matter:
 * the label has to match the field on screen ("Product title", not "Title"),
 * and three empty highlight rows are one problem, not three.
 */

import { describe, expect, it } from 'vitest'
import { getFieldLabel, getFieldAnchor, dedupeFieldErrors } from '../fieldLabels'

describe('getFieldLabel', () => {
  it('names the title field the way the step labels it', () => {
    expect(getFieldLabel('title')).toBe('Product title')
  })

  it('keeps option titles distinct from the product title', () => {
    expect(getFieldLabel('options.0.title')).toBe('Option title')
  })

  it('labels an indexed array error by its list', () => {
    expect(getFieldLabel('highlights.2')).toBe('Highlights')
    expect(getFieldLabel('meals.0.type')).toBe('Meal type')
  })

  it('leaves an unknown key readable', () => {
    expect(getFieldLabel('somethingNew')).toBe('somethingNew')
  })
})

describe('getFieldAnchor', () => {
  it('drops numeric segments so the link lands on the list', () => {
    expect(getFieldAnchor('highlights.2')).toBe('highlights')
    expect(getFieldAnchor('meals.0.format')).toBe('meals')
    expect(getFieldAnchor('title')).toBe('title')
  })
})

describe('dedupeFieldErrors', () => {
  it('collapses three empty highlights into one entry', () => {
    const entries = dedupeFieldErrors({
      'highlights.0': ['Highlight cannot be empty'],
      'highlights.1': ['Highlight cannot be empty'],
      'highlights.2': ['Highlight cannot be empty'],
    })

    expect(entries).toEqual([['highlights', ['Highlight cannot be empty']]])
  })

  it('keeps distinct fields and their first message', () => {
    const entries = dedupeFieldErrors({
      'highlights.0': ['Highlight cannot be empty'],
      'shortDescription': ['Short description must be at least 10 characters'],
      'whatsNotIncluded': ['Add at least 3 exclusions'],
    })

    expect(entries.map(([field]) => field)).toEqual(['highlights', 'shortDescription', 'whatsNotIncluded'])
  })

  it('survives an empty error map', () => {
    expect(dedupeFieldErrors({})).toEqual([])
    expect(dedupeFieldErrors(undefined)).toEqual([])
  })
})
