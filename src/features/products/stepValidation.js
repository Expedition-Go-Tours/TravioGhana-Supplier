import { stepSchemas } from './productFormSchema'
import {
  sumStopMinutes,
  productDurationMinutes,
  formatMinutes,
} from './utils/durationValidation'

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
  15: [
    'pricingModel',
    'currency',
    'scheduleType',
    'schedules',
    'pricingApproach',
    'pricingCategories',
    'uniformPrice',
    'groupSizes',
    'timeSlots',
    'minParticipants',
    'maxParticipants',
    'maxGroupsPerTimeSlot',
    'additionalPersonsEnabled',
    'additionalPersonPrice',
  ],
  16: ['cutoffMinutes', 'lastMinuteBookings', 'perSlotCutoff', 'perSlotCutoffs'],
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

  return errors
}

export function isStepComplete(stepIndex, formData) {
  return Object.keys(validateStep(stepIndex, formData)).length === 0
}
