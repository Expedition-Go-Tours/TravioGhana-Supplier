import { z } from 'zod'
import {
  validatePricingCategories,
  validateGroupSizes,
  validateCapacity,
} from './utils/pricingValidation'

export const TITLE_MAX_CHARS = 60
export const REFERENCE_CODE_MAX_CHARS = 20
export const SHORT_DESCRIPTION_MAX_CHARS = 200
export const FULL_DESCRIPTION_MAX_CHARS = 3000
export const HIGHLIGHT_MAX_CHARS = 80
export const INCLUSION_ITEM_MAX_CHARS = 100
export const EXTRA_INFO_TAG_MAX_CHARS = 50
export const KNOW_BEFORE_YOU_GO_MAX_CHARS = 2000
export const VOUCHER_INFO_MAX_CHARS = 500
export const MEETING_POINT_DESCRIPTION_MAX_CHARS = 200
export const PICKUP_DESCRIPTION_MAX_CHARS = 200

export function limitMessage(max) {
  return `You've reached the ${max} character limit.`
}

export const locationSchema = z.object({
  day: z.number().optional(),
  name: z.string().min(1, 'Location name is required').max(200),
  address: z.string().max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).nullish(),
  lng: z.coerce.number().min(-180).max(180).nullish(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  timeSpent: z.number().nullable().optional(),
  timeSpentUnit: z.enum(['minutes', 'hours']).optional(),
  admissionIncluded: z.enum(['yes', 'no', 'passby']).optional(),
  isDropoff: z.boolean().optional(),
  isPickup: z.boolean().optional(),
})

export const locationPointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  lat: z.number(),
  lng: z.number(),
})

export const productOptionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Option title is required'),
  refCode: z.string().optional(),
  description: z.string().optional(),
  isPrivate: z.boolean(),
  skipTheLine: z.enum([
    'none',
    'skip_tickets',
    'separate_entrance',
    'express_security',
    'express_elevators',
  ]),
  wheelchairAccessible: z.boolean().catch(false),
  audioGuide: z.boolean().optional(),
  infoBooklet: z.boolean().optional(),
  maxGroupSize: z.number().nullable().optional(),
  validityType: z.enum(['open_ended', 'date_picked', 'period', 'from_activation']).optional(),
  validity: z.number().nullable(),
  validityUnit: z.enum(['hours', 'days', 'weeks', 'months']).nullable(),
  validityStartDate: z.string().optional(),
  validityEndDate: z.string().optional(),
})

export const attractionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Attraction name is required'),
  location: z.string().optional(),
  description: z.string().optional(),
  timeSpent: z.number().nullable(),
  timeSpentUnit: z.enum(['minutes', 'hours']),
  admissionIncluded: z.enum(['yes', 'no', 'passby']),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

export const stepSchemas = {
   1: z.object({
     language: z.string().min(1, 'Select a language'),
   }),
  2: z.object({
      title: z.string().min(1, 'Title is required').max(TITLE_MAX_CHARS, `Title must be ${TITLE_MAX_CHARS} characters or fewer`),
      referenceCode: z.string().max(REFERENCE_CODE_MAX_CHARS, `Reference code must be ${REFERENCE_CODE_MAX_CHARS} characters or fewer`).optional(),
    }),
    3: z.object({
      category: z.enum(['tour', 'activity', 'transport'], { errorMap: () => ({ message: 'Select a product type' }) }),
      activitiesIncluded: z.array(z.string()).optional(),
      transportModes: z.array(z.string()).optional(),
      transportServices: z.array(z.string()).optional(),
      difficulty: z.string().min(1, 'Select a difficulty level'),
      duration: z.number({ invalid_type_error: 'Duration is required' }).min(0.5, 'Duration must be at least 0.5').nullable().optional(),
      durationUnit: z.enum(['minutes', 'hours', 'days']).optional(),
      accommodationIncluded: z.boolean().optional(),
    }).superRefine((data, ctx) => {
      // Conditional validation: require category-specific fields based on product type
      if (data.category === 'tour' && (!data.transportModes || data.transportModes.length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['transportModes'],
          message: 'Select at least one mode of transportation',
        })
      }
      if (data.category === 'activity' && (!data.activitiesIncluded || data.activitiesIncluded.length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['activitiesIncluded'],
          message: 'Select at least one activity',
        })
      }
      if (data.category === 'transport' && (!data.transportServices || data.transportServices.length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['transportServices'],
          message: 'Select at least one transportation service',
        })
      }

      // Require accommodationIncluded when duration >= 24 hours
      if (data.duration != null && data.durationUnit) {
        const durationInHours = data.durationUnit === 'days' ? data.duration * 24
          : data.durationUnit === 'hours' ? data.duration
          : data.duration / 60;
        if (durationInHours >= 24 && data.accommodationIncluded === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['accommodationIncluded'],
            message: 'Accommodation inclusion is required for tours 24 hours or longer',
          })
        }
      }
    }),
  4: z.object({
    shortDescription: z
      .string()
      .min(10, 'Short description must be at least 10 characters')
      .max(SHORT_DESCRIPTION_MAX_CHARS, 'Short description must be at most 200 characters'),
    fullDescription: z
      .string()
      .min(500, 'Full description must be at least 500 characters')
      .max(FULL_DESCRIPTION_MAX_CHARS, 'Full description must be at most 3000 characters'),
    highlights: z
      .array(z.string().min(1).max(HIGHLIGHT_MAX_CHARS, 'Each highlight must be 80 characters or fewer'))
      .min(3, 'Add at least 3 highlights')
      .max(5, 'Maximum 5 highlights'),
  }),
  5: z.object({
    locations: z
      .array(locationSchema)
      .min(1, 'Add at least one location'),
  }),
   6: z.object({
    keywords: z.array(z.string()).max(15, 'Maximum 15 keywords'),
    activitiesIncluded: z.array(z.string()).optional(),
  }),
   7: z.object({
    whatsIncluded: z.array(z.string().max(INCLUSION_ITEM_MAX_CHARS, `Each inclusion must be ${INCLUSION_ITEM_MAX_CHARS} characters or fewer`)).optional(),
    whatsNotIncluded: z.array(z.string().max(INCLUSION_ITEM_MAX_CHARS, `Each exclusion must be ${INCLUSION_ITEM_MAX_CHARS} characters or fewer`)).optional(),
    foodProvided: z.boolean(),
    meals: z.array(z.object({
      type: z.string().optional(),
      format: z.string().optional(),
    })).optional(),
    drinksIncluded: z.boolean().optional(),
    showDietaryRestrictions: z.boolean().optional(),
    dietaryOptions: z.array(z.string()).optional(),
  }),
  8: z.object({
    guideType: z.enum(['tour-guide', 'driver', 'host', 'greeter', 'self-guided', 'instructor']),
    guideMaterials: z.object({
      audioGuide: z.boolean(),
      infoBooklet: z.boolean(),
    }),
  }),
  9: z.object({
    notSuitableFor: z.array(z.string().max(EXTRA_INFO_TAG_MAX_CHARS, `Each item must be ${EXTRA_INFO_TAG_MAX_CHARS} characters or fewer`)).optional(),
    notAllowed: z.array(z.string().max(EXTRA_INFO_TAG_MAX_CHARS, `Each item must be ${EXTRA_INFO_TAG_MAX_CHARS} characters or fewer`)).optional(),
    petFriendly: z.boolean().optional(),
    wheelchairAccessible: z.boolean().catch(false),
    mandatoryItems: z.array(z.string().max(EXTRA_INFO_TAG_MAX_CHARS, `Each item must be ${EXTRA_INFO_TAG_MAX_CHARS} characters or fewer`)).optional(),
    knowBeforeYouGo: z.string().max(KNOW_BEFORE_YOU_GO_MAX_CHARS, `Know before you go must be ${KNOW_BEFORE_YOU_GO_MAX_CHARS} characters or fewer`).optional(),
    emergencyPhone: z.string()
      .refine((val) => !val || /^\+[1-9]\d{2,14}$/.test(val), 'Enter a complete phone number with country code')
      .optional(),
    voucherInfo: z.string().max(VOUCHER_INFO_MAX_CHARS, `Voucher info must be ${VOUCHER_INFO_MAX_CHARS} characters or fewer`).optional(),
  }),
  10: z.object({
    cancellationType: z.enum(['standard', 'all_sales_final'], {
      errorMap: () => ({ message: 'Select a cancellation policy' }),
    }),
    supplierCanCancelBadWeather: z.boolean().optional(),
    supplierCanCancelNotEnoughTravelers: z.boolean().optional(),
  }),
  11: z.object({
    photos: z
      .array(z.object({ id: z.string(), url: z.string() }))
      .min(5, 'Upload at least 5 photos'),
    copyrightConfirmed: z.literal(true, {
      message: 'You must confirm copyright ownership',
    }),
  }),
  12: z.object({
    options: z
      .array(productOptionSchema)
      .min(1, 'Add at least one option'),
  }),
  13: z.object({
    meetingMode: z.enum(['meeting_point', 'pickup', 'none']),
    meetingPoint: locationPointSchema.nullable().optional(),
    meetingPoints: z.array(locationPointSchema).optional(),
    meetingPointPicture: z.string().optional(),
    meetingPointDescription: z.string().max(MEETING_POINT_DESCRIPTION_MAX_CHARS, limitMessage(MEETING_POINT_DESCRIPTION_MAX_CHARS)).optional(),
    arrivalTimeType: z.enum(['none', '5min', '10min', '15min', '20min', '25min', '30min', 'notified', 'custom']).optional(),
    arrivalTimeCustom: z.string().optional(),
    pickupType: z.enum(['area', 'address']).optional(),
    pickupDescription: z.string().max(PICKUP_DESCRIPTION_MAX_CHARS, limitMessage(PICKUP_DESCRIPTION_MAX_CHARS)).optional(),
    pickupTiming: z.enum(['at_start', 'before_start']).optional(),
    pickupFinalLocationTiming: z.enum(['day_before', 'after_selection']).optional(),
    referenceStartTime: z.string().optional(),
    pickupAreas: z.array(z.object({
      name: z.string().min(1, 'Pickup area name is required'),
      time: z.string().optional(),
      address: z.string().optional(),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
      radiusKm: z.number().min(0.5).max(100).optional().default(1),
      polygon: z.array(z.tuple([z.number(), z.number()])).min(3).optional(),
      exclusions: z.array(z.array(z.tuple([z.number(), z.number()])).min(3)).optional(),
    })).optional(),
    pickupLocations: z.array(locationPointSchema).optional(),
    pickupGeoshape: z.any().nullable().optional(),
    planPickupTimes: z.boolean().optional(),
    pickupStartTime: z.string().optional(),
    dropoffOption: z.enum(['same_location', 'different_location', 'customer_preferred', 'none', 'service']).optional(),
    dropoffLocation: locationPointSchema.nullable().optional(),
    dropoffDescription: z.string().optional(),
  }),
  14: z.object({}),
  15: z.object({
    pricingModel: z.enum(['perPerson', 'perGroup'], {
      errorMap: () => ({ message: 'Select a pricing model' }),
    }),
    currency: z.string().min(1, 'Select a currency'),
    scheduleType: z.enum(['fixedTimeSlot', 'operatingHours']),
    schedules: z.array(z.any()).min(1, 'Add at least one schedule'),
    pricingApproach: z.any().optional(),
    pricingCategories: z.any().optional(),
    uniformPrice: z.any().nullable().optional(),
    groupSizes: z.any().optional(),
    timeSlots: z.array(z.object({ startTime: z.string(), endTime: z.string().optional() })).optional(),
    minParticipants: z.any().optional(),
    maxParticipants: z.any().optional(),
    maxGroupsPerTimeSlot: z.any().optional(),
  }).superRefine((data, ctx) => {
    const add = (issue) => {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
    }

    if (data.pricingModel === 'perPerson') {
      if (data.pricingApproach === 'sameForEveryone') {
        if (data.uniformPrice == null || data.uniformPrice <= 0) {
          add({ path: ['uniformPrice'], message: 'Enter a price per person' })
        }
      }
      if (data.pricingApproach === 'dependsOnAge') {
        validatePricingCategories(data.pricingCategories).forEach(add)
      }
    }
    if (data.pricingModel === 'perGroup') {
      validateGroupSizes(data.groupSizes).forEach(add)
    }
    if (data.scheduleType === 'fixedTimeSlot') {
      if (!Array.isArray(data.timeSlots) || data.timeSlots.length === 0) {
        add({ path: ['timeSlots'], message: 'Add at least one time slot' })
      }
    }
    validateCapacity(data).forEach(add)
  }),
  16: z.object({
    cutoffMinutes: z.number().min(0, 'Select a cut-off time'),
    lastMinuteBookings: z.boolean().optional(),
    perSlotCutoff: z.boolean().optional(),
    perSlotCutoffs: z.record(z.string(), z.number().min(0).max(600)).optional(),
  }),
}
