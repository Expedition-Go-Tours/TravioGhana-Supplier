import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { HelpCircle, Info, Plus, X, ChevronDown, ChevronUp, Check, Copy } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import {
  validateScheduleBasics,
  validatePricingCategories,
  validateGroupSizes,
  validateCapacity,
  hasScheduleData,
  hasPricingData,
  getAgeOverlap,
} from '@/features/products/utils/pricingValidation'
import DraftNumberInput from '@/components/ui/DraftNumberInput'
import OptionPicker from '@/features/products/OptionPicker'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const CATEGORY_TEMPLATES = [
  { name: 'Child', minAge: 0, maxAge: 17 },
  { name: 'Adult', minAge: 18, maxAge: 59 },
  { name: 'Senior', minAge: 60, maxAge: 99 },
  { name: 'Student', minAge: 18, maxAge: 25, idRequired: true },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MINUTES = ['00', '15', '30', '45']

const WIZARD_STEPS = ['Schedule', 'Pricing Categories', 'Capacity', 'Price']

function validateScheduleStep(step, state) {
  const issues = []
  if (step === 1) {
    issues.push(...validateScheduleBasics(state))
  }
  if (step === 2) {
    if (state.pricingModel !== 'perGroup') {
      if (!state.pricingApproach) {
        issues.push({ path: ['pricingApproach'], message: 'Select a pricing approach' })
      }
      if (state.pricingApproach === 'dependsOnAge') {
        issues.push(...validatePricingCategories(state.pricingCategories, { withPrices: false }))
      }
    }
  }
  if (step === 3) {
    issues.push(...validateCapacity(state))
  }
  if (step === 4) {
    if (state.pricingModel === 'perGroup') {
      if (!state.groupSizes || state.groupSizes.length === 0) {
        issues.push({ path: ['groupSizes'], message: 'Add at least one group size' })
      }
      issues.push(...validateGroupSizes(state.groupSizes))
    } else if (state.pricingApproach === 'sameForEveryone') {
      if (state.uniformPrice == null || state.uniformPrice <= 0) {
        issues.push({ path: ['uniformPrice'], message: 'Enter a price per person' })
      }
    } else if (state.pricingApproach === 'dependsOnAge') {
      issues.push(...validatePricingCategories(state.pricingCategories))
    }
  }
  const errors = {}
  for (const iss of issues) {
    const key = iss.path.join('.')
    if (!errors[key]) errors[key] = iss.message
  }
  return errors
}

function useLiveWizardErrors(step) {
  const [wizardErrors, setWizardErrors] = useState({})
  const touchedRef = useRef(new Set())
  const timerRef = useRef(null)

  const runValidation = useCallback(() => {
    const state = useProductBuilderStore.getState()
    const all = validateScheduleStep(step, state)
    const visible = {}
    for (const key of Object.keys(all)) {
      if (touchedRef.current.has(key)) visible[key] = all[key]
    }
    setWizardErrors(visible)
  }, [step])

  useEffect(() => {
    // Each wizard step starts with a clean slate: errors from a previous step
    // must not follow the user, and live errors only appear for fields they
    // actually interact with on this step. runValidation (below) clears any
    // leftover wizardErrors since nothing is touched on the fresh step.
    touchedRef.current = new Set()
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(runValidation, 0)
    const unsubscribe = useProductBuilderStore.subscribe(() => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(runValidation, 250)
    })
    return () => {
      clearTimeout(timerRef.current)
      unsubscribe()
    }
  }, [runValidation])

  const touch = useCallback((key) => {
    touchedRef.current.add(key)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(runValidation, 0)
  }, [runValidation])

  const touchAll = useCallback((keys) => {
    for (const k of keys) touchedRef.current.add(k)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(runValidation, 0)
  }, [runValidation])

  return { wizardErrors, setWizardErrors, touch, touchAll }
}

function TimeSelect({ value, onChange }) {
  const [hour24, minute] = (value || '08:00').split(':')
  const hourNum = parseInt(hour24, 10)
  const period = hourNum >= 12 ? 'PM' : 'AM'
  const hour12 = hourNum % 12 || 12
  const hour12Str = String(hour12).padStart(2, '0')

  const emit = (h12, m, p) => {
    let h24 = parseInt(h12, 10)
    if (p === 'AM') {
      if (h24 === 12) h24 = 0
    } else {
      if (h24 !== 12) h24 += 12
    }
    onChange(`${String(h24).padStart(2, '0')}:${m}`)
  }

  return (
    <div className="flex items-center gap-0.5">
      <Select value={hour12Str} onValueChange={(h) => emit(h, minute, period)}>
        <SelectTrigger className="h-9 w-14 px-1.5 text-sm border-slate-200 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {['12','01','02','03','04','05','06','07','08','09','10','11'].map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-slate-400">:</span>
      <Select value={minute} onValueChange={(m) => emit(hour12Str, m, period)}>
        <SelectTrigger className="h-9 w-14 px-1.5 text-sm border-slate-200 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-0.5">
        {['AM', 'PM'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => emit(hour12Str, minute, p)}
            className={`h-9 px-2 text-xs font-semibold transition-colors ${
              p === period
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function WizardStepper({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {WIZARD_STEPS.map((step, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${
                isActive ? 'text-emerald-600 underline underline-offset-4' : isCompleted ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {step}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`w-8 h-px mx-3 ${isCompleted ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScheduleStep({ errors = {}, onTouch }) {
  const {
    scheduleType, scheduleName, scheduleStartDate, scheduleHasEndDate, scheduleEndDate,
    weeklySchedule, dateExceptions, timeSlots,
    setField, addWeeklyHours, updateWeeklyHours, removeWeeklyHours,
    copyDayToRemaining, removeAllWeeklyHours,
    addDateException, updateDateException, removeDateException,
    addTimeSlot, updateTimeSlot, removeTimeSlot,
    selectedOptionId, options,
  } = useProductBuilderStore()

  // Prefill schedule name from the selected booking option title
  useEffect(() => {
    if (!scheduleName && selectedOptionId) {
      const option = options.find(o => o.id === selectedOptionId)
      if (option?.title) {
        setField('scheduleName', option.title)
      }
    }
  }, [selectedOptionId])

  const hasAnyHours = Object.values(weeklySchedule).some((hours) => hours.length > 0)
  const firstDayWithHours = DAYS.find((d) => weeklySchedule[d]?.length > 0)

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">Name your schedule</label>
        <input
          type="text"
          value={scheduleName}
          onChange={(e) => setField('scheduleName', e.target.value)}
          onBlur={() => onTouch?.('scheduleName')}
          data-field="scheduleName"
          placeholder="E.g. Summer, Weekends price..."
          aria-invalid={!!errors.scheduleName}
          className={`w-full h-11 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
            errors.scheduleName
              ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
          }`}
        />
        {errors.scheduleName && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.scheduleName}</span>}
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">What's the starting date of your activity?</label>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={scheduleStartDate}
            onChange={(e) => setField('scheduleStartDate', e.target.value)}
            onBlur={() => onTouch?.('scheduleStartDate')}
            data-field="scheduleStartDate"
            aria-invalid={!!errors.scheduleStartDate}
            className={`h-11 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
              errors.scheduleStartDate
                ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
          {scheduleHasEndDate && (
            <>
              <span className="text-sm text-slate-500">to</span>
              <input
                type="date"
                value={scheduleEndDate}
                onChange={(e) => setField('scheduleEndDate', e.target.value)}
                onBlur={() => onTouch?.('scheduleEndDate')}
                data-field="scheduleEndDate"
                aria-invalid={!!errors.scheduleEndDate}
                className={`h-11 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
                  errors.scheduleEndDate
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
              />
            </>
          )}
        </div>
        {errors.scheduleStartDate && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.scheduleStartDate}</span>}
        {errors.scheduleEndDate && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.scheduleEndDate}</span>}
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleHasEndDate}
            onChange={(e) => setField('scheduleHasEndDate', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">My activity has an end date</span>
        </label>
        {scheduleHasEndDate && !scheduleEndDate && (
          <p className="text-xs text-red-500 mt-1">No end date</p>
        )}
      </div>

      {scheduleType === 'fixedTimeSlot' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Time slots</h3>
            <button
              type="button"
              onClick={addTimeSlot}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add time slot
            </button>
          </div>
          <div className="space-y-3">
            {timeSlots.map((slot, i) => (
              <div key={slot.id || i} className="flex items-center gap-2">
                <span className="text-sm text-slate-500 w-20">Start time</span>
                <TimeSelect
                  value={slot.startTime}
                  onChange={(v) => updateTimeSlot(i, { startTime: v })}
                />
                <button
                  type="button"
                  onClick={() => removeTimeSlot(i)}
                  className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {timeSlots.length === 0 && (
              <p className="text-sm text-slate-400">No time slots yet. Add the start times your activity runs at.</p>
            )}
          </div>
          {errors.timeSlots && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.timeSlots}</span>}
        </div>
      ) : (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Standard weekly schedule</h3>
          {hasAnyHours && (
            <div className="flex items-center gap-3">
              {firstDayWithHours && (
                <button
                  type="button"
                  onClick={() => copyDayToRemaining(firstDayWithHours)}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to remaining days
                </button>
              )}
              <button
                type="button"
                onClick={removeAllWeeklyHours}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Remove all
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          {DAYS.map((day) => (
            <div key={day}>
              <div className="flex items-start justify-between py-3 gap-4">
                <h4 className="text-sm font-bold text-slate-900 shrink-0 pt-1">{day}</h4>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {(weeklySchedule[day] || []).map((hours, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <TimeSelect
                        value={hours.startTime}
                        onChange={(v) => updateWeeklyHours(day, i, { startTime: v })}
                      />
                      <span className="text-slate-400">-</span>
                      <TimeSelect
                        value={hours.endTime}
                        onChange={(v) => updateWeeklyHours(day, i, { endTime: v })}
                      />
                      <button
                        type="button"
                        onClick={() => removeWeeklyHours(day, i)}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addWeeklyHours(day)}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add opening hours
                  </button>
                </div>
              </div>
              <hr className="border-slate-100" />
            </div>
          ))}
        </div>
        {errors.weeklySchedule && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.weeklySchedule}</span>}
      </div>
      )}

      {/* Exceptions */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Exceptions <span className="font-normal text-slate-500">(Optional)</span>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Do you have alternative operating hours?</p>
          <p className="text-sm text-slate-500">Use this if you want different operating hours on a special day, like Easter or Christmas</p>
        </div>

        <div className="space-y-4">
          {dateExceptions.map((exception, i) => (
            <div key={exception.id || i} className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={exception.date}
                  onChange={(e) => updateDateException(i, { date: e.target.value })}
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => removeDateException(i)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {(exception.overrideTimes || []).map((t, j) => (
                <div key={j} className="flex items-center gap-2 ml-4">
                  <TimeSelect
                    value={t.startTime}
                    onChange={(v) => updateDateException(i, {
                      overrideTimes: exception.overrideTimes.map((ot, oi) => oi === j ? { ...ot, startTime: v } : ot)
                    })}
                  />
                  <span>-</span>
                  <TimeSelect
                    value={t.endTime}
                    onChange={(v) => updateDateException(i, {
                      overrideTimes: exception.overrideTimes.map((ot, oi) => oi === j ? { ...ot, endTime: v } : ot)
                    })}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateDateException(i, {
                  overrideTimes: [...(exception.overrideTimes || []), { startTime: '08:00', endTime: '18:00' }]
                })}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add opening hours
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addDateException}
            className="px-4 py-2 border-2 border-emerald-600 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
          >
            Add date
          </button>
        </div>
      </div>
    </div>
  )
}

function PricingCategoriesStep({ errors = {}, onTouch }) {
  const {
    pricingModel, pricingApproach, pricingCategories, showAdvancedCategorySettings,
    setField, addPricingCategory, updatePricingCategory, removePricingCategory,
  } = useProductBuilderStore()

  const [showPicker, setShowPicker] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const pickerRef = useRef(null)
  const inputRef = useRef(null)
  const addedNames = new Set(pricingCategories.map((c) => c.name.trim().toLowerCase()))

  useEffect(() => {
    if (customMode) inputRef.current?.focus()
  }, [customMode])

  useEffect(() => {
    if (!showPicker) return
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

  const handleSelectTemplate = (t) => {
    if (addedNames.has(t.name.toLowerCase())) return
    addPricingCategory({ name: t.name, price: null, minAge: t.minAge, maxAge: t.maxAge, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: t.idRequired || false, idType: '' })
    setShowPicker(false)
  }

  const handleAddCustom = () => {
    const trimmed = customName.trim()
    if (trimmed) {
      if (addedNames.has(trimmed.toLowerCase())) {
        setCustomName('')
        setCustomMode(false)
        setShowPicker(false)
        return
      }
      addPricingCategory({ name: trimmed, price: null, minAge: 0, maxAge: 99, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '' })
      setCustomName('')
      setCustomMode(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-3">Tell us more about your prices:</label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingApproach"
              checked={pricingApproach === 'sameForEveryone'}
              onChange={() => { setField('pricingApproach', 'sameForEveryone'); onTouch?.('pricingApproach') }}
              data-field="pricingApproach"
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">The price is the same for everyone, eg: per participant</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingApproach"
              checked={pricingApproach === 'dependsOnAge'}
              onChange={() => { setField('pricingApproach', 'dependsOnAge'); onTouch?.('pricingApproach') }}
              data-field="pricingApproach"
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">Price depends on category, e.g. child, senior, military etc</span>
          </label>
        </div>
        {errors.pricingApproach && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.pricingApproach}</span>}

        {pricingApproach === 'sameForEveryone' && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-600">
                Offering multiple participant types can boost bookings by up to 3x compared with activities with only one participant type.
              </p>
            </div>
          </div>
        )}
      </div>

      {pricingApproach === 'dependsOnAge' && (
        <div data-field="pricingCategories">
          {errors.pricingCategories && <span className="text-[13px] text-red-600 font-medium mb-2 block">{errors.pricingCategories}</span>}
          {Object.keys(errors).filter((k) => k.startsWith('pricingCategories.') && k.endsWith('.name')).map((k) => (
            <span key={k} className="text-[13px] text-red-600 font-medium mb-2 block">{errors[k]}</span>
          ))}
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-slate-900">Pricing categories:</label>
            <button
              type="button"
              onClick={() => setField('showAdvancedCategorySettings', !showAdvancedCategorySettings)}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              {showAdvancedCategorySettings ? 'Hide advanced settings' : 'Show advanced settings'}
              <div className={`w-10 h-5 rounded-full transition-colors ${showAdvancedCategorySettings ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${showAdvancedCategorySettings ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="space-y-3">
            {pricingCategories.map((cat, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-900 min-w-[80px]">{cat.name || 'Category'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Age range</span>
                        <Select value={String(cat.minAge)} onValueChange={(v) => {
                          const newMin = parseInt(v)
                          if (newMin > cat.maxAge) {
                            toast.warning('Min age cannot be greater than max age')
                            return
                          }
                          const overlapIdx = getAgeOverlap(pricingCategories, i, { minAge: newMin })
                          if (overlapIdx !== null) {
                            toast.warning(`Age range overlaps with "${pricingCategories[overlapIdx]?.name || 'another category'}"`)
                            return
                          }
                          updatePricingCategory(i, { minAge: newMin })
                        }}>
                          <SelectTrigger className="h-9 w-16 px-2 text-sm border-slate-200 rounded-lg">
                            <SelectValue>{cat.minAge}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 100 }, (_, n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-slate-500">to</span>
                        <Select value={String(cat.maxAge)} onValueChange={(v) => {
                          const newMax = parseInt(v)
                          if (newMax < cat.minAge) {
                            toast.warning('Max age cannot be less than min age')
                            return
                          }
                          const overlapIdx = getAgeOverlap(pricingCategories, i, { maxAge: newMax })
                          if (overlapIdx !== null) {
                            toast.warning(`Age range overlaps with "${pricingCategories[overlapIdx]?.name || 'another category'}"`)
                            return
                          }
                          updatePricingCategory(i, { maxAge: newMax })
                        }}>
                          <SelectTrigger className="h-9 w-16 px-2 text-sm border-slate-200 rounded-lg">
                            <SelectValue>{cat.maxAge}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 100 }, (_, n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {showAdvancedCategorySettings && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <h4 className="text-sm font-bold text-slate-900">Advanced settings</h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Is this category permitted?</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={!cat.notAllowed} onChange={() => updatePricingCategory(i, { notAllowed: false })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={cat.notAllowed} onChange={() => updatePricingCategory(i, { notAllowed: true })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Is this category free of charge?</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={cat.ticketNotRequired} onChange={() => updatePricingCategory(i, { ticketNotRequired: true })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={!cat.ticketNotRequired} onChange={() => updatePricingCategory(i, { ticketNotRequired: false })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Must be accompanied?</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={cat.needsAdult} onChange={() => updatePricingCategory(i, { needsAdult: true })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={!cat.needsAdult} onChange={() => updatePricingCategory(i, { needsAdult: false })} className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-slate-700">No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePricingCategory(i)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium ml-4"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => { setShowPicker(!showPicker); setCustomMode(false) }}
              className="flex items-center gap-1.5 mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add pricing category
            </button>

            {showPicker && (
              <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Choose a category</span>
                </div>
                {CATEGORY_TEMPLATES.filter((t) => !addedNames.has(t.name.toLowerCase())).map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {t.name}
                      {t.idRequired && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">ID required</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">{t.minAge}-{t.maxAge}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100">
                  {customMode ? (
                    <div className="p-2 flex items-center gap-1.5 bg-white">
                      <input
                        ref={inputRef}
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom() }}
                        placeholder="Category name"
                        className="flex-1 h-8 rounded-lg border border-slate-200 px-2.5 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        disabled={!customName.trim()}
                        className="px-2.5 h-8 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setCustomMode(true); setCustomName('') }}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-medium border-0 bg-transparent cursor-pointer"
                    >
                      + Custom category
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CapacityStep({ errors = {}, onTouch }) {
  const {
    pricingModel, minParticipants, maxParticipants, maxGroupsPerTimeSlot,
    groupSizes, additionalPersonsEnabled, additionalPersonPrice,
    setField, addGroupSize, updateGroupSize, removeGroupSize,
  } = useProductBuilderStore()

  const commission = 0.15

  useEffect(() => {
    const { pricingModel: model, groupSizes: sizes } = useProductBuilderStore.getState()
    if (model === 'perGroup' && sizes.length === 0) {
      addGroupSize()
    }
  }, [addGroupSize])

  if (pricingModel === 'perGroup') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Capacity</h3>
          <p className="text-sm text-slate-600 mb-4">How many groups can you take per time slot?</p>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-700 min-w-[130px]">Max # of groups</label>
            <input
              type="number"
              value={maxGroupsPerTimeSlot ?? 1}
              onChange={(e) => {
                const v = e.target.value
                setField('maxGroupsPerTimeSlot', v === '' ? '' : (parseInt(v) || ''))
              }}
              onBlur={() => {
                const v = maxGroupsPerTimeSlot
                if (v === '' || v == null || isNaN(v)) setField('maxGroupsPerTimeSlot', 1)
                onTouch?.('maxGroupsPerTimeSlot')
              }}
              min={1}
              aria-invalid={!!errors.maxGroupsPerTimeSlot}
              className={`h-11 w-32 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
                errors.maxGroupsPerTimeSlot
                  ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.maxGroupsPerTimeSlot && <span className="text-[13px] text-red-600 font-medium mt-1 block">{errors.maxGroupsPerTimeSlot}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-2">Now, let's look at your capacity</h3>
        <p className="text-sm text-slate-600 mb-6">How many participants can you take per time slot?</p>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-700 min-w-[140px] flex items-center gap-1.5">
              Minimum number
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              type="number"
              value={minParticipants ?? 1}
              onChange={(e) => {
                const v = e.target.value
                setField('minParticipants', v === '' ? '' : (parseInt(v) || ''))
              }}
              onBlur={() => {
                const v = minParticipants
                if (v === '' || v == null || isNaN(v)) setField('minParticipants', 1)
                onTouch?.('minParticipants')
              }}
              min={1}
              data-field="minParticipants"
              aria-invalid={!!errors.minParticipants}
              className={`h-11 w-32 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
                errors.minParticipants
                  ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.minParticipants && <span className="text-[13px] text-red-600 font-medium mt-1 block ml-[140px]">{errors.minParticipants}</span>}
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-700 min-w-[140px]">Maximum number</label>
            <input
              type="number"
              value={maxParticipants ?? 1}
              onChange={(e) => {
                const v = e.target.value
                setField('maxParticipants', v === '' ? '' : (parseInt(v) || ''))
              }}
              onBlur={() => {
                const v = maxParticipants
                if (v === '' || v == null || isNaN(v)) setField('maxParticipants', 1)
                onTouch?.('maxParticipants')
              }}
              min={1}
              data-field="maxParticipants"
              aria-invalid={!!errors.maxParticipants}
              className={`h-11 w-32 rounded-lg border px-3.5 text-sm focus:outline-none focus:ring-1 ${
                errors.maxParticipants
                  ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.maxParticipants && <span className="text-[13px] text-red-600 font-medium mt-1 block ml-[140px]">{errors.maxParticipants}</span>}
        </div>
      </div>
    </div>
  )
}

function PerGroupPriceStep({ errors = {}, onTouch }) {
  const {
    groupSizes, additionalPersonsEnabled, additionalPersonPrice,
    setField, addGroupSize, updateGroupSize, removeGroupSize,
  } = useProductBuilderStore()

  const commission = 0.15

  useEffect(() => {
    const { pricingModel: model, groupSizes: sizes } = useProductBuilderStore.getState()
    if (model === 'perGroup' && sizes.length === 0) {
      addGroupSize()
    }
  }, [addGroupSize])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Set the price for your activity</h3>
        <p className="text-sm text-slate-500">
          Include all taxes in what the customer pays for your activity.{' '}
          <a href="#" className="text-emerald-600 underline">Learn more</a>.
        </p>
      </div>

      <h4 className="text-sm font-bold text-slate-900">Group sizes & prices</h4>

      <div className="space-y-4">
        {groupSizes.map((gs, i) => {
          const bandPrice = gs.price
          const payout = bandPrice ? (bandPrice * (1 - commission)).toFixed(2) : ''
          const label = gs.from === gs.to
            ? `Group of ${gs.from}`
            : `Group of ${gs.from}-${gs.to}`

          return (
            <div key={gs.id || i} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                {i === 0 && (
                  <label className="text-sm text-slate-700 shrink-0">People</label>
                )}
                {i > 0 && <div className="w-[52px] shrink-0" />}
                <DraftNumberInput
                  min={1}
                  value={gs.from}
                  onCommit={(v) => { updateGroupSize(i, { from: v == null ? 1 : v }); onTouch?.(`groupSizes.${i}.from`) }}
                  className="h-10 w-20 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-400">to</span>
                <DraftNumberInput
                  min={1}
                  value={gs.to}
                  onCommit={(v) => { updateGroupSize(i, { to: v == null ? 1 : v }); onTouch?.(`groupSizes.${i}.to`) }}
                  className="h-10 w-20 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => removeGroupSize(gs.id)}
                  disabled={groupSizes.length <= 1}
                  className={`text-sm font-medium shrink-0 ${
                    groupSizes.length <= 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-red-500 hover:text-red-600'
                  }`}
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="min-w-[140px] flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Group pays</label>
                  <input
                    type="number"
                    value={bandPrice ?? ''}
                    onChange={(e) => { updateGroupSize(i, { price: e.target.value ? parseFloat(e.target.value) : null }); onTouch?.(`groupSizes.${i}.price`) }}
                    placeholder="USD"
                    aria-invalid={!!errors[`groupSizes.${i}.price`]}
                    className={`h-10 w-full max-w-[120px] rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 ${
                      errors[`groupSizes.${i}.price`]
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                    }`}
                  />
                  {errors[`groupSizes.${i}.price`] && (
                    <span className="block text-[13px] text-red-600 font-medium mt-1">{errors[`groupSizes.${i}.price`]}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Commission</label>
                  <div className="h-10 rounded-lg bg-slate-100 flex items-center px-3 text-sm text-slate-500 min-w-[60px]">
                    15%
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Payout per group</label>
                  <div className="h-10 rounded-lg bg-slate-100 flex items-center px-3 text-sm text-slate-700 font-medium min-w-[80px]">
                    {bandPrice ? `${payout} USD` : ''}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addGroupSize}
        className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        Additional group size
      </button>

      {/* Additional persons */}
      <div className="border border-slate-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={additionalPersonsEnabled}
            onChange={(e) => setField('additionalPersonsEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-bold text-slate-900">Additional Persons</span>
        </label>
        {additionalPersonsEnabled && (
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-slate-700">Price per additional person</label>
            <input
              type="number"
              value={additionalPersonPrice ?? ''}
              onChange={(e) => setField('additionalPersonPrice', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="USD"
              className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function PerPersonPriceStep({ errors = {}, onTouch }) {
  const {
    pricingApproach, pricingCategories, uniformPrice,
    minParticipants, maxParticipants,
    setField, addCategoryTier, updateCategoryTier, removeCategoryTier,
  } = useProductBuilderStore()

  const commission = 0.15

  const isSameForEveryone = pricingApproach === 'sameForEveryone'
  const categories = isSameForEveryone
    ? [{ name: 'Participant', minAge: 0, maxAge: 99, tiers: [] }]
    : pricingCategories

  function getCatPrice(cat) {
    const tier0 = Array.isArray(cat.tiers) && cat.tiers[0] ? cat.tiers[0].pricePerPerson : null
    if (tier0 != null) return tier0
    return isSameForEveryone ? uniformPrice : (cat.price ?? '')
  }

  function handlePriceChange(i, value) {
    const num = value ? parseFloat(value) : null
    if (isSameForEveryone) {
      setField('uniformPrice', num)
    } else {
      const updated = [...pricingCategories]
      updated[i] = { ...updated[i], price: num }
      setField('pricingCategories', updated)
      const cat = categories[i]
      if (Array.isArray(cat?.tiers) && cat.tiers[0]) {
        updateCategoryTier(i, 0, { pricePerPerson: num })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Set the price for your activity</h3>
        <p className="text-sm text-slate-500">
          Include all taxes in what the customer pays for your activity.{' '}
          <a href="#" className="text-emerald-600 underline">Learn more</a>.
        </p>
      </div>

      {categories.map((cat, i) => {
        const catPrice = getCatPrice(cat)
        const computed = catPrice ? (parseFloat(catPrice) * (1 - commission)).toFixed(2) : ''
        const tier0 = Array.isArray(cat.tiers) ? cat.tiers[0] : null
        const subTiers = Array.isArray(cat.tiers) ? cat.tiers.slice(1) : []

        return (
          <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white">
            <h4 className="text-sm font-bold text-slate-900 mb-3">{cat.name}</h4>
            
            {/* Tier 1 — the primary price row (always shown).
                Tier 1 is the canonical `1 to N` band: its lower bound is fixed
                at 1 (GetYourGuide convention) and its upper bound is editable,
                cascading into the next tier's lower bound on change. */}
            <div className="grid grid-cols-4 gap-3 items-end mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Number of people</label>
                {tier0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={1}
                      disabled
                      min={1}
                      className="h-9 w-14 rounded-lg border border-slate-200 bg-slate-100 px-2 text-sm text-center text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <DraftNumberInput
                      min={1}
                      value={tier0.to != null ? tier0.to : maxParticipants}
                      onCommit={(v) => { updateCategoryTier(i, 0, { to: v }); onTouch?.(`pricingCategories.${i}.tiers.0.to`) }}
                      className="h-9 w-14 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 font-medium">
                    {`${minParticipants} to ${maxParticipants ?? ''}`}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Customer pays</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={catPrice}
                    onChange={(e) => { handlePriceChange(i, e.target.value); onTouch?.(isSameForEveryone ? 'uniformPrice' : `pricingCategories.${i}.price`) }}
                    placeholder="USD"
                    aria-invalid={!!errors[isSameForEveryone ? 'uniformPrice' : `pricingCategories.${i}.price`]}
                    className={`h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 ${
                      errors[isSameForEveryone ? 'uniformPrice' : `pricingCategories.${i}.price`]
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                {errors[isSameForEveryone ? 'uniformPrice' : `pricingCategories.${i}.price`] && (
                  <span className="block text-[13px] text-red-600 font-medium mt-1">{errors[isSameForEveryone ? 'uniformPrice' : `pricingCategories.${i}.price`]}</span>
                )}
                {errors[`pricingCategories.${i}.tiers`] && (
                  <span className="block text-[13px] text-red-600 font-medium mt-1">{errors[`pricingCategories.${i}.tiers`][0]}</span>
                )}
              </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Commission</label>
                  <div className="h-11 rounded-lg bg-slate-100 flex items-center px-3 text-sm text-slate-500">
                    15%
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price per participant</label>
                  <div className="h-11 rounded-lg bg-slate-100 flex items-center px-3 text-sm text-slate-700 font-medium">
                    {computed ? `${computed} USD` : ''}
                  </div>
                </div>
              </div>
              
              {subTiers.map((tier, k) => { const j = k + 1; return (
              <div key={tier.id || j} className="p-3 mt-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  Tier {j + 1}: For groups of {tier.from} to {tier.to ?? '?'} total participants
                </div>
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center">
                  {/* From/To Column */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">From</span>
                    <input
                      type="number"
                      value={tier.from ?? ''}
                      disabled
                      className="h-9 w-14 rounded-lg border border-slate-200 bg-slate-100 px-2 text-sm text-center text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <DraftNumberInput
                      min={tier.from}
                      value={tier.to}
                      onCommit={(v) => { updateCategoryTier(i, j, { to: v }); onTouch?.(`pricingCategories.${i}.tiers.${j}.to`) }}
                      className="h-9 w-14 rounded-lg border border-slate-200 px-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* Price per person */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price per {cat.name}</label>
                    <input
                      type="number"
                      value={tier.pricePerPerson ?? ''}
                      onChange={(e) => { updateCategoryTier(i, j, { pricePerPerson: e.target.value ? parseFloat(e.target.value) : null }); onTouch?.(`pricingCategories.${i}.tiers.${j}.pricePerPerson`) }}
                      placeholder="USD"
                      aria-invalid={!!errors[`pricingCategories.${i}.tiers.${j}.pricePerPerson`]}
                      className={`h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 ${
                        errors[`pricingCategories.${i}.tiers.${j}.pricePerPerson`]
                          ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                      }`}
                    />
                  </div>
                  
                  {/* Commission */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Commission (15%)</label>
                    <div className="h-11 rounded-lg bg-slate-100 flex items-center px-3 text-sm text-slate-500">
                      {tier.pricePerPerson ? `${(tier.pricePerPerson * 0.15).toFixed(2)} USD` : '-'}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Actions</label>
                    <div className="h-11 flex items-center">
                      <button
                        type="button"
                        onClick={() => removeCategoryTier(i, j)}
                        className={`text-sm font-medium ${
                          cat.tiers.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-600'
                        }`}
                        disabled={cat.tiers.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )})}

            <button
              type="button"
              onClick={() => addCategoryTier(i)}
              className="flex items-center gap-1.5 mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add tier price
            </button>
            
            {cat.tiers && cat.tiers.length > 0 && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                💡 Tier pricing applies based on <strong>total group size</strong> across all age categories. 
                Example: 3 adults + 2 children = 5 total → uses pricing for tier covering 5 participants.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PriceStep({ errors = {}, onTouch }) {
  const pricingModel = useProductBuilderStore((s) => s.pricingModel)
  if (pricingModel === 'perGroup') {
    return <PerGroupPriceStep errors={errors} onTouch={onTouch} />
  }
  return <PerPersonPriceStep errors={errors} onTouch={onTouch} />
}



function ScheduleWizard({ onBack }) {
  const { currentScheduleStep, setField, saveSchedule, resetScheduleForm, clearStepErrors } = useProductBuilderStore()
  const [direction, setDirection] = useState(1)
  const { wizardErrors, setWizardErrors, touch, touchAll } = useLiveWizardErrors(currentScheduleStep)

  const handleNext = async () => {
    setDirection(1)
    // Wait one tick so DraftNumberInput onCommit handlers flush to the store
    if (currentScheduleStep === 4) await new Promise(r => setTimeout(r, 0))
    const state = useProductBuilderStore.getState()

    if (currentScheduleStep < 4) {
      const errors = validateScheduleStep(currentScheduleStep, state)
      if (Object.keys(errors).length > 0) {
        setWizardErrors(errors)
        touchAll(Object.keys(errors))
        return
      }
      setWizardErrors({})
      clearStepErrors(16)

      // Per-group: skip step 2 (no pricing approach) and go straight to step 3
      let nextStep = currentScheduleStep + 1
      if (nextStep === 2 && state.pricingModel === 'perGroup') {
        nextStep = 3
      }
      setField('currentScheduleStep', nextStep)
      return
    }

    // Step 4 final save — validate all steps
    let allErrors = {}
    let firstStep = null
    for (let step = 1; step <= 4; step++) {
      const stepErrors = validateScheduleStep(step, state)
      allErrors = { ...allErrors, ...stepErrors }
      if (firstStep === null && Object.keys(stepErrors).length > 0) firstStep = step
    }
    if (Object.keys(allErrors).length > 0) {
      setWizardErrors(allErrors)
      touchAll(Object.keys(allErrors))
      if (firstStep !== null) setField('currentScheduleStep', firstStep)
      return
    }

    setWizardErrors({})
    clearStepErrors(16)
    saveSchedule()
    onBack()
  }

  const handleBack = () => {
    setDirection(-1)
    if (currentScheduleStep > 1) {
      // Per-group: skip step 2 when going back
      let prevStep = currentScheduleStep - 1
      const state = useProductBuilderStore.getState()
      if (prevStep === 2 && state.pricingModel === 'perGroup') {
        prevStep = 1
      }
      setField('currentScheduleStep', prevStep)
    } else {
      resetScheduleForm()
      onBack()
    }
  }

  const variants = {
    initial: (d) => ({ opacity: 0, x: d * 24 }),
    animate: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d * -24 }),
  }

  return (
    <div className="flex flex-col">
      <WizardStepper currentStep={currentScheduleStep} />

      <div className="min-h-[200px]">
        {Object.keys(wizardErrors).length > 0 && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg mb-6">
            <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <p className="text-sm text-slate-700">
              {Object.entries(wizardErrors).length === 1
                ? Object.values(wizardErrors)[0]
                : `Please fix the following before continuing: ${Object.values(wizardErrors).join(', ')}`}
            </p>
          </div>
        )}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScheduleStep}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {currentScheduleStep === 1 && <ScheduleStep errors={wizardErrors} onTouch={touch} />}
            {currentScheduleStep === 2 && <PricingCategoriesStep errors={wizardErrors} onTouch={touch} />}
            {currentScheduleStep === 3 && <CapacityStep errors={wizardErrors} onTouch={touch} />}
            {currentScheduleStep === 4 && <PriceStep errors={wizardErrors} onTouch={touch} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={handleBack}
          className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Save and continue
        </button>
      </div>
    </div>
  )
}

function ScheduleCard({ schedule, index, onEdit }) {
  const { removeSchedule } = useProductBuilderStore()
  const [expanded, setExpanded] = useState(false)

  const dateRange = schedule.startDate
    ? `${new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${
        schedule.hasEndDate && schedule.endDate
          ? ` - ${new Date(schedule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : ' - No end date'
      }`
    : 'No dates set'


  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">{schedule.name || 'Untitled Schedule'}</h4>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20">Date range:</span>
                <span className="text-xs text-slate-700">{dateRange}</span>
              </div>
              {schedule.pricingModel === 'perGroup' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20">Maximum groups:</span>
                  <span className="text-xs text-slate-700">{schedule.maxGroupsPerTimeSlot ?? 1}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20">Participants:</span>
                  <span className="text-xs text-slate-700">{schedule.minParticipants} - {schedule.maxParticipants}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20">Pricing:</span>
                <span className="text-xs text-slate-700">
                  {schedule.pricingModel === 'perGroup'
                    ? (Array.isArray(schedule.groupSizes) && schedule.groupSizes.length > 0
                      ? `From $${Math.min(...schedule.groupSizes.map(g => g.price || 0)) || 0} per group`
                      : 'Not set')
                    : schedule.pricingApproach === 'sameForEveryone'
                      ? `$${schedule.uniformPrice || 0} per Person`
                      : `${schedule.pricingCategories?.length || 0} categories`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
        <div className="flex justify-end px-4 pb-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? 'Hide schedule' : 'Show schedule'}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <div className="space-y-3">
            {DAYS.map((day) => {
              const hours = schedule.weeklySchedule?.[day] || []
              return (
                <div key={day}>
                  <p className="text-sm font-semibold text-slate-800">{day}</p>
                  {hours.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {hours.map((h, hi) => (
                        <p key={hi} className="text-sm text-slate-600">{h.startTime} - {h.endTime}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">Closed</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => removeSchedule(index)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Step14PricingAvailability() {
  const {
    scheduleType, pricingModel, schedules, groupSizes, pricingCategories, uniformPrice,
    weeklySchedule, timeSlots, dateExceptions,
    setField, resetScheduleForm, clearStepErrors,
  } = useProductBuilderStore()
  const errors = useStepErrors(15)
  const [showWizard, setShowWizard] = useState(false)
  const [, setEditingIndex] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    const s = useProductBuilderStore.getState()
    if (Array.isArray(s.options) && s.options.length > 0 &&
        !s.options.some((o) => o.id === s.selectedOptionId)) {
      s.selectOption(s.options[0].id)
    }
  }, [])

  function handlePricingModelChange(nextModel) {
    if (nextModel === pricingModel) return
    const state = { schedules, pricingModel, groupSizes, uniformPrice, pricingCategories }
    if (hasPricingData(state)) {
      setConfirmDialog({ kind: 'pricingModel', nextModel })
    } else {
      setField('pricingModel', nextModel)
    }
  }

  function handleScheduleTypeChange(nextType) {
    if (nextType === scheduleType) return
    const state = { schedules, weeklySchedule, timeSlots, dateExceptions, pricingModel, groupSizes, uniformPrice, pricingCategories }
    if (hasScheduleData(state) || hasPricingData(state)) {
      setConfirmDialog({ kind: 'scheduleType', nextType })
    } else {
      setField('scheduleType', nextType)
    }
  }

  function confirmChange() {
    const command = confirmDialog
    if (!command) return
    const { confirmPricingModelChange, confirmScheduleTypeChange } = useProductBuilderStore.getState()
    if (command.kind === 'scheduleType') {
      confirmScheduleTypeChange(command.nextType)
    } else {
      confirmPricingModelChange(command.nextModel)
    }
    setConfirmDialog(null)
  }

  const handleAddSchedule = () => {
    resetScheduleForm()
    setEditingIndex(null)
    setShowWizard(true)
    clearStepErrors(16)
  }

  const handleEditSchedule = (index) => {
    const { editSchedule } = useProductBuilderStore.getState()
    editSchedule(index)
    setEditingIndex(index)
    setShowWizard(true)
    clearStepErrors(16)
  }

  const handleWizardBack = () => {
    setShowWizard(false)
    setEditingIndex(null)
  }

  return (
    <AnimatePresence mode="wait">
      {showWizard ? (
        <motion.div
          key="wizard"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="max-w-[720px]"
        >
          <button
            type="button"
            onClick={handleWizardBack}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6"
          >
            &larr; Back to Availability & Pricing
          </button>
          <ScheduleWizard onBack={handleWizardBack} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="max-w-[720px] space-y-6"
        >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <h2 className="text-lg font-bold text-slate-900">Availability & Pricing</h2>
          <HelpCircle className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">This will apply to all the schedules added to this option.</p>
      </div>

      {/* Active option */}
      <OptionPicker
        label="Which option are you configuring?"
        helpText="Availability, prices and capacity are set per option. Switching options keeps each option's settings separate."
      />

      {/* Availability type */}
      <div data-field="scheduleType">
        <label className="block text-sm font-bold text-slate-900 mb-3">Select how you run your activity</label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="scheduleType"
              checked={scheduleType === 'fixedTimeSlot'}
              onChange={() => handleScheduleTypeChange('fixedTimeSlot')}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Fixed time slot</span>
              <p className="text-xs text-slate-500 mt-0.5">Example: walking tour starting at 9:00 AM, 11:00 AM, and 2:00 PM</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="scheduleType"
              checked={scheduleType === 'operatingHours'}
              onChange={() => handleScheduleTypeChange('operatingHours')}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Operating hours</span>
              <p className="text-xs text-slate-500 mt-0.5">Example: museum open from Mon to Sat, between 9:00 AM and 7:00 PM</p>
            </div>
          </label>
        </div>
        <p className="text-xs text-slate-400 mt-3">You cannot mix fixed time slots with operating hours in the same option.</p>
        {errors.scheduleType && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.scheduleType[0]}</span>}
      </div>

      {/* Pricing model */}
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-3">Select how you price your activity</label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingModel"
              checked={pricingModel === 'perPerson'}
              onChange={() => handlePricingModelChange('perPerson')}
              data-field="pricingModel"
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Price per person</span>
              <p className="text-xs text-slate-500 mt-0.5">Set different prices for adults, youth, child, etc.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingModel"
              checked={pricingModel === 'perGroup'}
              onChange={() => handlePricingModelChange('perGroup')}
              data-field="pricingModel"
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Price per group/vehicle</span>
              <p className="text-xs text-slate-500 mt-0.5">Set different prices based on group size, vehicle type, etc.</p>
            </div>
          </label>
        </div>
        <p className="text-xs text-slate-400 mt-3">You can't select both price per group and price per person in the same option.</p>
        {errors.pricingModel && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.pricingModel[0]}</span>}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.kind === 'scheduleType' ? 'Change availability type' : 'Change pricing model'}
        description={
          confirmDialog?.kind === 'scheduleType'
            ? `This change will delete your ${confirmDialog.nextType === 'fixedTimeSlot' ? 'operating hours' : 'time slots'}, pricing categories and price settings. You'll need to set this up again. Are you sure you want to make this change?`
            : "This change will delete all your live schedule, capacity and price settings. You'll need to set this up again. Are you sure you want to make this change?"
        }
        confirmLabel={confirmDialog?.kind === 'scheduleType' ? 'Change availability type' : 'Change pricing model'}
        onConfirm={confirmChange}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Saved schedules */}
      {errors.schedules && <span className="text-[13px] text-red-600 font-medium mb-2 block">{errors.schedules[0]}</span>}
      {schedules.length > 0 && (
        <div className="space-y-3" data-field="schedules">
          {schedules.map((schedule, i) => (
            <ScheduleCard
              key={i}
              schedule={schedule}
              index={i}
              onEdit={handleEditSchedule}
            />
          ))}
        </div>
      )}

      {/* Add schedule button */}
      <button
        type="button"
        onClick={handleAddSchedule}
        className="px-5 py-2.5 border-2 border-emerald-600 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
      >
        Add schedule
      </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
