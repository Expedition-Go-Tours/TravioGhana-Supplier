/**
 * Shared pricing & availability validation rules.
 *
 * Single source of truth for the Pricing & Availability step (wizard step 16).
 * Both the step-level zod schema (`productFormSchema.js`) and the schedule
 * wizard sub-steps (`Step14PricingAvailability.jsx`) consume these helpers so
 * they can never disagree — a schedule that fails the wizard is guaranteed to
 * fail the footer/submit validation the same way (and vice-versa).
 *
 * Every helper returns an array of `{ path, message }` issues where `path` is
 * an array of segments (string | number) matching zod's `ctx.addIssue` path.
 */

export function hasAnyWeeklyHours(weeklySchedule) {
  return Object.values(weeklySchedule || {}).some((hours) => Array.isArray(hours) && hours.length > 0)
}

/**
 * True when the availability buffers hold any schedule data (opening hours,
 * time slots, date exceptions, or saved schedules) that a mode switch would
 * destroy. Shared by the schedule-type and pricing-model confirm flows.
 */
export function hasScheduleData(state) {
  if (Array.isArray(state?.schedules) && state.schedules.length > 0) return true
  if (hasAnyWeeklyHours(state?.weeklySchedule)) return true
  if (Array.isArray(state?.timeSlots) && state.timeSlots.length > 0) return true
  if (Array.isArray(state?.dateExceptions) && state.dateExceptions.length > 0) return true
  return false
}

/**
 * True when any pricing (or saved-schedule) data exists that a mode switch
 * would destroy. Mirrors GetYourGuide's per-option pricing decisions: per
 * person uses uniform/category prices, per group uses group-size prices.
 */
export function hasPricingData(state) {
  if (Array.isArray(state?.schedules) && state.schedules.length > 0) return true
  if (state?.pricingModel === 'perGroup') {
    return Array.isArray(state.groupSizes) && state.groupSizes.some((g) => g?.price != null)
  }
  if (state?.uniformPrice != null) return true
  return Array.isArray(state?.pricingCategories) && state.pricingCategories.some((c) => c?.price != null)
}

function overlaps(a, b) {
  return a.minAge <= b.maxAge && b.minAge <= a.maxAge
}

/**
 * Returns the index of the first category whose age band would overlap the
 * proposed band for `index`, or `null` when the proposal is conflict-free.
 * Used to block an invalid maxAge selection before it is committed.
 *
 * @param {Array<{minAge?:number,maxAge?:number}>} categories
 * @param {number} index
 * @param {{minAge?:number,maxAge?:number}} proposed
 * @returns {number|null}
 */
export function getAgeOverlap(categories, index, proposed) {
  if (!Array.isArray(categories)) return null
  const target = categories[index]
  if (!target) return null
  // ID-required categories (e.g. Student) intentionally overlap their base
  // category (e.g. Adult) — they are a sub-selection of an already-permitted
  // age band, not a competing band, so they never conflict.
  if (target.idRequired === true) return null
  const band = {
    minAge: proposed.minAge ?? target.minAge,
    maxAge: proposed.maxAge ?? target.maxAge,
  }
  for (let i = 0; i < categories.length; i++) {
    if (i === index) continue
    const other = categories[i]
    if (!other) continue
    if (other.idRequired === true) continue
    if (overlaps(band, other)) return i
  }
  return null
}

/**
 * Validates the tier bands of a single pricing category.
 *
 * @param {{tiers?:Array<{from?:number,to?:number,pricePerPerson?:number}>}} cat
 * @returns {Array<{path:(string|number)[],message:string}>} issues whose paths
 *   are relative to the category (e.g. ['tiers', 0, 'pricePerPerson']).
 */
export function validateTiers(cat) {
  const issues = []
  const tiers = Array.isArray(cat?.tiers) ? cat.tiers : []
  if (tiers.length === 0) return issues

  tiers.forEach((tier, ti) => {
    if (ti === 0 && (tier.from == null || tier.to == null)) {
      issues.push({
        path: ['tiers', ti, 'to'],
        message: 'Set the maximum group size for the first people group (e.g. 1)',
      })
    }

    if (tier.from != null && (tier.pricePerPerson == null || Number.isNaN(tier.pricePerPerson))) {
      issues.push({ path: ['tiers', ti, 'pricePerPerson'], message: 'Enter a price for this tier' })
    } else if (typeof tier.pricePerPerson === 'number' && tier.pricePerPerson < 0) {
      issues.push({ path: ['tiers', ti, 'pricePerPerson'], message: 'Price must be 0 or greater' })
    }

    if (tier.from == null || tier.to == null) return

    if (tier.to < tier.from) {
      issues.push({ path: ['tiers', ti, 'to'], message: 'Max must be greater than or equal to min' })
    }
    if (ti === 0 && tier.from !== 1) {
      issues.push({ path: ['tiers', ti, 'from'], message: 'First tier must start at 1' })
    }
    if (ti > 0) {
      const prevTier = tiers[ti - 1]
      if (prevTier && prevTier.to != null && tier.from !== prevTier.to + 1) {
        issues.push({ path: ['tiers', ti, 'from'], message: 'Tiers must be sequential without gaps' })
      }
    }
  })

  return issues
}

/**
 * Validates a list of per-person pricing categories: names, age bands,
 * overlaps (symmetric — reported on both conflicting categories), prices and
 * per-tier prices.
 *
 * @param {Array} categories
 * @param {{withPrices?:boolean}} [options] Set `withPrices: false` when the
 *   caller only cares about the category shape (name / age / overlap) and
 *   prices are configured in a later step.
 * @returns {Array<{path:(string|number)[],message:string}>}
 */
export function validatePricingCategories(categories, { withPrices = true } = {}) {
  const issues = []
  if (!Array.isArray(categories) || categories.length === 0) {
    if (withPrices) issues.push({ path: ['pricingCategories'], message: 'Add at least one pricing category' })
    return issues
  }

  const cats = categories.map((c, i) => ({ ...c, __index: i }))

  for (const cat of cats) {
    const i = cat.__index
    const name = String(cat.name || '').trim()
    if (!name) {
      issues.push({ path: ['pricingCategories', i, 'name'], message: 'Enter a category name' })
    }
    if (cat.minAge == null || cat.maxAge == null) {
      issues.push({ path: ['pricingCategories', i, 'maxAge'], message: 'Set an age range for this category' })
    } else if (cat.maxAge <= cat.minAge) {
      issues.push({ path: ['pricingCategories', i, 'maxAge'], message: 'Max age must be greater than min age' })
    }
    if (withPrices) {
      const isFree = cat.ticketNotRequired === true
      if (cat.price == null && !isFree) {
        issues.push({ path: ['pricingCategories', i, 'price'], message: 'Enter a price for this category' })
      } else if (typeof cat.price === 'number' && cat.price < 0) {
        issues.push({ path: ['pricingCategories', i, 'price'], message: 'Price must be 0 or greater' })
      }
    }
    if (withPrices) {
      for (const iss of validateTiers(cat)) {
        issues.push({ path: ['pricingCategories', i, ...iss.path], message: iss.message })
      }
    }
  }

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      // ID-required categories (e.g. Student) intentionally overlap their base
      // category and are excluded from the overlap check.
      if (cats[i].idRequired === true || cats[j].idRequired === true) continue
      if (!overlaps(cats[i], cats[j])) continue
      const a = cats[i]
      const b = cats[j]
      const aName = String(a.name || '').trim() || 'This category'
      const bName = String(b.name || '').trim() || 'the other category'
      issues.push({
        path: ['pricingCategories', i, 'maxAge'],
        message: `Age range overlaps with "${bName}" (${b.minAge}-${b.maxAge})`,
      })
      issues.push({
        path: ['pricingCategories', j, 'maxAge'],
        message: `Age range overlaps with "${aName}" (${a.minAge}-${a.maxAge})`,
      })
    }
  }

  return issues
}

/**
 * Validates per-group pricing bands.
 *
 * @param {Array} groupSizes
 * @returns {Array<{path:(string|number)[],message:string}>}
 */
export function validateGroupSizes(groupSizes) {
  const issues = []
  if (!Array.isArray(groupSizes) || groupSizes.length === 0) {
    issues.push({ path: ['groupSizes'], message: 'Add at least one group size' })
    return issues
  }

  groupSizes.forEach((gs, i) => {
    if (gs.price == null || gs.price <= 0) {
      issues.push({ path: ['groupSizes', i, 'price'], message: 'Enter a price for this group size' })
    }
    if (gs.from > gs.to) {
      issues.push({ path: ['groupSizes', i, 'to'], message: 'Max must be greater than or equal to min' })
    }
  })

  const sorted = [...groupSizes].sort((a, b) => (a.from ?? 0) - (b.from ?? 0))
  if (sorted.length > 0 && sorted[0].from !== 1) {
    const idx = groupSizes.indexOf(sorted[0])
    issues.push({ path: ['groupSizes', idx, 'from'], message: 'First group size must start at 1' })
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from <= sorted[i - 1].to) {
      const idx = groupSizes.indexOf(sorted[i])
      issues.push({
        path: ['groupSizes', idx, 'from'],
        message: `Group sizes must not overlap ("${sorted[i - 1].from}-${sorted[i - 1].to}" → "${sorted[i].from}")`,
      })
    }
  }

  return issues
}

/**
 * Validates participant capacity fields.
 *
 * @param {{minParticipants?:number,maxParticipants?:number,maxGroupsPerTimeSlot?:number,pricingModel?:string}} state
 * @returns {Array<{path:(string|number)[],message:string}>}
 */
export function validateCapacity(state) {
  const { minParticipants, maxParticipants, maxGroupsPerTimeSlot, pricingModel } = state || {}
  const issues = []

  if (pricingModel === 'perGroup') {
    if (maxGroupsPerTimeSlot == null || maxGroupsPerTimeSlot < 1) {
      issues.push({ path: ['maxGroupsPerTimeSlot'], message: 'Enter a maximum number of groups' })
    }
  } else {
    if (minParticipants == null || minParticipants < 1) {
      issues.push({ path: ['minParticipants'], message: 'Enter a minimum number' })
    }
    if (maxParticipants == null || maxParticipants < 1) {
      issues.push({ path: ['maxParticipants'], message: 'Enter a maximum number' })
    }
    if (minParticipants != null && maxParticipants != null && minParticipants > maxParticipants) {
      issues.push({ path: ['minParticipants'], message: 'Min must be less than or equal to max' })
    }
  }

  return issues
}

/**
 * Validates the schedule basics (name, dates, time slots / opening hours).
 *
 * @param {object} state
 * @returns {Array<{path:(string|number)[],message:string}>}
 */
export function validateScheduleBasics(state) {
  const {
    scheduleName, scheduleStartDate, scheduleHasEndDate, scheduleEndDate,
    scheduleType, timeSlots, weeklySchedule,
  } = state || {}
  const issues = []

  if (!scheduleName || !String(scheduleName).trim()) {
    issues.push({ path: ['scheduleName'], message: 'Name your schedule' })
  }
  if (!scheduleStartDate) {
    issues.push({ path: ['scheduleStartDate'], message: 'Select a starting date' })
  }
  if (scheduleHasEndDate && !scheduleEndDate) {
    issues.push({ path: ['scheduleEndDate'], message: 'Select an end date' })
  }
  if (scheduleHasEndDate && scheduleStartDate && scheduleEndDate &&
      new Date(scheduleEndDate) < new Date(scheduleStartDate)) {
    issues.push({ path: ['scheduleEndDate'], message: 'End date must be on or after the starting date' })
  }
  if (scheduleType === 'fixedTimeSlot') {
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      issues.push({ path: ['timeSlots'], message: 'Add at least one time slot' })
    }
  } else if (!hasAnyWeeklyHours(weeklySchedule)) {
    issues.push({ path: ['weeklySchedule'], message: 'Add at least one opening hours entry' })
  }

  return issues
}

/**
 * Runs the price-related rules for the whole step (used to derive the wizard
 * sub-step and the top-level schema). Kept as a convenience wrapper.
 */
export function validateStep16Pricing(state) {
  const { pricingModel, pricingApproach } = state || {}
  const issues = []

  if (pricingModel === 'perPerson' && pricingApproach === 'sameForEveryone') {
    if (state.uniformPrice == null || state.uniformPrice <= 0) {
      issues.push({ path: ['uniformPrice'], message: 'Enter a price per person' })
    }
  } else if (pricingModel === 'perGroup') {
    issues.push(...validateGroupSizes(state.groupSizes))
  } else if (pricingModel === 'perPerson' && pricingApproach === 'dependsOnAge') {
    issues.push(...validatePricingCategories(state.pricingCategories))
  }

  return issues
}
