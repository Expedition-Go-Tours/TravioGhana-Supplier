// Per-option pricing / availability / cut-off resolution.
//
// Options are the bookable unit (matching GYG & Viator): each option owns its
// own pricing, availability and cut-off. For backward compatibility with
// products created before this restructure, an option without its own data
// inherits the product-level template. The option currently open in the
// builder's Pricing/Cut-off steps always reflects the live editor buffers.

export const EMPTY_WEEKLY_SCHEDULE = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
}

export function deepClone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

// Stable-sort a locations array by `day` so Day 1 comes first, then Day 2, ...
// while preserving the relative order of stops within the same day. Applied at
// the persistence/load boundaries (NOT during editing, where array indices
// must stay stable so the modal/editor can address stops by index).
export function sortLocationsByDay(list) {
  if (!Array.isArray(list)) return list
  return [...list].sort((a, b) => (a.day ?? 1) - (b.day ?? 1))
}

export function pricingFromBuffers(s) {
  return {
    pricingModel: s.pricingModel || 'perPerson',
    currency: s.currency || 'USD',
    pricingApproach: s.pricingApproach || 'dependsOnAge',
    uniformPrice: s.uniformPrice ?? null,
    pricingCategories: (s.pricingCategories || []).map((c) => ({ ...c, tiers: c.tiers || [] })),
    minParticipants: s.minParticipants ?? 1,
    maxParticipants: s.maxParticipants ?? 10,
    groupSizes: deepClone(s.groupSizes || []),
    maxGroupsPerTimeSlot: s.maxGroupsPerTimeSlot ?? 1,
    additionalPersonsEnabled: !!s.additionalPersonsEnabled,
    additionalPersonPrice: s.additionalPersonPrice ?? null,
  }
}

export function availabilityFromBuffers(s) {
  return {
    scheduleType: s.scheduleType || 'operatingHours',
    schedules: deepClone(s.schedules || []),
    weeklySchedule: s.weeklySchedule || EMPTY_WEEKLY_SCHEDULE,
    timeSlots: deepClone(s.timeSlots || []),
    dateExceptions: deepClone(s.dateExceptions || []),
    operatingHoursStart: s.operatingHoursStart || '09:00',
    operatingHoursEnd: s.operatingHoursEnd || '17:00',
    timezone: s.timezone || 'UTC',
  }
}

export function cutoffFromBuffers(s) {
  return {
    cutoffMinutes: s.cutoffMinutes ?? 20,
    lastMinuteBookings: !!s.lastMinuteBookings,
    perSlotCutoff: !!s.perSlotCutoff,
    perSlotCutoffs: deepClone(s.perSlotCutoffs || {}),
  }
}

export function hasOptionData(option) {
  return !!(option && (option.pricing || option.availability || option.cutoff))
}

// Spread a materialized pricing object back onto the editor's top-level fields.
export function pricingBuffersFrom(p) {
  return {
    pricingModel: p?.pricingModel || 'perPerson',
    currency: p?.currency || 'USD',
    pricingApproach: p?.pricingApproach || 'dependsOnAge',
    uniformPrice: p?.uniformPrice ?? null,
    pricingCategories: (p?.pricingCategories || []).map((c) => ({ ...c, tiers: c.tiers || [] })),
    minParticipants: p?.minParticipants ?? 1,
    maxParticipants: p?.maxParticipants ?? 10,
    groupSizes: deepClone(p?.groupSizes || []),
    maxGroupsPerTimeSlot: p?.maxGroupsPerTimeSlot ?? 1,
    additionalPersonsEnabled: !!p?.additionalPersonsEnabled,
    additionalPersonPrice: p?.additionalPersonPrice ?? null,
  }
}

export function availabilityBuffersFrom(a) {
  return {
    scheduleType: a?.scheduleType || 'operatingHours',
    schedules: deepClone(a?.schedules || []),
    weeklySchedule: a?.weeklySchedule || EMPTY_WEEKLY_SCHEDULE,
    timeSlots: deepClone(a?.timeSlots || []),
    dateExceptions: deepClone(a?.dateExceptions || []),
    operatingHoursStart: a?.operatingHoursStart || '09:00',
    operatingHoursEnd: a?.operatingHoursEnd || '17:00',
    timezone: a?.timezone || 'UTC',
  }
}

export function cutoffBuffersFrom(c) {
  return {
    cutoffMinutes: c?.cutoffMinutes ?? 20,
    lastMinuteBookings: !!c?.lastMinuteBookings,
    perSlotCutoff: !!c?.perSlotCutoff,
    perSlotCutoffs: deepClone(c?.perSlotCutoffs || {}),
  }
}

// The product's primary / default option — the first in the list — or the
// product template when no options exist. Used to build the legacy top-level
// schedulesAndPricing projection.
export function primaryOptionData(state) {
  const options = Array.isArray(state.options) ? state.options : []
  return options.length > 0
    ? effectiveOptionData(state, options[0])
    : {
        pricing: pricingFromBuffers(state),
        availability: availabilityFromBuffers(state),
        cutoff: cutoffFromBuffers(state),
      }
}

// The data an option effectively sells with: its own stored data when it has
// some, otherwise the product-level template. The selected option always uses
// the live editor buffers so unsynced edits are never lost on save.
export function effectiveOptionData(state, option) {
  const isSelected = !!state.selectedOptionId && !!option && option.id === state.selectedOptionId
  const pricing = isSelected
    ? pricingFromBuffers(state)
    : (option?.pricing || state.pricingTemplate || pricingFromBuffers(state))
  const availability = isSelected
    ? availabilityFromBuffers(state)
    : (option?.availability || state.availabilityTemplate || availabilityFromBuffers(state))
  const cutoff = isSelected
    ? cutoffFromBuffers(state)
    : (option?.cutoff || state.cutoffTemplate || cutoffFromBuffers(state))
  return { pricing, availability, cutoff }
}
