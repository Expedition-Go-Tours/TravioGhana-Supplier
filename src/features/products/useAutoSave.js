import { useEffect, useRef } from 'react'
import { useProductBuilderStore } from './productBuilderStore'
import { createProduct, updateProduct } from './api'
import {
  effectiveOptionData,
  primaryOptionData,
  pricingBuffersFrom,
  availabilityBuffersFrom,
  cutoffBuffersFrom,
  sortLocationsByDay,
} from './optionData'
import { hasAnyWeeklyHours } from './utils/pricingValidation'
import { safeId } from '@/lib/utils'

function normalizeLocationPoint(loc) {
  if (!loc || typeof loc !== 'object') return null
  if (loc.lat == null || loc.lng == null) return null
  if (!loc.name || !loc.address) return null
  return loc
}

function cleanCategories(cats) {
  if (!Array.isArray(cats)) return []
  return cats.map(c => {
    const clean = { ...c }
    if (clean.notAllowed) {
      clean.price = null
      clean.tiers = []
    }
    if (clean.ticketNotRequired) {
      clean.tiers = []
    }
    return clean
  })
}

function buildSchedulesAndPricing(state) {
  const { pricing, availability } = primaryOptionData(state)
  const schedules = Array.isArray(availability.schedules) ? availability.schedules : []
  const topCats = Array.isArray(pricing.pricingCategories) ? pricing.pricingCategories : []
  const topAgeGroups = topCats.map(c => ({ label: c.name, minAge: c.minAge, maxAge: c.maxAge }))
  const weekly = hasAnyWeeklyHours(availability.weeklySchedule)
    ? availability.weeklySchedule
    : (hasAnyWeeklyHours(schedules[0]?.weeklySchedule) ? schedules[0].weeklySchedule : (availability.weeklySchedule || {}))
  const activeDays = Object.entries(weekly)
    .filter(([, slots]) => Array.isArray(slots) && slots.length > 0)
    .map(([day]) => day)
  return {
    travelerDetails: {
      pricingModel: pricing.pricingModel || 'perPerson',
      pricingApproach: pricing.pricingApproach || 'dependsOnAge',
      uniformPrice: pricing.uniformPrice ?? null,
      pricingCategories: topCats,
      ageGroups: topAgeGroups,
      minParticipants: pricing.minParticipants ?? null,
      maxParticipants: pricing.maxParticipants ?? null,
      groupSizes: Array.isArray(pricing.groupSizes) ? pricing.groupSizes : [],
      additionalPersonsEnabled: !!pricing.additionalPersonsEnabled,
      additionalPersonPrice: pricing.additionalPersonPrice ?? null,
      maxGroupsPerTimeSlot: pricing.maxGroupsPerTimeSlot ?? 1,
    },
    pricingSchedules: {
      currency: pricing.currency || 'USD',
      schedules: schedules.length > 0
        ? schedules.map((s, idx) => {
            const cat = Array.isArray(s.pricingCategories) && s.pricingCategories.length > 0
              ? s.pricingCategories
              : topCats
            const scheduleHasHours = hasAnyWeeklyHours(s.weeklySchedule)
            const aggregateHasHours = hasAnyWeeklyHours(weekly)
            const weeklySchedule = idx === 0 && (schedules.length === 1 || !scheduleHasHours)
              ? (aggregateHasHours ? weekly : null)
              : (s.weeklySchedule || weekly || null)
            return {
              name: s.name || '',
              type: s.type || availability.scheduleType || 'fixedTimeSlot',
              startDate: s.startDate || '',
              hasEndDate: !!s.hasEndDate,
              endDate: s.hasEndDate ? (s.endDate || '') : null,
              weeklySchedule,
              dateExceptions: (Array.isArray(s.dateExceptions) ? s.dateExceptions : [])
                .filter(ex => ex.date && ex.date.trim())
                .map(ex => {
                  const clean = { ...ex }
                  if (clean.type === 'closed') {
                    clean.overrideTimes = []
                  } else if (clean.type === 'override') {
                    clean.overrideTimes = (clean.overrideTimes || [])
                      .map(t => typeof t === 'string' ? t : `${t.startTime}-${t.endTime}`)
                      .filter(Boolean)
                    if (clean.overrideTimes.length === 0) clean.type = 'closed'
                  } else {
                    clean.overrideTimes = (clean.overrideTimes || [])
                      .map(t => typeof t === 'string' ? t : `${t.startTime}-${t.endTime}`)
                  }
                  return clean
                }),
              timeSlots: (Array.isArray(s.timeSlots) ? s.timeSlots : []).map(t => typeof t === 'string' ? { id: safeId(), startTime: t, endTime: '' } : { ...t, startTime: t.startTime, endTime: t.endTime || '' }),
              pricingModel: s.pricingModel || pricing.pricingModel || 'perPerson',
              currency: s.currency || pricing.currency || 'USD',
              pricingApproach: s.pricingApproach || pricing.pricingApproach || 'dependsOnAge',
              uniformPrice: s.uniformPrice ?? pricing.uniformPrice ?? null,
              pricingCategories: cleanCategories(cat),
              prices: cleanCategories(cat).filter(c => c.price != null && !c.notAllowed && !c.ticketNotRequired).map(c => ({ ageGroup: c.name, retailPrice: c.price })),
              minParticipants: s.minParticipants ?? pricing.minParticipants ?? null,
              maxParticipants: s.maxParticipants ?? pricing.maxParticipants ?? null,
            }
          })
        : [],
    },
    availability: {
      scheduleType: availability.scheduleType || 'operatingHours',
      operatingHoursStart: availability.operatingHoursStart || '09:00',
      operatingHoursEnd: availability.operatingHoursEnd || '17:00',
      weeklySchedule: weekly || null,
      timeSlots: (Array.isArray(availability.timeSlots) && availability.timeSlots.length > 0
        ? availability.timeSlots
        : (Array.isArray(schedules[0]?.timeSlots) ? schedules[0].timeSlots : [])
      ).map(t => typeof t === 'string' ? { id: safeId(), startTime: t, endTime: '' } : { ...t, startTime: t.startTime, endTime: t.endTime || '' }),
      daysOfWeek: activeDays,
      startDate: schedules.length > 0 ? (schedules[0].startDate || '') : '',
      endDate: schedules.length > 0 && schedules[0].hasEndDate ? (schedules[0].endDate || null) : null,
      timezone: availability.timezone || 'UTC',
    },
  }
}

export function buildPayload(state) {

  const outgoingPhotos = (state.photos || []).map((p) => (typeof p === 'string' ? p : p.url || '')).filter(Boolean)

  const options = Array.isArray(state.options) ? state.options : []
  const optionPayload = options.map((o) => {
    const { pricing, availability, cutoff } = effectiveOptionData(state, o)
    return { ...o, pricing, availability, cutoff, wheelchairAccessible: false }
  })

  const primary = primaryOptionData(state)
  const topLevelOverrides = options.length > 0
    ? {
        ...pricingBuffersFrom(primary.pricing),
        ...availabilityBuffersFrom(primary.availability),
        ...cutoffBuffersFrom(primary.cutoff),
      }
    : {}

  const rawAttractions = state.attractions || []
  const normalizedAttractions = rawAttractions.map((a) => (typeof a === 'string'
    ? { id: a, name: a, location: '', description: '', timeSpent: null, timeSpentUnit: 'minutes', admissionIncluded: 'no' }
    : a))

  const payload = {
    ...state,
    ...topLevelOverrides,
    description: state.fullDescription || '',
    shortSummary: state.shortDescription || '',
    highlights: (state.highlights || []).filter(Boolean),
    locations: sortLocationsByDay(state.locations || []),
    attractions: normalizedAttractions,
    photos: outgoingPhotos,
    ...(outgoingPhotos.length > 0 ? { existingPhotos: outgoingPhotos } : {}),
    meetingPoint: normalizeLocationPoint(state.meetingPoint),
    meetingPoints: Array.isArray(state.meetingPoints)
      ? state.meetingPoints.map(normalizeLocationPoint).filter(Boolean)
      : [],
    dropoffLocation: normalizeLocationPoint(state.dropoffLocation),
    options: optionPayload,
    schedulesAndPricing: buildSchedulesAndPricing(state),
  }

  // --- BEGIN: flatten nested blobs into flat builder keys backend expects ---
  // Categorization
  if (payload.categorization && typeof payload.categorization === 'object') {
    const c = payload.categorization
    payload.category = c.category ?? payload.category
    payload.subcategory = c.subcategory ?? payload.subcategory
    payload.activityType = c.activityType ?? payload.activityType
    payload.difficulty = c.difficulty ?? payload.difficulty
    if (c.duration && typeof c.duration === 'object') {
      payload.duration = c.duration.value ?? payload.duration
      payload.durationUnit = c.duration.unit ?? payload.durationUnit
    }
    payload.transportMode = c.transportMode ?? payload.transportMode
    payload.transportModes = Array.isArray(c.transportModes) ? c.transportModes : payload.transportModes
    payload.transportServices = Array.isArray(c.transportServices) ? c.transportServices : payload.transportServices
    payload.accommodationIncluded = c.accommodationIncluded ?? payload.accommodationIncluded
  }

  // Product content
  if (payload.productContent && typeof payload.productContent === 'object') {
    const p = payload.productContent
    payload.language = p.writingLanguage ?? payload.language
    payload.shortDescription = p.shortSummary ?? payload.shortDescription
    payload.highlights = Array.isArray(p.highlights) ? p.highlights : payload.highlights
    payload.locations = Array.isArray(p.locations) ? p.locations : payload.locations
    payload.attractions = Array.isArray(p.attractions)
      ? p.attractions.map((a) => (typeof a === 'string'
          ? { id: a, name: a, location: '', description: '', timeSpent: null, timeSpentUnit: 'minutes', admissionIncluded: 'no' }
          : a))
      : payload.attractions
    payload.meals = Array.isArray(p.meals) ? p.meals : payload.meals
    payload.mealType = p.mealType ?? payload.mealType
    payload.dayLogistics = p.dayLogistics ?? payload.dayLogistics
    payload.meetingPoint = p.meetingPoint ?? payload.meetingPoint
    payload.meetingPoints = Array.isArray(p.meetingPoints) ? p.meetingPoints : payload.meetingPoints
    payload.meetingPointPicture = p.meetingPointPicture ?? payload.meetingPointPicture
    payload.arrivalTime = p.arrivalTime ?? payload.arrivalTime
    payload.whatsIncluded = Array.isArray(p.included) ? p.included : payload.whatsIncluded
    payload.whatsNotIncluded = Array.isArray(p.excluded) ? p.excluded : payload.whatsNotIncluded
    payload.guideType = p.guideType ?? payload.guideType
    payload.guideMaterials = p.guideMaterials ?? payload.guideMaterials
    payload.pickupType = p.pickupType ?? payload.pickupType
    payload.pickupProvided = p.pickupProvided ?? payload.pickupProvided
    payload.dropoffOption = p.dropoffOption ?? payload.dropoffOption
  }

  // Booking & tickets
  if (payload.bookingAndTickets && typeof payload.bookingAndTickets === 'object') {
    const b = payload.bookingAndTickets
    payload.pickupType = b.pickupType ?? payload.pickupType
    payload.pickupProvided = b.pickupProvided ?? payload.pickupProvided
    payload.pickupAreas = Array.isArray(b.pickupAreas) ? b.pickupAreas : payload.pickupAreas
    payload.dropoffOption = b.dropoffOption ?? payload.dropoffOption
    payload.instantBooking = b.instantBooking ?? payload.instantBooking
    payload.instantConfirmation = b.instantConfirmation ?? payload.instantConfirmation
    payload.bookingWindow = b.bookingWindow ?? payload.bookingWindow
    payload.cutoffMinutes = b.cutoffMinutes ?? payload.cutoffMinutes
  }

  // Schedules & pricing
  if (payload.schedulesAndPricing && typeof payload.schedulesAndPricing === 'object') {
    const s = payload.schedulesAndPricing
    payload.weeklySchedule = s.availability?.weeklySchedule ?? payload.weeklySchedule
    payload.timeSlots = Array.isArray(s.availability?.timeSlots) ? s.availability.timeSlots : payload.timeSlots
    payload.pricingCategories = s.travelerDetails?.pricingCategories ?? payload.pricingCategories
    payload.pricingModel = s.travelerDetails?.pricingModel ?? payload.pricingModel
    payload.pricingApproach = s.travelerDetails?.pricingApproach ?? payload.pricingApproach
    payload.currency = s.pricingSchedules?.currency ?? payload.currency
    const primarySched = Array.isArray(s.pricingSchedules?.schedules) ? s.pricingSchedules.schedules[0] : null
    if (primarySched) {
      payload.scheduleName = primarySched.name ?? payload.scheduleName
      payload.scheduleStartDate = primarySched.startDate ?? payload.scheduleStartDate
      payload.scheduleHasEndDate = primarySched.hasEndDate ?? payload.scheduleHasEndDate
      payload.scheduleEndDate = primarySched.endDate ?? payload.scheduleEndDate
    }
  }

  // General top-level guards
  payload.tags = Array.isArray(payload.tags) ? payload.tags : (Array.isArray(payload.keywords) ? payload.keywords : payload.tags)
  payload.photos = Array.isArray(payload.photos) ? payload.photos : (Array.isArray(payload.existingPhotos) ? payload.existingPhotos : payload.photos)
  // --- END flattening ---

  // Normalize dayLogistics: drop empty meals (no type) so autosave/submit never
  // persists incomplete meal rows; remove empty day entries entirely.
  if (payload.dayLogistics && typeof payload.dayLogistics === 'object' && !Array.isArray(payload.dayLogistics)) {
    const cleaned = {}
    for (const [day, log] of Object.entries(payload.dayLogistics)) {
      if (!log || typeof log !== 'object') continue
      const meals = (Array.isArray(log.meals) ? log.meals : [])
        .filter((m) => m && (m.type || '').trim())
        .map((m) => ({ type: m.type || '', format: m.format || '' }))
      const hasAccommodation = !!log.accommodation
      const hasDrinks = !!log.drinksIncluded
      const hasReturnToStart = !!log.returnToStart
      const hasNoSleepOver = !!log.noSleepOver
      if (hasAccommodation || hasDrinks || hasReturnToStart || hasNoSleepOver || meals.length > 0) {
        cleaned[day] = { ...log, meals }
      }
    }
    payload.dayLogistics = cleaned
  }

  const omit = [
    '_pendingFiles', '_hasHydrated', '_version', '_uploadedUrls',
    'currentStep', 'currentSectionId', 'currentStepId',
    'completedStepIds', 'isDirty', 'isSaving', 'isSubmitting',
    'hasHydrated', 'lastSaved', 'autosaveError', 'availableTimeSlots',
    'currentScheduleStep', 'editingScheduleIndex',
    'stepErrors', 'savedProductId',
    'previewFocus',
    'showAdvancedCategorySettings',
    'selectedOptionId', 'pricingTemplate', 'availabilityTemplate', 'cutoffTemplate',
    'itinerary', 'itineraryOverview', 'additionalItineraryInfo', 'dayTitles',
    'submissionMeta',
  ]
  for (const key of omit) delete payload[key]
  if (!payload.copyrightConfirmed) delete payload.copyrightConfirmed

  return payload
}

// Deterministic canonical serialization: key order, undefined and array order
// are normalized so equal builder states always produce equal signatures.
// Store action functions (spread into buildPayload) are normalized to null,
// mirroring how JSON serialization drops them during HTTP transport.
function stableStringify(value) {
  if (value === null || value === undefined || typeof value === 'function' || typeof value !== 'object') {
    return JSON.stringify(value === null || value === undefined || typeof value === 'function' ? null : value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

// Content signature of the builder state — used to detect "no changes since
// the last submission" so suppliers cannot re-queue an identical product.
export function builderSignature(state) {
  return stableStringify(buildPayload(state))
}

export { stableStringify };

export function useAutoSave() {
  const timerRef = useRef(null)
  const savingRef = useRef(false)

  useEffect(() => {
    const unsub = useProductBuilderStore.subscribe((state) => {
      if (!state.hasHydrated) return
      if (state.draftStatus === 'PENDING_APPROVAL') return
      if (savingRef.current) return
      if (!state.isDirty) return
      if (state.isSaving || state.isSubmitting) return
      const stepNum = state.currentStep + 1
      if (state.stepErrors?.[stepNum] && Object.keys(state.stepErrors[stepNum]).length > 0) return

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        if (savingRef.current) return
        savingRef.current = true

        const s = useProductBuilderStore.getState()
        s.setSaving(true)

        try {
          const payload = buildPayload(s)
          const id = s.savedProductId
          const res = id
            ? await updateProduct(id, payload, { skipGlobalErrorHandler: true })
            : await createProduct(payload, { skipGlobalErrorHandler: true })

          const newId = id || res.data?.data?.tour?.id
          if (newId) s.setSavedProductId(newId)
          s.markSaved()
          s.setAutosaveError(null)
        } catch (err) {
          const status = err?.response?.status
          const message = err?.response?.data?.message || err?.message || 'Autosave failed'
          if (status === 409) {
            const store = useProductBuilderStore.getState()
            store.setDraftStatus('PENDING_APPROVAL')
            store.setAutosaveError(message)
          } else if (status >= 400 && status < 500) {
            useProductBuilderStore.getState().markSaved()
            useProductBuilderStore.getState().setAutosaveError(message)
          } else {
            useProductBuilderStore.getState().setAutosaveError(message)
          }
        } finally {
          savingRef.current = false
          const current = useProductBuilderStore.getState()
          if (current.isSaving) current.setSaving(false)
        }
      }, 3000)
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}
