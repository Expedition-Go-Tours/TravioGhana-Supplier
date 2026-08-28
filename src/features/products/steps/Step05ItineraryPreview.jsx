import { MapPin, Navigation, Flag, Pencil, Bed, UtensilsCrossed, Wine, RotateCcw, Ban } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { ACCOMMODATION_LABELS } from '@/features/products/utils/itineraryConstants'

const ADMISSION_LABELS = { yes: 'Admission included', no: 'Pay separately', passby: 'Pass by', na: 'Pass by' }

const ARRIVAL_LABELS = {
  none: '',
  '5min': 'Arrive 5 minutes before the activity',
  '10min': 'Arrive 10 minutes before the activity',
  '15min': 'Arrive 15 minutes before the activity',
  '20min': 'Arrive 20 minutes before the activity',
  '25min': 'Arrive 25 minutes before the activity',
  '30min': 'Arrive 30 minutes before the activity',
  custom: 'Arrive by the custom time you set',
}

function formatDuration(loc) {
  if (loc.timeSpent == null || loc.timeSpent === '') return null
  const unit = loc.timeSpentUnit || 'minutes'
  const label = unit === 'hours'
    ? `${loc.timeSpent} hour${Number(loc.timeSpent) === 1 ? '' : 's'}`
    : `${loc.timeSpent} minute${Number(loc.timeSpent) === 1 ? '' : 's'}`
  return label
}

function stopTitle(loc) {
  return loc.name && loc.name.trim() ? loc.name : (loc.address || 'Stop')
}

function stopMeta(loc) {
  const parts = []
  if (loc.city) parts.push(loc.city)
  if (loc.country) parts.push(loc.country)
  if (loc.address && loc.address !== loc.name) parts.push(loc.address)
  return parts.join(', ')
}

function EditButton({ onClick, label = 'Edit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium cursor-pointer hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
    >
      <Pencil size={13} />
      {label}
    </button>
  )
}

function TimelineNode({ children, rail = true }) {
  return (
    <div className="relative pl-9 pb-8 last:pb-0">
      {rail && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200" />}
      {children}
    </div>
  )
}

function NodeDot({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white border-slate-300 text-slate-600',
    emerald: 'bg-emerald-600 border-emerald-600 text-white',
    amber: 'bg-amber-50 border-amber-300 text-amber-700',
  }
  return (
    <span className={`absolute left-0 top-0 grid place-items-center w-7 h-7 rounded-full border-2 ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function Step05ItineraryPreview() {
  const locations = useProductBuilderStore((s) => s.locations)
  const duration = useProductBuilderStore((s) => s.duration)
  const durationUnit = useProductBuilderStore((s) => s.durationUnit)
  const meetingMode = useProductBuilderStore((s) => s.meetingMode)
  const meetingPoint = useProductBuilderStore((s) => s.meetingPoint)
  const meetingPoints = useProductBuilderStore((s) => s.meetingPoints)
  const arrivalTimeType = useProductBuilderStore((s) => s.arrivalTimeType)
  const arrivalTimeCustom = useProductBuilderStore((s) => s.arrivalTimeCustom)
  const pickupType = useProductBuilderStore((s) => s.pickupType)
  const pickupAreas = useProductBuilderStore((s) => s.pickupAreas)
  const pickupLocations = useProductBuilderStore((s) => s.pickupLocations)
  const pickupDescription = useProductBuilderStore((s) => s.pickupDescription)
  const dropoffOption = useProductBuilderStore((s) => s.dropoffOption)
  const dropoffLocation = useProductBuilderStore((s) => s.dropoffLocation)
  const dropoffDescription = useProductBuilderStore((s) => s.dropoffDescription)
  const dayLogistics = useProductBuilderStore((s) => s.dayLogistics)
  const navigateTo = useProductBuilderStore((s) => s.navigateTo)
  const setPreviewFocus = useProductBuilderStore((s) => s.setPreviewFocus)

  function editMeeting() {
    setPreviewFocus({ step: 'meeting-point', section: 'meeting' })
    navigateTo('option-setup', 'meeting-point')
  }

  function editPickup() {
    setPreviewFocus({ step: 'meeting-point', section: 'pickup' })
    navigateTo('option-setup', 'meeting-point')
  }

  function editDropoff() {
    setPreviewFocus({ step: 'meeting-point', section: 'dropoff' })
    navigateTo('option-setup', 'meeting-point')
  }

  const isMultiDay = durationUnit === 'days' && typeof duration === 'number' && duration > 1

  function editStop(index) {
    setPreviewFocus({ step: 'locations', index })
    navigateTo('product-content', 'locations')
  }

  const groupedByDay = isMultiDay
    ? locations.reduce((acc, loc, idx) => {
        const d = loc.day ?? 1
        if (!acc[d]) acc[d] = []
        acc[d].push({ ...loc, _globalIdx: idx })
        return acc
      }, {})
    : null

  // Sequential display position for each stop in true itinerary order (Day 1
  // first, then Day 2, ...). The raw array index is no longer a reliable
  // ordering signal once stops are grouped by day, so we number them by their
  // position in the rendered timeline instead.
  const stopNumber = (() => {
    const map = new Map()
    if (isMultiDay && groupedByDay) {
      let n = 0
      for (const dayNum of Object.keys(groupedByDay).sort((a, b) => Number(a) - Number(b))) {
        for (const loc of groupedByDay[dayNum]) {
          map.set(loc._globalIdx, ++n)
        }
      }
    } else {
      locations.forEach((_, i) => map.set(i, i + 1))
    }
    return map
  })()

  const start = (() => {
    if (meetingMode === 'pickup') {
      return {
        kind: 'pickup',
        title: pickupType === 'area' ? 'Pickup area' : 'Pickup locations',
        lines: pickupType === 'area'
          ? (pickupAreas || []).map((a) => a.name || a.address).filter(Boolean)
          : (pickupLocations || []).map((l) => l.name || l.address).filter(Boolean),
        note: pickupDescription || '',
        onEdit: editPickup,
      }
    }
    if (meetingMode === 'meeting_point') {
      const arrival = arrivalTimeType === 'custom'
        ? (arrivalTimeCustom ? `Arrive by ${arrivalTimeCustom}` : 'Arrive by the custom time you set')
        : (ARRIVAL_LABELS[arrivalTimeType] || '')
      const pts = Array.isArray(meetingPoints) && meetingPoints.length > 0
        ? meetingPoints
        : (meetingPoint ? [meetingPoint] : [])
      return {
        kind: 'meeting',
        title: pts.length > 1 ? 'Meeting points' : 'Meeting point',
        lines: pts.map((p) => [p.name, p.address].filter(Boolean)).flat(),
        note: arrival,
        onEdit: editMeeting,
      }
    }
    return null
  })()

  const end = (() => {
    if (dropoffOption === 'same_location') {
      return {
        title: 'End point',
        lines: [meetingMode === 'pickup' ? 'Returns to the pickup point' : 'Returns to the meeting point'],
        note: '',
      }
    }
    if (dropoffOption === 'different_location') {
      return {
        title: 'Drop-off point',
        lines: dropoffLocation ? [dropoffLocation.name, dropoffLocation.address].filter(Boolean) : [],
        note: 'Customers are dropped off at a different place',
      }
    }
    if (dropoffOption === 'customer_preferred') {
      return {
        title: "Customer's drop-off",
        lines: [dropoffDescription || "Drop-off at customer's preferred location"],
        note: 'Customers choose their own drop-off point',
      }
    }
    return null
  })()

  return (
    <div className="max-w-[720px] space-y-5">
      <p className="text-[13px] text-slate-500 mb-1 leading-relaxed">
        This is how travelers will see your itinerary. Stops follow the order you set in Locations; pickup and drop-off come from Meeting Point or Pickup. Click Edit on any section to jump straight back to it.
      </p>

      {locations.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800 mb-1">No itinerary stops yet</p>
          <p className="text-[13px] text-amber-700 mb-3">
            Add the locations customers will visit in the Locations step to build your itinerary.
          </p>
          <EditButton onClick={() => navigateTo('product-content', 'locations')} label="Add locations" />
        </div>
      )}

      {locations.length > 0 && (
        <div data-field="itinerary-preview" className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <Flag size={16} className="text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Itinerary</h3>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {locations.length} stop{locations.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-0">
            {start && (
              <TimelineNode rail>
                <NodeDot tone="emerald">
                  <MapPin size={14} />
                </NodeDot>
                <div className="pt-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{start.title}</p>
                    <EditButton onClick={start.onEdit} />
                  </div>
                  {start.lines.length > 0 ? (
                    <div className="mt-1">
                      {start.lines.map((line, i) => (
                        <p key={i} className="text-sm text-slate-800 font-medium">{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400 italic">Not set yet</p>
                  )}
                  {start.note && <p className="mt-0.5 text-[13px] text-slate-500">{start.note}</p>}
                </div>
              </TimelineNode>
            )}

            {isMultiDay && groupedByDay
              ? Object.keys(groupedByDay).sort((a, b) => Number(a) - Number(b)).map((dayNum) => {
                  const dayStops = groupedByDay[dayNum]
                  const isLastDay = Number(dayNum) === Math.max(...Object.keys(groupedByDay).map(Number))
                  return (
                    <div key={`day-${dayNum}`} className="mb-2">
                      <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isLastDay ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}>
                          {isLastDay ? 'Final Day' : `Day ${dayNum}`}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {dayStops.length} stop{dayStops.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {(() => {
                        const log = dayLogistics?.[dayNum] || {}
                        const hasNoSleepOver = isLastDay && !!log.noSleepOver
                        const hasReturnToStart = isLastDay && !!log.returnToStart
                        const hasMeals = log.meals?.length > 0
                        const hasDrinks = !!log.drinksIncluded
                        const hasAccommodation = !hasNoSleepOver && !!log.accommodation
                        if (!hasAccommodation && !hasMeals && !hasDrinks && !hasReturnToStart) return null
                        return (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[12px] text-slate-500">
                            {hasAccommodation && (
                              <span className="flex items-center gap-1">
                                <Bed size={12} className="text-slate-400" />
                                {ACCOMMODATION_LABELS[log.accommodation]}
                              </span>
                            )}
                            {hasMeals && (
                              <span className="flex items-center gap-1">
                                <UtensilsCrossed size={12} className="text-slate-400" />
                                {log.meals.map((m) => `${m.type}${m.format ? ` (${m.format})` : ''}`).join(', ')}
                              </span>
                            )}
                            {hasDrinks && (
                              <span className="flex items-center gap-1">
                                <Wine size={12} className="text-slate-400" />
                                Drinks included
                              </span>
                            )}
                            {hasReturnToStart && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <RotateCcw size={12} />
                                Returns to start point
                              </span>
                            )}
                            {hasNoSleepOver && (
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <Ban size={12} />
                                No overnight stay
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      {dayStops.map((loc, i) => (
                        <TimelineNode key={loc._globalIdx} rail={!isLastDay || i < dayStops.length - 1 || !!end}>
                          <NodeDot>{stopNumber.get(loc._globalIdx)}</NodeDot>
                          <div className="pt-0.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-slate-900">{stopTitle(loc)}</p>
                              <EditButton onClick={() => editStop(loc._globalIdx)} />
                            </div>
                            {stopMeta(loc) && (
                              <p className="mt-0.5 text-[13px] text-slate-500">{stopMeta(loc)}</p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              {formatDuration(loc) && (
                                <span className="text-[12px] text-slate-600">Duration: {formatDuration(loc)}</span>
                              )}
                              {loc.admissionIncluded && (
                                <span className="text-[12px] text-slate-600">{ADMISSION_LABELS[loc.admissionIncluded]}</span>
                              )}
                            </div>
                            {loc.description && (
                              <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{loc.description}</p>
                            )}
                          </div>
                        </TimelineNode>
                      ))}
                    </div>
                  )
                })
              : locations.map((loc, i) => (
              <TimelineNode key={i} rail={i < locations.length - 1 || !!end}>
                <NodeDot>{stopNumber.get(i)}</NodeDot>
                <div className="pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">{stopTitle(loc)}</p>
                    <EditButton onClick={() => editStop(i)} />
                  </div>
                  {stopMeta(loc) && (
                    <p className="mt-0.5 text-[13px] text-slate-500">{stopMeta(loc)}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {formatDuration(loc) && (
                      <span className="text-[12px] text-slate-600">Duration: {formatDuration(loc)}</span>
                    )}
                    {loc.admissionIncluded && (
                      <span className="text-[12px] text-slate-600">{ADMISSION_LABELS[loc.admissionIncluded]}</span>
                    )}
                  </div>
                  {loc.description && (
                    <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{loc.description}</p>
                  )}
                </div>
              </TimelineNode>
            ))}

            {end && (
              <TimelineNode rail={false}>
                <NodeDot tone="amber">
                  <Navigation size={14} />
                </NodeDot>
                <div className="pt-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{end.title}</p>
                    <EditButton onClick={editDropoff} />
                  </div>
                  <div className="mt-1">
                    {end.lines.map((line, i) => (
                      <p key={i} className="text-sm text-slate-800 font-medium">{line}</p>
                    ))}
                  </div>
                  {end.note && <p className="mt-0.5 text-[13px] text-slate-500">{end.note}</p>}
                </div>
              </TimelineNode>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
