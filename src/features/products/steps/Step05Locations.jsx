import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Pencil, GripVertical, ChevronDown, Bed, UtensilsCrossed, MoonStar, Plus, X, RotateCcw, Ban, Check, Flag } from 'lucide-react'
import LocationAutocomplete from '@/components/shared/LocationAutocomplete'
import {
  sumStopMinutes,
  productDurationMinutes,
  formatMinutes,
  stopDurationsExceedProduct,
} from '@/features/products/utils/durationValidation'
import {
  ACCOMMODATION_TYPES,
  ACCOMMODATION_LABELS,
  MEAL_TYPES,
  MEAL_FORMATS_BY_TYPE,
  isMultiDayTour,
  dayCountForDuration,
} from '@/features/products/utils/itineraryConstants'
import { DIETARY_OPTIONS } from '@/constants/gygLists'

const ADMISSION_OPTIONS = [
  { value: 'yes', label: 'Yes', desc: 'Admission is covered by the tour price.' },
  { value: 'no', label: 'No', desc: 'Travelers pay separately at the venue.' },
  { value: 'passby', label: 'Pass by', desc: 'Travelers pass by this attraction without stopping.' },
]

const ADMISSION_LABELS = { yes: 'Admission included', no: 'Pay separately', passby: 'Pass by', na: 'Pass by' }

export default function Step05Locations() {
  const locations = useProductBuilderStore((s) => s.locations)
  const duration = useProductBuilderStore((s) => s.duration)
  const durationUnit = useProductBuilderStore((s) => s.durationUnit)
  const addLocation = useProductBuilderStore((s) => s.addLocation)
  const removeLocation = useProductBuilderStore((s) => s.removeLocation)
  const updateLocation = useProductBuilderStore((s) => s.updateLocation)
  const reorderLocations = useProductBuilderStore((s) => s.reorderLocations)
  const moveLocationToDay = useProductBuilderStore((s) => s.moveLocationToDay)
  const accommodationIncluded = useProductBuilderStore((s) => s.accommodationIncluded)
  const dayLogistics = useProductBuilderStore((s) => s.dayLogistics)
  const setDayLogistics = useProductBuilderStore((s) => s.setDayLogistics)
  const showDietaryRestrictions = useProductBuilderStore((s) => s.showDietaryRestrictions)
  const dietaryOptions = useProductBuilderStore((s) => s.dietaryOptions)
  const addDietaryOption = useProductBuilderStore((s) => s.addDietaryOption)
  const removeDietaryOption = useProductBuilderStore((s) => s.removeDietaryOption)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(5)
  const previewFocus = useProductBuilderStore((s) => s.previewFocus)
  const clearPreviewFocus = useProductBuilderStore((s) => s.clearPreviewFocus)
  const clearStepErrors = useProductBuilderStore((s) => s.clearStepErrors)
  const [modalIndex, setModalIndex] = useState(null)

  const isMultiDay = isMultiDayTour(duration, durationUnit)
  const dayCount = dayCountForDuration(duration, durationUnit)

  const dragRef = useRef(null)

  useEffect(() => {
    if (previewFocus?.step === 'locations' && typeof previewFocus.index === 'number') {
      const t = setTimeout(() => {
        clearStepErrors(5)
        setModalIndex(previewFocus.index)
        clearPreviewFocus()
      }, 250)
      return () => clearTimeout(t)
    }
  }, [previewFocus, clearPreviewFocus, clearStepErrors])

  const handleGlobalDragStart = useCallback((globalIdx) => {
    dragRef.current = globalIdx
  }, [])

  const handleGlobalDrop = useCallback((globalIdx) => {
    if (dragRef.current !== null && dragRef.current !== globalIdx) {
      reorderLocations(dragRef.current, globalIdx)
    }
    dragRef.current = null
  }, [reorderLocations])

  function handleOpenModal(i) {
    clearStepErrors(5)
    setModalIndex(i)
  }

  return (
    <div className="max-w-[720px] space-y-5">
      <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
        Which cities, sites, and attractions will your customers visit? Add all the locations your experience covers, it helps travelers find your tour and sets clear expectations.
      </p>

      {isMultiDay ? (
        <MultiDayItinerary
          locations={locations}
          dayCount={dayCount}
          addLocation={addLocation}
          removeLocation={removeLocation}
          moveLocationToDay={moveLocationToDay}
          duration={duration}
          durationUnit={durationUnit}
          accommodationIncluded={accommodationIncluded}
          dayLogistics={dayLogistics}
          setDayLogistics={setDayLogistics}
          showDietaryRestrictions={showDietaryRestrictions}
          dietaryOptions={dietaryOptions}
          addDietaryOption={addDietaryOption}
          removeDietaryOption={removeDietaryOption}
          setField={setField}
          onEdit={handleOpenModal}
          dragRef={dragRef}
          onDragStart={handleGlobalDragStart}
          onDrop={handleGlobalDrop}
          errors={errors}
        />
      ) : (
        <SingleDayItinerary
          locations={locations}
          addLocation={addLocation}
          removeLocation={removeLocation}
          duration={duration}
          durationUnit={durationUnit}
          onEdit={handleOpenModal}
          dragRef={dragRef}
          onDragStart={handleGlobalDragStart}
          onDrop={handleGlobalDrop}
          errors={errors}
        />
      )}

      <p className="text-[13px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
        You can edit these locations and their order anytime, even after the product is published. Confirm the sequence now so travelers see the experience in the right order.
      </p>

      <AnimatePresence>
        {modalIndex != null && locations[modalIndex] && (
          <LocationModal
            index={modalIndex}
            loc={locations[modalIndex]}
            locations={locations}
            duration={duration}
            durationUnit={durationUnit}
            dayCount={dayCount}
            onClose={() => setModalIndex(null)}
            onUpdate={updateLocation}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SingleDayItinerary({ locations, addLocation, removeLocation, duration, durationUnit, onEdit, dragRef, onDragStart, onDrop, errors }) {
  function selectResult(item) {
    const nextIndex = locations.length
    addLocation({
      name: '',
      address: item.formatted || '',
      lat: item.latitude != null ? Number(item.latitude) : undefined,
      lng: item.longitude != null ? Number(item.longitude) : undefined,
      city: item.city || '',
      country: item.country || '',
      region: item.region || '',
      description: '',
      timeSpent: null,
      timeSpentUnit: 'minutes',
      admissionIncluded: 'yes',
      day: 1,
    })
    onEdit(nextIndex)
  }

  function addFallback(query) {
    const val = (query || '').trim()
    if (!val) return
    const nextIndex = locations.length
    addLocation({ name: '', address: val, description: '', timeSpent: null, timeSpentUnit: 'minutes', admissionIncluded: 'yes', day: 1 })
    onEdit(nextIndex)
  }

  return (
    <>
      <LocationAutocomplete
        onSelect={selectResult}
        onAddCustom={addFallback}
        clearOnSelect
        hideLabel
        placeholder="Search for a location or point of interest..."
        className="relative max-w-[420px]"
      />
      <LocationList
        locations={locations}
        removeLocation={removeLocation}
        onEdit={onEdit}
        dragRef={dragRef}
        onDragStart={onDragStart}
        onDrop={onDrop}
        duration={duration}
        durationUnit={durationUnit}
        errors={errors}
        showHeader
      />
    </>
  )
}

function MultiDayItinerary({ locations, dayCount, addLocation, removeLocation, moveLocationToDay, duration, durationUnit, accommodationIncluded, dayLogistics, setDayLogistics, showDietaryRestrictions, dietaryOptions, addDietaryOption, removeDietaryOption, setField, onEdit, dragRef, onDragStart, onDrop, errors }) {
  const [dropTargetDay, setDropTargetDay] = useState(null)
  const [collapsedDays, setCollapsedDays] = useState({})

  const productMinutes = productDurationMinutes(duration, durationUnit)
  const perDayMinutes = productMinutes != null ? Math.floor(productMinutes / dayCount) : null
  const totalStopMinutes = sumStopMinutes(locations)
  const totalStops = locations.length

  function toggleDay(day) {
    setCollapsedDays((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  function handleDayDragOver(day, e) {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetDay(day)
  }

  function handleDayDragLeave(e) {
    e.preventDefault()
    setDropTargetDay(null)
  }

  function handleDayDrop(day, e) {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetDay(null)
    const sourceIdx = dragRef.current
    if (sourceIdx == null) return
    const sourceLoc = locations[sourceIdx]
    if (sourceLoc && sourceLoc.day !== day) {
      moveLocationToDay(sourceIdx, day)
    }
    dragRef.current = null
  }

  return (
    <div data-field="locations">
      {errors.locations && (
        <span className="text-[13px] text-red-600 font-medium block mb-3">{errors.locations[0]}</span>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">{dayCount}-day itinerary</p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {totalStops > 0
                ? `${totalStops} stop${totalStops !== 1 ? 's' : ''} · ${formatMinutes(totalStopMinutes)} total`
                : 'Place each stop in its day. Drag stops between days to reassign.'}
            </p>
          </div>
          {perDayMinutes != null && (
            <span className="shrink-0 text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              ~{formatMinutes(perDayMinutes)} per day
            </span>
          )}
        </div>
      </div>

      <DietarySection
        showDietaryRestrictions={showDietaryRestrictions}
        dietaryOptions={dietaryOptions}
        onToggle={(v) => setField('showDietaryRestrictions', v)}
        onAdd={addDietaryOption}
        onRemove={removeDietaryOption}
      />

      <div className="relative pl-8">
        <div className="absolute left-[15px] top-6 bottom-6 w-px bg-slate-200" />

        {Array.from({ length: dayCount }, (_, i) => {
          const day = i + 1
          const dayLocations = locations.filter((l) => l.day === day)
          const globalIndices = locations
            .map((l, idx) => (l.day === day ? idx : -1))
            .filter((idx) => idx >= 0)
          const isCollapsed = collapsedDays[day] || false
          const isDropTarget = dropTargetDay === day
          const logistics = dayLogistics?.[day] || {}
          const isLastDay = day === dayCount

          return (
            <div key={day} className="relative pb-4 last:pb-0">
              <div className="absolute -left-8 top-4 z-10">
                <div className={`w-7 h-7 rounded-full text-white text-xs font-bold grid place-items-center shadow-sm ${isLastDay ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                  {isLastDay ? <Flag size={12} /> : day}
                </div>
              </div>

              <div
                data-day={day}
                onDragOver={(e) => handleDayDragOver(day, e)}
                onDragLeave={handleDayDragLeave}
                onDrop={(e) => handleDayDrop(day, e)}
                className={`rounded-xl border transition-all duration-200 ${
                  isDropTarget
                    ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30'
                    : dayLocations.length === 0
                      ? 'border-dashed border-slate-300 bg-white'
                      : isLastDay
                        ? 'border-amber-200 bg-white'
                        : 'border-slate-200 bg-white'
                }`}
              >
                <DayCardHeader
                  day={day}
                  locations={dayLocations}
                  perDayMinutes={perDayMinutes}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleDay(day)}
                  isLastDay={isLastDay}
                />

                {!isCollapsed && (
                  <>
                    <DayAutocomplete
                      day={day}
                      locations={locations}
                      addLocation={addLocation}
                      onEdit={onEdit}
                    />

                    {dayLocations.length === 0 ? (
                      <div className="px-4 pb-5 pt-1 text-center">
                        <p className="text-[13px] text-slate-400">
                          {isLastDay ? 'Where does the tour end?' : 'No locations added for this day yet'}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">
                          {isLastDay ? 'Add the final stops or wrap-up location' : 'Search above or drag a stop from another day'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 pb-4">
                          <LocationList
                            locations={dayLocations}
                            globalIndices={globalIndices}
                            removeLocation={removeLocation}
                            onEdit={onEdit}
                            dragRef={dragRef}
                            onDragStart={onDragStart}
                            onDrop={(targetIdx) => onDrop(targetIdx)}
                            duration={duration}
                            durationUnit={durationUnit}
                            showHeader={false}
                            timeline
                          />
                        </div>
                        {isLastDay ? (
                          <LastDayWrapUp
                            day={day}
                            logistics={logistics}
                            setDayLogistics={setDayLogistics}
                            startLocationName={locations.find((l) => l.day === 1)?.city || locations.find((l) => l.day === 1)?.name || 'the starting point'}
                          />
                        ) : (
                          <div className="px-4 pb-3 -mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 mx-4">
                            <MoonStar size={12} className="text-amber-500" />
                            Overnight in {dayLocations[dayLocations.length - 1].city || dayLocations[dayLocations.length - 1].name || dayLocations[dayLocations.length - 1].address || 'this location'}
                            {logistics.accommodation && (
                              <span className="text-slate-500">· {ACCOMMODATION_LABELS[logistics.accommodation]}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <DayLogisticsPanel
                      day={day}
                      logistics={logistics}
                      accommodationIncluded={accommodationIncluded}
                      setDayLogistics={setDayLogistics}
                      hideAccommodation={isLastDay && !!logistics.noSleepOver}
                    />
                  </>
                )}

                {isDropTarget && (
                  <div className="absolute inset-0 rounded-xl bg-emerald-50/40 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-semibold text-emerald-700 bg-white px-4 py-1.5 rounded-lg shadow-sm">
                      Drop here to move to Day {day}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DietarySection({ showDietaryRestrictions, dietaryOptions, onToggle, onAdd, onRemove }) {
  const [open, setOpen] = useState(showDietaryRestrictions)

  function toggle(opt) {
    if (dietaryOptions.includes(opt)) onRemove(dietaryOptions.indexOf(opt))
    else onAdd(opt)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(!open); onToggle(!open) }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50 transition-colors bg-transparent border-0 cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <UtensilsCrossed size={15} className="text-slate-400" />
          Dietary restrictions
          {dietaryOptions.length > 0 && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{dietaryOptions.length}</span>
          )}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <p className="text-[12px] text-slate-400 mb-3">Select which dietary needs you can accommodate across the whole tour.</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {DIETARY_OPTIONS.map((opt) => {
              const checked = dietaryOptions.includes(opt)
              return (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="sr-only peer"
                  />
                  <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DayLogisticsPanel({ day, logistics, accommodationIncluded, setDayLogistics, hideAccommodation }) {
  const meals = logistics?.meals || []
  const drinksIncluded = !!logistics?.drinksIncluded
  const accommodation = logistics?.accommodation || null

  function addMeal() {
    setDayLogistics(day, { meals: [...meals, { type: '', format: '' }] })
  }

  function updateMeal(i, field, value) {
    const next = [...meals]
    const meal = next[i]
    if (field === 'type') {
      const formats = MEAL_FORMATS_BY_TYPE[value] || []
      next[i] = { type: value, format: formats.includes(meal.format) ? meal.format : '' }
    } else {
      next[i] = { ...meal, [field]: value }
    }
    setDayLogistics(day, { meals: next })
  }

  function removeMeal(i) {
    setDayLogistics(day, { meals: meals.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 space-y-3">
      {accommodationIncluded && !hideAccommodation && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            <Bed size={12} />
            Overnight accommodation
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ACCOMMODATION_TYPES.map((t) => {
              const selected = accommodation === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setDayLogistics(day, { accommodation: selected ? null : t.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1 text-[10px] ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{t.stars}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <UtensilsCrossed size={12} />
            Meals
          </div>
          <button
            type="button"
            onClick={addMeal}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-transparent border-0 cursor-pointer p-0"
          >
            <Plus size={12} /> Add meal
          </button>
        </div>
        {meals.length > 0 && (
          <div className="space-y-2">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={m.type} onValueChange={(v) => updateMeal(i, 'type', v)}>
                  <SelectTrigger className="h-9 text-sm flex-1 bg-white">
                    <SelectValue placeholder="Type of meal" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={m.format} onValueChange={(v) => updateMeal(i, 'format', v)}>
                  <SelectTrigger className="h-9 text-sm flex-1 bg-white">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    {(MEAL_FORMATS_BY_TYPE[m.type] || []).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeMeal(i)}
                  className="shrink-0 w-6 h-6 rounded-md border-0 bg-transparent text-slate-400 cursor-pointer grid place-items-center hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer pt-0.5">
        <input
          type="checkbox"
          checked={drinksIncluded}
          onChange={(e) => setDayLogistics(day, { drinksIncluded: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-[13px] font-medium text-slate-700">Drinks included</span>
      </label>
    </div>
  )
}

function LastDayWrapUp({ day, logistics, setDayLogistics, startLocationName }) {
  const returnToStart = !!logistics?.returnToStart
  const noSleepOver = !!logistics?.noSleepOver

  function toggle(field) {
    setDayLogistics(day, { [field]: !logistics?.[field] })
  }

  return (
    <div className="px-4 pb-3 border-t border-amber-100 pt-3 mx-4 -mt-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-2.5">
        <Flag size={12} />
        Last day wrap-up
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => toggle('returnToStart')}
          className={`group relative text-left rounded-xl border-2 p-3.5 transition-all duration-200 cursor-pointer ${
            returnToStart
              ? 'border-emerald-500 bg-emerald-50/60 shadow-sm shadow-emerald-100'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              returnToStart ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-slate-200'
            }`}>
              <RotateCcw size={14} className={returnToStart ? 'text-emerald-600' : 'text-slate-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold leading-tight ${returnToStart ? 'text-emerald-800' : 'text-slate-700'}`}>
                Return to start point?
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Tour ends where it began. Travelers are dropped back at {startLocationName}.
              </p>
            </div>
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              returnToStart ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 group-hover:border-slate-400'
            }`}>
              {returnToStart && (
                <Check size={11} className="text-white" strokeWidth={3} />
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggle('noSleepOver')}
          className={`group relative text-left rounded-xl border-2 p-3.5 transition-all duration-200 cursor-pointer ${
            noSleepOver
              ? 'border-amber-500 bg-amber-50/60 shadow-sm shadow-amber-100'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              noSleepOver ? 'bg-amber-100' : 'bg-slate-100 group-hover:bg-slate-200'
            }`}>
              <Ban size={14} className={noSleepOver ? 'text-amber-600' : 'text-slate-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold leading-tight ${noSleepOver ? 'text-amber-800' : 'text-slate-700'}`}>
                No overnight stay?
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Tour ends on the last day. No hotel accommodation needed.
              </p>
            </div>
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              noSleepOver ? 'border-amber-500 bg-amber-500' : 'border-slate-300 group-hover:border-slate-400'
            }`}>
              {noSleepOver && (
                <Check size={11} className="text-white" strokeWidth={3} />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function DayCardHeader({ day, locations, perDayMinutes, isCollapsed, onToggle, isLastDay }) {
  const dayStopMinutes = sumStopMinutes(locations)
  const stopCount = locations.length

  let statusColor = 'bg-slate-300'
  let statusLabel = 'Empty'
  if (stopCount > 0 && perDayMinutes != null) {
    const ratio = dayStopMinutes / perDayMinutes
    if (ratio > 1) {
      statusColor = 'bg-red-500'
      statusLabel = 'Over time'
    } else if (ratio > 0.8) {
      statusColor = 'bg-amber-400'
      statusLabel = 'Filling up'
    } else {
      statusColor = 'bg-emerald-500'
      statusLabel = 'On track'
    }
  } else if (stopCount > 0) {
    statusColor = 'bg-emerald-500'
    statusLabel = 'Has stops'
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white hover:bg-slate-50/50 transition-colors border-b border-slate-100 rounded-t-xl"
    >
      <span className={`text-sm font-bold ${isLastDay ? 'text-amber-700' : 'text-slate-800'}`}>{isLastDay ? 'Final Day' : `Day ${day}`}</span>

      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} title={statusLabel} />

      <span className="flex-1" />

      <span className="text-xs text-slate-500">
        {stopCount > 0 ? (
          <>
            {stopCount} stop{stopCount !== 1 ? 's' : ''}
            <span className="text-slate-400 mx-1">·</span>
            <span className={perDayMinutes != null && dayStopMinutes > perDayMinutes ? 'text-red-600 font-medium' : 'text-slate-600'}>
              {formatMinutes(dayStopMinutes)}
            </span>
            {perDayMinutes != null && (
              <span className="text-slate-400"> / {formatMinutes(perDayMinutes)}</span>
            )}
          </>
        ) : (
          <span className="text-slate-400">No stops</span>
        )}
      </span>

      <span className={`shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
        <ChevronDown size={16} className="text-slate-400" />
      </span>
    </button>
  )
}

function DayAutocomplete({ day, locations, addLocation, onEdit }) {
  function selectResult(item) {
    const nextIndex = locations.length
    addLocation({
      name: '',
      address: item.formatted || '',
      lat: item.latitude != null ? Number(item.latitude) : undefined,
      lng: item.longitude != null ? Number(item.longitude) : undefined,
      city: item.city || '',
      country: item.country || '',
      region: item.region || '',
      description: '',
      timeSpent: null,
      timeSpentUnit: 'minutes',
      admissionIncluded: 'yes',
      day,
    })
    onEdit(nextIndex)
  }

  function addFallback(query) {
    const val = (query || '').trim()
    if (!val) return
    const nextIndex = locations.length
    addLocation({ name: '', address: val, description: '', timeSpent: null, timeSpentUnit: 'minutes', admissionIncluded: 'yes', day })
    onEdit(nextIndex)
  }

  return (
    <div className="px-4 py-3">
      <LocationAutocomplete
        onSelect={selectResult}
        onAddCustom={addFallback}
        clearOnSelect
        hideLabel
        placeholder="Search for a location or point of interest..."
        className="relative max-w-[420px]"
      />
    </div>
  )
}

function LocationList({ locations, globalIndices, removeLocation, onEdit, dragRef, onDragStart, onDrop, duration, durationUnit, errors, showHeader, timeline }) {
  const productMinutes = productDurationMinutes(duration, durationUnit)
  const totalStopMinutes = sumStopMinutes(locations)
  const exceedsProductDuration = stopDurationsExceedProduct(locations, duration, durationUnit)
  const indexMap = globalIndices || locations.map((_, i) => i)

  if (locations.length === 0) return null

  return (
    <div>
      {showHeader && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-slate-600">
              Itinerary order ({locations.length})
            </p>
            {productMinutes != null && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${
                  exceedsProductDuration
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}
              >
                {formatMinutes(totalStopMinutes)} / {formatMinutes(productMinutes)} duration
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-400 mb-2">
            Stops appear in this order on your itinerary, so arrange them to match the sequence travelers visit them. Drag the grip to reorder; your first stop is position 1.
          </p>
        </>
      )}
      <ul className={`list-none p-0 m-0 space-y-2 ${timeline ? 'relative' : ''}`}>
        {timeline && <span className="absolute left-[25px] top-4 bottom-4 w-px bg-slate-200" aria-hidden="true" />}
        {locations.map((loc, i) => {
          const globalIdx = indexMap[i]
          return (
            <LocationRow
              key={globalIdx}
              loc={loc}
              position={i + 1}
              globalIdx={globalIdx}
              onEdit={onEdit}
              onRemove={removeLocation}
              dragRef={dragRef}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          )
        })}
      </ul>
      {locations.length >= 2 && (
        <p className="text-[12px] text-slate-400 mt-2">Stops display in order</p>
      )}
      {showHeader && errors.locations && (
        <span className="text-[13px] text-red-600 font-medium mt-1">{errors.locations[0]}</span>
      )}
    </div>
  )
}

function LocationRow({ loc, position, globalIdx, onEdit, onRemove, dragRef, onDragStart, onDrop }) {
  function hasDetails(l) {
    return l.description || l.timeSpent != null || l.admissionIncluded
  }

  function detailSummary(l) {
    const parts = []
    if (l.timeSpent != null) parts.push(`${l.timeSpent} ${l.timeSpentUnit}`)
    if (l.admissionIncluded) parts.push(ADMISSION_LABELS[l.admissionIncluded] || '')
    if (l.description) parts.push(l.description.length > 40 ? l.description.slice(0, 40) + '...' : l.description)
    return parts.join(' · ')
  }

  return (
    <li
      draggable
      onDragStart={() => { dragRef.current = globalIdx; if (onDragStart) onDragStart(globalIdx) }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(globalIdx)}
      className="rounded-xl border border-slate-100 bg-white text-sm transition-all hover:border-slate-200 hover:shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="shrink-0 flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs select-none">
          {position}
        </span>
        <span
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 flex items-center"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </span>
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onEdit(globalIdx)}
        >
          <span className="font-medium text-slate-800">
            {loc.address || loc.name}
          </span>
          {loc.address && loc.name && loc.name !== loc.address && (
            <span className="block text-[12px] text-slate-400 mt-0.5 truncate">{loc.name}</span>
          )}
          {loc.city && (
            <span className="block text-[12px] text-slate-400 mt-0.5 truncate">
              {loc.city}{loc.country ? `, ${loc.country}` : ''}
            </span>
          )}
          {hasDetails(loc) ? (
            <span className="block text-[12px] text-slate-400 mt-0.5 truncate">
              {detailSummary(loc)}
            </span>
          ) : (
            <span className="block text-[12px] text-slate-300 mt-0.5 italic">
              Add details &rarr;
            </span>
          )}
        </div>
        <button
          className="shrink-0 w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 cursor-pointer grid place-items-center hover:border-slate-300 hover:text-slate-600 transition-colors"
          onClick={() => onEdit(globalIdx)}
          type="button"
          title="Edit details"
        >
          <Pencil size={14} />
        </button>
        <button
          className="shrink-0 w-7 h-7 rounded-lg border-0 bg-transparent text-slate-400 cursor-pointer grid place-items-center text-xs hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(globalIdx)
          }}
          type="button"
          title="Remove"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

function LocationModal({ index, loc, locations, duration, durationUnit, dayCount, onClose, onUpdate }) {
  const [errors, setErrors] = useState({})

  const totalStopMinutes = sumStopMinutes(locations)
  const productMinutes = productDurationMinutes(duration, durationUnit)
  const exceedsProductDuration = stopDurationsExceedProduct(locations, duration, durationUnit)
  const isMultiDay = dayCount > 1

  function update(field, value) {
    onUpdate(index, { [field]: value })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate() {
    const next = {}
    if (!loc.name || !loc.name.trim()) next.name = 'Name is required'
    if (!loc.description || !loc.description.trim()) next.description = 'Description is required'
    if (loc.timeSpent == null || Number(loc.timeSpent) <= 0) next.timeSpent = 'Estimated time spent is required'
    if (exceedsProductDuration && productMinutes != null) {
      next.duration = `Total stop time (${formatMinutes(totalStopMinutes)}) exceeds the product duration (${formatMinutes(productMinutes)})`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleDone() {
    if (validate()) onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {loc.name ? 'Edit location' : 'Add location details'}
            </h3>
            <p className="text-[13px] text-slate-500 mt-0.5">
              All fields are required to save this stop.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isMultiDay && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Day</label>
              <Select value={String(loc.day || 1)} onValueChange={(v) => update('day', Number(v))}>
                <SelectTrigger className="h-11 border-slate-300 px-3 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: dayCount }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Day {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <p className="text-[12px] text-slate-400 mb-1.5">
              Use a clear, recognizable name so travelers can identify this stop at a glance.
            </p>
            <input
              className={`w-full h-11 border bg-white px-3 text-sm outline-none focus:border-emerald-500 transition-colors ${
                errors.name ? 'border-red-400' : 'border-slate-300'
              }`}
              type="text"
              value={loc.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Komfo Anokye Teaching Hospital"
            />
            {errors.name && <span className="block text-[13px] text-red-600 font-medium mt-1">{errors.name}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <p className="text-[12px] text-slate-400 mb-1.5">
              Describe what travelers will experience here, including standout features and why this stop is worth visiting.
            </p>
            <textarea
              className={`w-full h-20 border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors resize-vertical ${
                errors.description || (loc.description || '').length >= 500
                  ? 'border-red-300'
                  : 'border-slate-300'
              } ${errors.description ? 'text-red-600' : ''}`}
              value={loc.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe what travelers will experience at this location, including any notable features or activities."
              maxLength={500}
            />
            {errors.description && <span className="block text-[13px] text-red-600 font-medium mt-1">{errors.description}</span>}
            <p className={`text-[12px] mt-1 text-right font-medium ${(loc.description || '').length >= 500 ? 'text-red-600' : 'text-slate-400'}`}>{(loc.description || '').length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Estimated time spent at this location <span className="text-red-500">*</span>
            </label>
            <p className="text-[12px] text-slate-400 mb-1.5">
              Estimate how long the group typically stays here so travelers can plan their day and understand the pace.
            </p>
            <div className="flex gap-2">
              <input
                className={`h-11 w-24 border bg-white px-3 text-sm outline-none focus:border-emerald-500 transition-colors ${
                  errors.timeSpent ? 'border-red-400' : 'border-slate-300'
                }`}
                type="number"
                min="0"
                value={loc.timeSpent ?? ''}
                onChange={(e) => update('timeSpent', e.target.value ? Number(e.target.value) : null)}
                placeholder="0"
              />
              <Select
                value={loc.timeSpentUnit || 'minutes'}
                onValueChange={(v) => onUpdate(index, { timeSpentUnit: v })}
              >
                <SelectTrigger className="h-11 w-[120px] border-slate-300 px-3 text-sm">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.timeSpent && <span className="block text-[13px] text-red-600 font-medium mt-1">{errors.timeSpent}</span>}
            {productMinutes != null && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-[12px] font-medium border ${
                exceedsProductDuration
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                Total stop time: {formatMinutes(totalStopMinutes)} / {formatMinutes(productMinutes)} product duration
                {exceedsProductDuration && (
                  <span className="block mt-0.5 text-[12px] font-normal text-red-600">
                    Reduce stop times or increase the product duration to continue.
                  </span>
                )}
              </div>
            )}
            {errors.duration && <span className="block text-[13px] text-red-600 font-medium mt-1">{errors.duration}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Does the tour price include admission to this attraction? <span className="text-red-500">*</span>
            </label>
            <p className="text-[12px] text-slate-400 mb-2">
              Let travelers know whether entry is included in the tour price, paid separately, or simply passed by without stopping.
            </p>
            <div className="space-y-1.5">
              {ADMISSION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name={`admission-${index}`}
                    checked={(loc.admissionIncluded || 'yes') === opt.value}
                    onChange={() => update('admissionIncluded', opt.value)}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt.label}</span>
                    <p className="text-[12px] text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-transparent border-0 cursor-pointer hover:text-slate-800 transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors border-0 cursor-pointer"
            onClick={handleDone}
            type="button"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
