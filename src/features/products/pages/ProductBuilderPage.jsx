import { useParams, useSearchParams, useNavigate, useBlocker } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { getMyProduct, getTourDraft, createProduct, updateProduct, submitProductForReview, withdrawProductForReview, cleanupMediaUrls } from '@/features/products/api'
import { buildPayload, builderSignature, stableStringify, useAutoSave } from '@/features/products/useAutoSave'
import { GYG_STEPS } from '@/features/products/gygSteps'
import { normalizePricingCategories } from '@/features/products/tierUtils'
import { sortLocationsByDay } from '@/features/products/optionData'
import { hasAnyWeeklyHours } from '@/features/products/utils/pricingValidation'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import WizardSidebar from '@/features/products/WizardSidebar'
import WizardNavFooter from '@/features/products/WizardNavFooter'
import Step01Language from '@/features/products/steps/Step01Language'
import Step02Category from '@/features/products/steps/Step02Category'
import Step03Title from '@/features/products/steps/Step03Title'
import Step04Descriptions from '@/features/products/steps/Step04Descriptions'
import Step05Locations from '@/features/products/steps/Step05Locations'
import Step06Keywords from '@/features/products/steps/Step06Keywords'
import Step07Inclusions from '@/features/products/steps/Step07Inclusions'
import Step09GuideInfo from '@/features/products/steps/Step09GuideInfo'
import Step10Photos from '@/features/products/steps/Step10Photos'
import Step11ExtraInfo from '@/features/products/steps/Step11ExtraInfo'
import Step12Options from '@/features/products/steps/Step12Options'
import Step13MeetingPoint from '@/features/products/steps/Step13MeetingPoint'
import Step14PricingAvailability from '@/features/products/steps/Step14PricingAvailability'
import Step15Cutoff from '@/features/products/steps/Step15Cutoff'
import Step17CancellationPolicy from '@/features/products/steps/Step17CancellationPolicy'
import Step05ItineraryPreview from '@/features/products/steps/Step05ItineraryPreview'
import { safeId } from '@/lib/utils'

const STEP_COMPONENTS = {
  1: Step01Language,
  2: Step03Title,
  3: Step02Category,
  4: Step04Descriptions,
  5: Step05Locations,
  6: Step06Keywords,
  7: Step07Inclusions,
  8: Step09GuideInfo,
  9: Step11ExtraInfo,
  10: Step17CancellationPolicy,
  11: Step10Photos,
  12: Step12Options,
  13: Step13MeetingPoint,
  14: Step05ItineraryPreview,
  15: Step14PricingAvailability,
  16: Step15Cutoff,
}

const STEP_LABELS = {
  1: 'Language',
  2: 'Title & Reference Code',
  3: 'Product Category',
  4: 'Descriptions & highlights',
  5: 'Locations & Itinerary',
  6: 'Keywords and activities',
  7: 'Inclusions',
  8: 'Guide information',
  9: 'Extra information',
  10: 'Cancellation Policy',
  11: 'Photos',
  12: 'Booking Options',
  13: 'Meeting Point or Pickup',
  14: 'Itinerary Preview',
  15: 'Pricing & Availability',
  16: 'Cut-off',
}

function getGygStepIndex(sectionId, stepId) {
  const idx = GYG_STEPS.findIndex((s) => s.sectionId === sectionId && s.stepId === stepId)
  return idx >= 0 ? idx : 0
}

function flattenTransportModeObject(value) {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) return []
  const modes = []
  for (const items of Object.values(value)) {
    if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === 'string' && item.trim() && !modes.includes(item.trim())) modes.push(item.trim())
      }
    } else if (typeof items === 'string' && items.trim() && !modes.includes(items.trim())) {
      modes.push(items.trim())
    }
  }
  return modes
}

function tourToProduct(tour) {
  if (!tour) return null
  const content = tour.productContent || {}
  const categorization = tour.categorization || {}
  const booking = tour.bookingAndTickets || {}
  const meetingPoint = booking.meetingPoint || {}
  const sp = tour.schedulesAndPricing || {}
  const td = sp.travelerDetails || {}
  const ps = sp.pricingSchedules || {}
  const schedule = Array.isArray(ps.schedules) && ps.schedules.length > 0 ? ps.schedules[0] : {}
  const avail = sp.availability || {}

  const result = {
    language: content.writingLanguage || '',
    category: categorization.category || '',
    subcategory: categorization.subcategory || '',
    activityType: categorization.activityType || '',
    difficulty: categorization.difficulty || '',
    transportMode: typeof categorization.transportMode === 'object' ? '' : (categorization.transportMode || ''),
    duration: categorization.duration?.value ?? categorization.duration?.hours ?? null,
    durationUnit: categorization.duration?.unit || 'hours',
    accommodationIncluded: categorization.accommodationIncluded ?? false,
    title: tour.title || '',
    referenceCode: tour.referenceCode || '',
    shortDescription: content.shortSummary || '',
    fullDescription: tour.description || '',
    highlights: Array.isArray(content.highlights) ? content.highlights : [],
    locations: sortLocationsByDay((content.locations || []).map((l) => ({ ...l, day: l.day ?? 1 }))),
    attractions: content.attractions || [],
    keywords: tour.tags || [],
    activitiesIncluded: content.activitiesIncluded || [],
    transportModes: Array.isArray(categorization.transportModes) && categorization.transportModes.length > 0
      ? categorization.transportModes
      : flattenTransportModeObject(categorization.transportMode),
    transportServices: categorization.transportServices || [],
    whatsIncluded: content.included || [],
    whatsNotIncluded: content.excluded || [],
    guideType: (content.guideType === 'greeter' ? 'host' : content.guideType) || 'tour-guide',
    guideMaterials: content.guideMaterials || { audioGuide: false, infoBooklet: false },
    foodProvided: !!content.foodProvided,
    meals: Array.isArray(content.meals) ? content.meals :
      (content.mealType ? [{ type: content.mealType, format: '' }] : []),
    drinksIncluded: !!content.drinksIncluded,
    showDietaryRestrictions: !!content.showDietaryRestrictions,
    dietaryOptions: content.dietaryOptions || [],
    dayLogistics: content.dayLogistics || {},
    transportationProvided: !!content.transportationProvided,
    transportationType: content.transportationType || '',
    crossCityTravel: !!content.crossCityTravel,
    cutoffMinutes: booking.cutoffMinutes ?? 20,
    lastMinuteBookings: !!booking.lastMinuteBookings,
    perSlotCutoff: !!booking.perSlotCutoff,
    perSlotCutoffs: booking.perSlotCutoffs || {},
    instantConfirmation: booking.instantConfirmation !== false,
    timezone: booking.timezone || avail.timezone || 'UTC',
    notSuitableFor: content.healthRestrictions || [],
    notAllowed: content.notAllowed || [],
    petFriendly: !!content.petFriendly,
    wheelchairAccessible: !!content.wheelchairAccessible,
    wifiIncluded: !!content.wifiIncluded,
    mandatoryItems: content.whatToBring || [],
    knowBeforeYouGo: content.additionalInfo || '',
    emergencyPhone: (() => {
      if (content.emergencyPhone && content.emergencyPhone.startsWith('+')) {
        return content.emergencyPhone
      }
      if (content.emergencyCountryCode || content.emergencyPhone) {
        const cc = (content.emergencyCountryCode || '').replace(/\D/g, '')
        const pn = (content.emergencyPhone || '').replace(/\D/g, '')
        const digits = cc + pn
        return digits ? `+${digits}` : ''
      }
      return content.emergencyPhone || ''
    })(),
    voucherInfo: content.voucherInfo || '',
    photos: (tour.photos || []).map((p) => {
      const url = typeof p === 'string' ? p : p.url || '';
      return { id: safeId(), url };
    }),
    copyrightConfirmed: !!content.copyrightConfirmed,
    coverPhoto: tour.coverPhoto || '',
    options: (content.options || []).map((o) => ({ ...o, wheelchairAccessible: false, validityType: o.validityType === 'open_ended' ? 'from_activation' : (o.validityType || 'from_activation') })),
    meetingMode: content.meetingMode || 'meeting_point',
    meetingPoint: meetingPoint.lat
      ? {
          name: meetingPoint.name || '',
          address: meetingPoint.address || '',
          lat: meetingPoint.lat,
          lng: meetingPoint.lng,
        }
      : null,
    meetingPoints: Array.isArray(content.meetingPoints)
      ? content.meetingPoints
      : Array.isArray(booking.meetingPoints)
        ? booking.meetingPoints
        : [],
    meetingPointPicture: content.meetingPointPicture || '',
    meetingPointDescription: (content.meetingInstructions || '').slice(0, 200),
    arrivalTimeType: content.arrivalTimeType || 'none',
    arrivalTimeCustom: content.arrivalTimeCustom || '',
    pickupType: content.pickupType || 'area',
    pickupDescription: (content.pickupDescription || '').slice(0, 200),
    pickupTiming: content.pickupTiming || 'at_start',
    pickupAtSpecificTime: content.pickupAtSpecificTime !== undefined
      ? !!content.pickupAtSpecificTime
      : (content.pickupAreas || []).some((a) => typeof a === 'object' && a.time),
    pickupFinalLocationTiming: content.pickupFinalLocationTiming || 'day_before',
    referenceStartTime: content.referenceStartTime || '',
    pickupAreas: (content.pickupAreas || []).map((a) =>
      typeof a === 'string' ? { name: a, time: '', address: '', lat: null, lng: null } : { ...{ address: '', lat: null, lng: null }, ...a },
    ),
    pickupLocations: content.pickupLocations || [],
    pickupGeoshape: content.pickupGeoshape || null,
    planPickupTimes: !!content.planPickupTimes,
    pickupStartTime: content.pickupStartTime || '08:00',
    dropoffOption: content.dropoffOption || 'none',
    dropoffLocation: content.dropoffLocation || null,
    dropoffDescription: content.dropoffDescription || '',
    cutoffHours: booking.cancellationPolicy?.cutoffHours ?? 0,
    cancellationType: (booking.cancellationPolicy?.type === 'standard' || booking.cancellationPolicy?.type === 'all_sales_final')
      ? booking.cancellationPolicy.type
      : 'standard',
    supplierCanCancelBadWeather: !!booking.cancellationPolicy?.supplierCanCancelBadWeather,
    supplierCanCancelNotEnoughTravelers: !!booking.cancellationPolicy?.supplierCanCancelNotEnoughTravelers,
    pricingModel: td.pricingModel || 'perPerson',
    pricingApproach: td.pricingApproach || 'dependsOnAge',
    uniformPrice: td.uniformPrice ?? (td.pricingApproach === 'sameForEveryone'
      ? ((Array.isArray(td.pricingCategories) && td.pricingCategories[0]?.price != null) || (Array.isArray(td.ageGroups) && td.ageGroups[0]?.price != null) ? (td.pricingCategories || td.ageGroups)[0].price : null)
      : null),
     pricingCategories: (Array.isArray(td.pricingCategories) && td.pricingCategories.length > 0)
       ? normalizePricingCategories(td.pricingCategories, td.maxParticipants ?? 10)
       : (Array.isArray(td.ageGroups) && td.ageGroups.length > 0)
         ? normalizePricingCategories(td.ageGroups, td.maxParticipants ?? 10)
         : [{ name: 'Adult', price: null, minAge: 13, maxAge: 99, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    minParticipants: td.minParticipants ?? 1,
    maxParticipants: td.maxParticipants ?? 10,
    groupSizes: Array.isArray(td.groupSizes) ? td.groupSizes : [],
    additionalPersonsEnabled: !!td.additionalPersonsEnabled,
    additionalPersonPrice: td.additionalPersonPrice ?? null,
    maxGroupsPerTimeSlot: td.maxGroupsPerTimeSlot ?? 1,
    currency: ps.currency || 'USD',
     scheduleType: avail.scheduleType || 'fixedTimeSlot',
     weeklySchedule: hasAnyWeeklyHours(avail.weeklySchedule)
       ? avail.weeklySchedule
       : (hasAnyWeeklyHours(schedule.weeklySchedule) ? schedule.weeklySchedule : (avail.weeklySchedule || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] })),
     scheduleName: schedule.name || '',
     scheduleStartDate: schedule.startDate || '',
     scheduleHasEndDate: !!schedule.hasEndDate,
     scheduleEndDate: schedule.hasEndDate ? (schedule.endDate || '') : '',
     timeSlots: (Array.isArray(schedule.timeSlots) && schedule.timeSlots.length > 0)
        ? schedule.timeSlots.map((t) => (typeof t === 'string' ? { id: safeId(), startTime: t } : t))
        : (Array.isArray(avail.timeSlots) && avail.timeSlots.length > 0 ? avail.timeSlots.map((t) => (typeof t === 'string' ? { id: safeId(), startTime: t } : t)) : []),
    operatingHoursStart: avail.operatingHoursStart || '09:00',
    operatingHoursEnd: avail.operatingHoursEnd || '17:00',
    dateExceptions: Array.isArray(schedule.dateExceptions) ? schedule.dateExceptions : [],
    schedules: (Array.isArray(ps.schedules) && ps.schedules.length > 0)
      ? ps.schedules.map((sched) => ({
          name: sched.name || '',
          type: sched.type || avail.scheduleType || 'fixedTimeSlot',
          startDate: sched.startDate || '',
          hasEndDate: !!sched.hasEndDate,
          endDate: sched.hasEndDate ? (sched.endDate || '') : '',
          weeklySchedule: sched.weeklySchedule || avail.weeklySchedule || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
          dateExceptions: Array.isArray(sched.dateExceptions) ? sched.dateExceptions : [],
          timeSlots: Array.isArray(sched.timeSlots)
            ? sched.timeSlots.map((t) => (typeof t === 'string' ? { id: safeId(), startTime: t } : t))
            : [],
          pricingModel: sched.pricingModel || td.pricingModel || 'perPerson',
          currency: sched.currency || ps.currency || 'USD',
          pricingApproach: sched.pricingApproach || td.pricingApproach || 'dependsOnAge',
          uniformPrice: sched.uniformPrice ?? td.uniformPrice ?? null,
          pricingCategories: (Array.isArray(sched.pricingCategories) && sched.pricingCategories.length > 0)
            ? normalizePricingCategories(sched.pricingCategories, sched.maxParticipants ?? td.maxParticipants ?? 10)
            : (Array.isArray(td.pricingCategories) && td.pricingCategories.length > 0)
              ? normalizePricingCategories(td.pricingCategories, td.maxParticipants ?? 10)
              : (Array.isArray(td.ageGroups) && td.ageGroups.length > 0)
                ? normalizePricingCategories(td.ageGroups, td.maxParticipants ?? 10)
                : [{ name: 'Adult', price: null, minAge: 13, maxAge: 99, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
          minParticipants: sched.minParticipants ?? td.minParticipants ?? 1,
          maxParticipants: sched.maxParticipants ?? td.maxParticipants ?? 10,
        }))
      : [],
    contactPhone: content.contactPhone || null,
    isPrivateActivity: !!content.isPrivateActivity,
    passportRequired: !!content.passportRequired,
    flightInfoRequired: !!content.flightInfoRequired,
    shipInfoRequired: !!content.shipInfoRequired,
    trainInfoRequired: !!content.trainInfoRequired,
    hotelInfoRequired: !!content.hotelInfoRequired,
    metaTitle: tour.metaTitle || '',
    metaDescription: tour.metaDescription || '',
  }

  return result
}

export default function ProductBuilderPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const store = useProductBuilderStore()
  const {
    currentStep,
    hasHydrated,
    isDirty,
    isSubmitting,
    navigateTo,
    loadDraft,
    reset,
  } = store

  const contentRef = useRef(null)

  const [loadingProduct, setLoadingProduct] = useState(() => Boolean(id) && id !== 'new')
  const [productError, setProductError] = useState(null)
  const [stepDirection, setStepDirection] = useState(1)
  const [draftInfo, setDraftInfo] = useState(null)

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const savedProductId = useProductBuilderStore((s) => s.savedProductId)
  const setStoreSavedProductId = useProductBuilderStore((s) => s.setSavedProductId)

  const gygStepNumber = currentStep + 1
  const StepComponent = STEP_COMPONENTS[gygStepNumber]

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && !isSubmitting && currentLocation.pathname !== nextLocation.pathname,
      [isDirty, isSubmitting],
    ),
  )

  const showExitWarning = blocker.state === 'blocked'

  const handleConfirmExit = () => {
    const urls = useProductBuilderStore.getState()._uploadedUrls
    if (urls.length > 0) cleanupMediaUrls(urls)
    useProductBuilderStore.getState().clearUploadedUrls()
    blocker.proceed?.()
  }

  const handleCancelExit = () => {
    blocker.reset?.()
  }

  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const querySection = searchParams.get('section') || ''
  const queryStep = searchParams.get('step') || ''
  const urlStepAppliedRef = useRef(false)

  useEffect(() => {
    urlStepAppliedRef.current = false
  }, [id])

  // Keep the URL in sync with the current step (the store is the source of
  // truth once the product has loaded). Gated on loading so the deep-link URL
  // is not overwritten before the one-shot step-apply effect below reads it.
  useEffect(() => {
    if (!hasHydrated || loadingProduct) return
    const gygStep = GYG_STEPS[currentStep]
    if (!gygStep) return
    const section = gygStep.sectionId
    const step = gygStep.stepId
    if (section !== querySection || step !== queryStep) {
      setSearchParams({ section, step }, { replace: true })
    }
  }, [currentStep, hasHydrated, loadingProduct, querySection, queryStep, setSearchParams])

  // Honor the URL (deep link / last visited step) exactly once per product
  // load, AFTER the product has loaded. This breaks the previous two-way write
  // loop: the URL-sync effect and the step-navigation effect kept overwriting
  // each other when the persisted step disagreed with the URL (e.g. after
  // loadDraft resets the step), flipping the wizard between steps forever.
  useEffect(() => {
    if (!hasHydrated || loadingProduct) return
    if (urlStepAppliedRef.current) return
    urlStepAppliedRef.current = true
    if (querySection && queryStep) {
      const idx = getGygStepIndex(querySection, queryStep)
      if (idx !== useProductBuilderStore.getState().currentStep) {
        navigateTo(querySection, queryStep)
      }
    }
  }, [hasHydrated, loadingProduct, querySection, queryStep, navigateTo])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  useEffect(() => {
    if (id !== 'new' || !hasHydrated) return
    reset()
  }, [id, hasHydrated, navigate, reset])

  useEffect(() => {
    if (!id || id === 'new' || !hasHydrated) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoadingProduct(true)
      setProductError(null)
      setDraftInfo(null)
    })

    const persistSubmissionMeta = (submittedAt) => {
      const store = useProductBuilderStore.getState()
      if (!submittedAt) {
        store.clearSubmissionMeta(id)
        return
      }
      const existing = store.submissionMeta?.[id]
      if (existing?.submittedAt && existing?.signature) return
      store.setSubmissionMeta(id, { submittedAt, signature: builderSignature(store) })
    }

    const hydrateFromDraft = async (tour) => {
      try {
        const res = await getTourDraft(id)
        if (cancelled) return false
        const data = res.data?.data
        if (data && data.draft) {
          setDraftInfo({
            draftStatus: data.draftStatus || null,
            draftSubmittedAt: data.draftSubmittedAt || null,
            draftReviewNote: data.draftReviewNote || null,
            changesSummary: data.changesSummary || null,
          })
          useProductBuilderStore.getState().setDraftStatus(data.draftStatus || null)
          // Hydrate the builder from the merged draft snapshot so suppliers can
          // continue editing exactly what an admin will review. The live tour
          // keeps selling until the draft is approved.
          const product = tourToProduct({ ...tour, ...data.draft })
          loadDraft(product)
          setStoreSavedProductId(id)
          persistSubmissionMeta(data.draftSubmittedAt || tour.submittedAt || null)
          return true
        }
      } catch {
        // draft endpoint may 404/403 on old tours — fall back to live content
      }
      return false
    }

    getMyProduct(id)
      .then(async (res) => {
        if (cancelled) return
        setProductError(null)
        setDraftInfo(null)
        const tour = res.data?.data?.tour
        if (!tour) {
          setProductError('Product not found')
          return
        }
        const usedDraft = await hydrateFromDraft(tour)
        if (cancelled || usedDraft) return
        // No pending draft — a NEW tour awaiting approval has status
        // PENDING_APPROVAL (no draft row), which must still lock editing.
        // A FLAGGED tour (no draft row) is editable and shows the review note.
        const effectiveDraftStatus = tour.draftStatus
          || (tour.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : null)
          || (tour.status === 'FLAGGED' || tour.status === 'REJECTED' ? 'REJECTED' : null)
        if (effectiveDraftStatus) {
          setDraftInfo({
            draftStatus: effectiveDraftStatus,
            draftSubmittedAt: tour.submittedAt || null,
            draftReviewNote: tour.reviewNote || null,
            changesSummary: null,
          })
          useProductBuilderStore.getState().setDraftStatus(effectiveDraftStatus)
        }
        const product = tourToProduct(tour)
        loadDraft(product)
        setStoreSavedProductId(id)
        persistSubmissionMeta(tour.draftSubmittedAt || tour.submittedAt || null)
      })
      .catch((err) => {
        if (cancelled) return
        setProductError(err.response?.data?.message || err.message || 'Failed to load product')
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false)
      })

    return () => { cancelled = true }
  }, [id, hasHydrated, loadDraft, setStoreSavedProductId])

  useEffect(() => {
    return () => {
      const urls = useProductBuilderStore.getState()._uploadedUrls
      if (urls.length > 0) {
        cleanupMediaUrls(urls)
        useProductBuilderStore.getState().clearUploadedUrls()
      }
    }
  }, [])

  useAutoSave()

  async function handleSave({ force = false, skipNavigate = false } = {}) {
    const state = useProductBuilderStore.getState()

    if (!force && !state.isDirty) return null

    const payload = buildPayload(state)

    state.setSaving(true)
    setSaving(true)
    try {
      const res = savedProductId
        ? await updateProduct(savedProductId, payload, { skipGlobalErrorHandler: true })
        : await createProduct(payload, { skipGlobalErrorHandler: true })
      const newId = savedProductId || res.data?.data?.tour?.id
      if (newId) setStoreSavedProductId(newId)
      state.markSaved()
      state.clearUploadedUrls()
      if (!skipNavigate) {
        if (gygStepNumber === GYG_STEPS.length) {
          useProductBuilderStore.getState().completeStep(GYG_STEPS[gygStepNumber - 1]?.stepId)
          await queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
          navigate('/products')
        } else if (!savedProductId && newId) {
          const section = GYG_STEPS[0]?.sectionId
          const step = GYG_STEPS[0]?.stepId
          navigate(`/products/build/${newId}?section=${section}&step=${step}`, { replace: true })
        }
      }
       return res
    } finally {
      state.setSaving(false)
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      // For existing products, skip the save — submitProductForReview sends
      // the payload directly and the server persists it as draftContent.
      // Calling handleSave here would update the LIVE tour first, making the
      // server-side diff (draft vs live) empty.
      // For new products (no ID yet), we must save first to create the product.
      let currentId = useProductBuilderStore.getState().savedProductId
      if (!currentId) {
        await handleSave({ force: true, skipNavigate: true })
        currentId = useProductBuilderStore.getState().savedProductId
      }
      if (!currentId) {
        throw new Error('Failed to obtain product ID')
      }
      const state = useProductBuilderStore.getState()
      const payload = buildPayload(state)
      // Ensure duration/durationUnit are explicitly in payload for submit-for-review
      // (defensive: buildPayload spreads state but this guarantees they're present)
      payload.duration = state.duration
      payload.durationUnit = state.durationUnit
      // Content signature of the EXACT payload being submitted — computed before
      // the request so nothing blocks navigation once the response arrives.
      const signature = stableStringify(payload)
      const res = await submitProductForReview(currentId, payload)
      const noChanges = res?.data?.data?.noChanges === true
      if (noChanges) {
        // No changes to submit — the submission was already current
      } else {
        // Submit for review successful
      }
      // Record the submission + content signature so the footer can gate the
      // button until the supplier actually changes something again.
      const storeAfter = useProductBuilderStore.getState()
      storeAfter.setSubmissionMeta(currentId, {
        submittedAt: new Date().toISOString(),
        signature,
      })
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      navigate('/products')
    } finally {
      setSubmitting(false)
    }
  }

  const [withdrawing, setWithdrawing] = useState(false)

  const handleWithdraw = async () => {
    const currentId = useProductBuilderStore.getState().savedProductId
    if (!currentId) return
    setWithdrawing(true)
    try {
      await withdrawProductForReview(currentId)
      useProductBuilderStore.getState().setDraftStatus(null)
      useProductBuilderStore.getState().clearSubmissionMeta(currentId)
      setDraftInfo(null)
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
      navigate(`/products/build/${currentId}?section=${GYG_STEPS[0]?.sectionId}&step=${GYG_STEPS[0]?.stepId}`, { replace: true })
    } catch {
      // Failed to withdraw submission — surfaced via the footer/global error handler
    } finally {
      setWithdrawing(false)
    }
  }

  function handleNext() {
    if (gygStepNumber < GYG_STEPS.length) {
      setStepDirection(1)
      const storeState = useProductBuilderStore.getState()
      storeState.nextStep()
    }
  }

  function handleBack() {
    if (gygStepNumber > 1) {
      setStepDirection(-1)
      const storeState = useProductBuilderStore.getState()
      storeState.prevStep()
    }
  }

  function handleSelectStep(stepId) {
    const gygStep = GYG_STEPS.find((s) => s.id === stepId)
    if (gygStep) {
      setStepDirection(gygStep.id > gygStepNumber ? 1 : -1)
      navigateTo(gygStep.sectionId, gygStep.stepId)
    }
  }

  if (loadingProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading product...</p>
        </div>
      </div>
    )
  }

  if (productError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="bg-red-50 border border-red-300 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle size={40} className="text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Product</h2>
          <p className="text-sm text-red-700 mb-4">{productError}</p>
          <button
            onClick={() => navigate('/products')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-white overflow-hidden"
    ><div className="h-full flex flex-col">
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/products')}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-300 rounded-full" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-800">
                    {id && id !== 'new' ? 'Edit Product' : 'Create New Product'}
                  </h1>
                  {draftInfo?.draftStatus === 'PENDING_APPROVAL' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold">
                      Pending approval
                    </span>
                  )}
                  {draftInfo?.draftStatus === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-semibold">
                      Changes requested
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Step {gygStepNumber} of {GYG_STEPS.length}: {STEP_LABELS[gygStepNumber]}
                </p>
              </div>
            </div>
          </div>

          {/* Draft banner */}
          {draftInfo && (
            <div className={[
              'flex items-start gap-2.5 px-6 py-2.5 border-b text-sm shrink-0',
              draftInfo.draftStatus === 'PENDING_APPROVAL'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : draftInfo.draftStatus === 'REJECTED'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800',
            ].join(' ')}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                {draftInfo.draftStatus === 'PENDING_APPROVAL' && (
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1">
                      This product is pending admin review.{' '}
                      <span className="opacity-80">
                        Editing is locked while an admin reviews your submission. Withdraw it to make changes and resubmit.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={withdrawing}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold hover:bg-amber-200 disabled:opacity-60 transition-colors"
                    >
                      {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  </div>
                )}
                {draftInfo.draftStatus === 'REJECTED' && (
                  <p>
                    An admin requested changes on your draft.{' '}
                    <span className="opacity-80">
                      {draftInfo.draftReviewNote ? `Reason: ${draftInfo.draftReviewNote}.` : ''} Edit below and resubmit for review.
                    </span>
                  </p>
                )}
                {draftInfo.draftStatus === 'DRAFT' && (
                  <p>
                    You have an unsent draft in progress.{' '}
                    <span className="opacity-80">Continue editing, then submit for review to apply changes.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main area: sidebar + content */}
          <div className="flex-1 flex gap-0 min-h-0 px-6 py-5">
            <WizardSidebar currentStep={gygStepNumber} onSelectStep={handleSelectStep} />
            <div className="flex-1 flex flex-col ml-6 bg-white overflow-hidden">
              <div ref={contentRef} className="flex-1 p-8 overflow-y-auto">
                <h2 className="text-xl font-bold mb-6 tracking-tight">{STEP_LABELS[gygStepNumber]}</h2>
                <AnimatePresence mode="wait" custom={stepDirection}>
                  {StepComponent && (
                    <motion.div
                      key={gygStepNumber}
                      custom={stepDirection}
                      variants={{
                        initial: (d) => ({ opacity: 0, x: d * 24 }),
                        animate: { opacity: 1, x: 0 },
                        exit: (d) => ({ opacity: 0, x: d * -24 }),
                      }}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      <ErrorBoundary errorMessage="Something went wrong in this step. Try refreshing or contact support.">
                        <StepComponent />
                      </ErrorBoundary>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <WizardNavFooter
                currentStep={gygStepNumber}
                totalSteps={GYG_STEPS.length}
                onBack={handleBack}
                onNext={handleNext}
                onSave={handleSave}
                onSubmitForReview={handleSubmitForReview}
                saving={saving}
                submitting={submitting}
                isEditing={id && id !== 'new'}
              />
            </div>
          </div>
        </div>



        {/* Exit Warning Modal */}
        {showExitWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Unsaved changes</h3>
              <p className="text-sm text-slate-600 mb-6">
                You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelExit}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Leave anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
  )
}
