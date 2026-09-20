import { stepSchemas } from './productFormSchema'
import {
  sumStopMinutes,
  productDurationMinutes,
  formatMinutes,
} from './utils/durationValidation'
import { validateScheduleObject } from './utils/pricingValidation'
import { isMultiDayTour } from './utils/itineraryConstants'

const STEP_FIELDS = {
  1: ['language'],
  2: ['title', 'referenceCode'],
  3: ['category', 'activitiesIncluded', 'transportModes', 'transportServices', 'difficulty', 'duration', 'durationUnit', 'accommodationIncluded'],
  4: ['shortDescription', 'fullDescription', 'highlights'],
  5: ['locations'],
  6: ['keywords', 'activitiesIncluded'],
  7: [
    'whatsIncluded',
    'whatsNotIncluded',
    'foodProvided',
    'meals',
    'drinksIncluded',
    'showDietaryRestrictions',
    'dietaryOptions',
  ],
  8: ['guideType', 'guideMaterials'],
  9: [
    'notSuitableFor',
    'notAllowed',
    'petFriendly',
    'wheelchairAccessible',
    'wifiIncluded',
    'mandatoryItems',
    'knowBeforeYouGo',
    'emergencyPhone',
    'voucherInfo',
  ],
  10: ['cancellationType', 'supplierCanCancelBadWeather', 'supplierCanCancelNotEnoughTravelers'],
  11: ['photos', 'copyrightConfirmed'],
  12: ['options'],
  13: [
    'meetingMode',
    'meetingPoint',
    'meetingPoints',
    'meetingPointPicture',
    'meetingPointDescription',
    'arrivalTimeType',
    'arrivalTimeCustom',
    'pickupType',
    'pickupDescription',
    'pickupTiming',
    'pickupFinalLocationTiming',
    'referenceStartTime',
    'pickupAreas',
    'pickupLocations',
    'pickupGeoshape',
    'dropoffOption',
    'dropoffLocation',
    'dropoffDescription',
  ],
  14: [],
  15: [],
  16: ['cutoffMinutes', 'lastMinuteBookings', 'perSlotCutoff', 'perSlotCutoffs'],
  17: [],
}

function pick(obj, keys) {
  const result = {}
  for (const key of keys) {
    if (key in obj) result[key] = obj[key]
  }
  return result
}

export function validateStep(stepIndex, formData) {
  const schema = stepSchemas[stepIndex]
  if (!schema) return {}

  const fields = STEP_FIELDS[stepIndex]
  if (!fields) return {}

  const partialData = pick(formData, fields)

  const result = schema.safeParse(partialData)
  const errors = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) errors[path] = []
      errors[path].push(issue.message)
    }
  }

  // Step 5: stop durations must not exceed the product duration set in
  // the category step.
  if (stepIndex === 5 && Array.isArray(formData.locations)) {
    const productMin = productDurationMinutes(formData.duration, formData.durationUnit)
    const stopsMin = sumStopMinutes(formData.locations)
    if (productMin != null && stopsMin > productMin) {
      const path = 'locations'
      const message = `Total stop time (${formatMinutes(stopsMin)}) exceeds the product duration (${formatMinutes(productMin)}). Reduce stop times or increase the product duration.`
      if (!errors[path]) errors[path] = []
      errors[path].push(message)
    }
  }

  // Step 7: when food is provided (single-day tours), each meal needs a type
  // and format. Multi-day tours manage meals per-day in dayLogistics instead,
  // so this rule is skipped for them to avoid false positives.
  if (stepIndex === 7 && formData.foodProvided && !isMultiDayTour(formData.duration, formData.durationUnit)) {
    const meals = Array.isArray(formData.meals) ? formData.meals : []
    if (meals.length === 0) {
      const path = 'meals'
      if (!errors[path]) errors[path] = []
      errors[path].push('Add at least one meal')
    } else {
      meals.forEach((meal, i) => {
        if (!meal || !String(meal.type || '').trim()) {
          const path = `meals.${i}.type`
          if (!errors[path]) errors[path] = []
          errors[path].push('Meal type is required')
        }
        if (!meal || !String(meal.format || '').trim()) {
          const path = `meals.${i}.format`
          if (!errors[path]) errors[path] = []
          errors[path].push('Meal format is required')
        }
      })
    }
  }

  // Step 13: require pickup time when pickupAtSpecificTime is true
  if (stepIndex === 13 && formData.pickupAtSpecificTime && formData.meetingMode === 'pickup') {
    if (formData.pickupType === 'area' && Array.isArray(formData.pickupAreas)) {
      formData.pickupAreas.forEach((area, i) => {
        if (!area.time || !area.time.trim()) {
          const path = `pickupAreas.${i}.time`
          if (!errors[path]) errors[path] = []
          errors[path].push('Pickup time is required')
        }
      })
    }
  }

  // Step 15: validate committed schedules across every option. The persisted
  // source of truth is each option's `availability.schedules[]` (plus the
  // top-level `schedules` buffer for the currently-selected option); the live
  // pricing/availability buffers are only an editor scratchpad and must not be
  // trusted here (a cancelled "Add schedule" leaves them reset while the
  // committed schedules remain intact).
  if (stepIndex === 15) {
    const options = Array.isArray(formData.options) ? formData.options : []
    const selectedId = formData.selectedOptionId
    const pushIssue = (path, message) => {
      if (!errors[path]) errors[path] = []
      errors[path].push(message)
    }

    const validateSchedules = (schedules, fallback, label) => {
      const list = Array.isArray(schedules) ? schedules : []
      if (list.length === 0) {
        pushIssue('schedules', label ? `Add at least one schedule for "${label}"` : 'Add at least one schedule')
        return
      }
      for (const schedule of list) {
        for (const issue of validateScheduleObject(schedule, fallback)) {
          pushIssue(issue.path.join('.'), issue.message)
        }
      }
    }

    if (selectedId && options.length > 0) {
      options.forEach((opt) => {
        const isSelected = opt?.id === selectedId
        const schedules = isSelected
          ? formData.schedules
          : (opt?.availability?.schedules ?? [])
        const fallback = isSelected ? formData : (opt?.pricing || {})
        validateSchedules(schedules, fallback, opt?.title || null)
      })
    } else {
      // No selection (e.g. legacy product or during draft rehydration) — the
      // top-level schedules buffer is the single source of truth.
      validateSchedules(formData.schedules, formData, null)
    }
  }

  return errors
}

export function isStepComplete(stepIndex, formData) {
  return Object.keys(validateStep(stepIndex, formData)).length === 0
}
