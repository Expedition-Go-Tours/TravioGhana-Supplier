import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, X, HelpCircle } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { ACTIVITY_CATEGORIES, TOUR_TRANSPORT_CATEGORIES, TRANSPORT_SERVICE_CATEGORIES } from '@/constants/gygLists'
import { isMultiDayTour } from '@/features/products/utils/itineraryConstants'

const DURATION_UNITS = ['minutes', 'hours', 'days']

const PRODUCT_TYPES = [
  {
    value: 'tour',
    label: 'Tour',
    description: 'A guided visit to one or more sites',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <path d="M14 26l3-8 4 5 3-3 4 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="14" r="2" fill="#0d9488" />
        <circle cx="26" cy="12" r="2" fill="#0d9488" />
        <circle cx="20" cy="18" r="2" fill="#0d9488" />
      </svg>
    ),
  },
  {
    value: 'activity',
    label: 'Activity',
    description: 'An instructed or interactive experience',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <circle cx="20" cy="14" r="4" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <path d="M12 28c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 12l2-2m0 0l2-2m-2 2l2 2m-2-2l-2-2" stroke="#0d9488" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'transport',
    label: 'Transport',
    description: 'Transferring travelers between locations, with a focus on transportation rather than sightseeing',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <rect x="10" y="16" width="20" height="10" rx="2" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <rect x="12" y="13" width="16" height="5" rx="1" stroke="#0d9488" strokeWidth="1.2" fill="none" />
        <circle cx="15" cy="28" r="2" stroke="#0d9488" strokeWidth="1.2" fill="none" />
        <circle cx="25" cy="28" r="2" stroke="#0d9488" strokeWidth="1.2" fill="none" />
        <line x1="12" y1="22" x2="28" y2="22" stroke="#0d9488" strokeWidth="1" />
      </svg>
    ),
  },
]

function HierarchicalSelect({ categories, selected, onAdd, onRemove, placeholder, searchPlaceholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState(new Set())
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return Object.entries(categories)
    const q = search.toLowerCase()
    return Object.entries(categories)
      .map(([cat, items]) => [cat, items.filter((item) => item.toLowerCase().includes(q))])
      .filter(([, items]) => items.length > 0)
  }, [categories, search])

  function toggleCategory(cat) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleItem(item) {
    if (selected.includes(item)) onRemove(item)
    else onAdd(item)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-left text-sm flex items-center justify-between hover:border-slate-300 transition-colors"
      >
        <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
          {selected.length ? `${selected.length} selected` : placeholder || 'Select one (or more)'}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
              {item}
              <button type="button" onClick={() => onRemove(item)} className="p-0.5 hover:bg-slate-200 rounded">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-[320px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder || 'Search...'}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredCategories.map(([cat, items]) => {
              const isExpanded = expandedCategories.has(cat) || search.trim().length > 0
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium">{cat}</span>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="bg-slate-50/50">
                      {items.map((item) => {
                        const isSelected = selected.includes(item)
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleItem(item)}
                            className="w-full flex items-center gap-2.5 px-6 py-2 text-sm text-left hover:bg-slate-100 transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                            }`}>
                              {isSelected && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span className={isSelected ? 'text-emerald-700 font-medium' : 'text-slate-600'}>{item}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredCategories.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Step02Category() {
  const category = useProductBuilderStore((s) => s.category)
  const activitiesIncluded = useProductBuilderStore((s) => s.activitiesIncluded)
  const transportModes = useProductBuilderStore((s) => s.transportModes)
  const transportServices = useProductBuilderStore((s) => s.transportServices)
  const difficulty = useProductBuilderStore((s) => s.difficulty)
  const duration = useProductBuilderStore((s) => s.duration)
  const durationUnit = useProductBuilderStore((s) => s.durationUnit)
  const accommodationIncluded = useProductBuilderStore((s) => s.accommodationIncluded)
  const setField = useProductBuilderStore((s) => s.setField)
  const clearStepErrors = useProductBuilderStore((s) => s.clearStepErrors)
  const errors = useStepErrors(3)

  // Accommodation only applies to multi-day tours (per-day overnight stays)
  const showAccommodation = isMultiDayTour(duration, durationUnit)

  // Debounce: once the supplier finishes editing the duration, prune stale
  // dayLogistics (and reset accommodationIncluded) so keystrokes like typing
  // "12" don't transiently clear per-day data on the intermediate "1".
  useEffect(() => {
    const t = setTimeout(() => {
      const s = useProductBuilderStore.getState()
      s.normalizeDayLogistics(s.duration, s.durationUnit)
    }, 600)
    return () => clearTimeout(t)
  }, [duration, durationUnit])

  function addActivity(item) {
    setField('activitiesIncluded', [...activitiesIncluded, item])
  }
  function removeActivity(item) {
    setField('activitiesIncluded', activitiesIncluded.filter((a) => a !== item))
  }
  function addTransportMode(item) {
    setField('transportModes', [...transportModes, item])
  }
  function removeTransportMode(item) {
    setField('transportModes', transportModes.filter((t) => t !== item))
  }
  function addTransportService(item) {
    setField('transportServices', [...transportServices, item])
  }
  function removeTransportService(item) {
    setField('transportServices', transportServices.filter((t) => t !== item))
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">What type of product are you creating?</h2>
        <p className="text-sm text-slate-500">
          Please choose carefully as it impacts the following sections and you won't be able to edit this later.
        </p>
      </div>

      {/* Product type cards */}
      <div className="space-y-3" data-field="category">
        {PRODUCT_TYPES.map((type) => {
          const isSelected = category === type.value
          return (
            <label
              key={type.value}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="relative mt-0.5">
                <input
                  type="radio"
                  name="productType"
                  checked={isSelected}
                  onChange={() => setField('category', type.value)}
                  className="peer sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <div className="shrink-0">{type.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{type.label}</span>
                  <HelpCircle size={14} className="text-slate-400" />
                </div>
                <p className="text-[13px] text-slate-500 mt-0.5">{type.description}</p>

                {/* Sub-question for Activity */}
                {isSelected && type.value === 'activity' && (
                  <div className="mt-3" data-field="activitiesIncluded">
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      What activities are included?
                    </label>
                    <HierarchicalSelect
                      categories={ACTIVITY_CATEGORIES}
                      selected={activitiesIncluded}
                      onAdd={addActivity}
                      onRemove={removeActivity}
                      placeholder="Select one (or more)"
                      searchPlaceholder="Search activities"
                    />
                    {errors.activitiesIncluded && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.activitiesIncluded[0]}</span>}
                  </div>
                )}

                {/* Sub-question for Tour */}
                {isSelected && type.value === 'tour' && (
                  <div className="mt-3" data-field="transportModes">
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      What modes of transportation are used during the tour?
                    </label>
                    <HierarchicalSelect
                      categories={TOUR_TRANSPORT_CATEGORIES}
                      selected={transportModes}
                      onAdd={addTransportMode}
                      onRemove={removeTransportMode}
                      placeholder="Select one (or more)"
                      searchPlaceholder="Search modes of transport"
                    />
                    {errors.transportModes && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.transportModes[0]}</span>}
                  </div>
                )}

                {/* Sub-question for Transport */}
                {isSelected && type.value === 'transport' && (
                  <div className="mt-3" data-field="transportServices">
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      What type of transportation service are you providing?
                    </label>
                    <HierarchicalSelect
                      categories={TRANSPORT_SERVICE_CATEGORIES}
                      selected={transportServices}
                      onAdd={addTransportService}
                      onRemove={removeTransportService}
                      placeholder="Select one (or more)"
                      searchPlaceholder="Search transportation types"
                    />
                    {errors.transportServices && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.transportServices[0]}</span>}
                  </div>
                )}
              </div>
            </label>
          )
        })}
        {errors.category && <span className="text-[13px] text-red-600 font-medium">{errors.category[0]}</span>}
      </div>

      <hr className="border-slate-100" />

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Difficulty level
        </label>
        <div className="flex gap-2">
          {['easy', 'moderate', 'challenging', 'extreme'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setField('difficulty', level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                difficulty === level
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        {errors.difficulty && <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.difficulty[0]}</span>}
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Duration
        </label>
        <div className="flex gap-3">
          <div className="w-[90px]">
            <input
              data-field="duration"
              type="number"
              min="0.5"
              step="0.5"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus-ring"
              placeholder="e.g. 2"
              value={duration ?? ''}
              onChange={(e) => setField('duration', e.target.value ? parseFloat(e.target.value) : null)}
            />
            {errors.duration && <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.duration[0]}</span>}
          </div>
          <div>
            <select
              value={durationUnit}
              onChange={(e) => setField('durationUnit', e.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              data-field="durationUnit"
            >
              {DURATION_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {errors.durationUnit && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.durationUnit[0]}</span>}
          </div>
        </div>
      </div>

      {/* Accommodation Included - show when duration >= 24 hours */}
      {showAccommodation && (
        <div className="mb-5" data-field="accommodationIncluded">
          <label className="block text-sm font-semibold mb-2 text-slate-800">
            Is accommodation included? <span className="text-red-500">*</span>
          </label>
          <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
            <button
              type="button"
              onClick={() => { setField('accommodationIncluded', false); clearStepErrors(3); }}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                !accommodationIncluded
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => { setField('accommodationIncluded', true); clearStepErrors(3); }}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
                accommodationIncluded
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Yes
            </button>
          </div>
          {errors.accommodationIncluded && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.accommodationIncluded[0]}</span>}
        </div>
      )}
    </div>
  )
}
