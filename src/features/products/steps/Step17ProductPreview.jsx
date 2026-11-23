import { useState } from 'react'
import {
  Pencil, Clock, MapPin, Check, X as XIcon, Bed, UtensilsCrossed, Wine,
  Info, Phone, Ticket, Navigation, Tag, Image as ImageIcon, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { formatCurrency } from '@/lib/utils'
import { ACCOMMODATION_LABELS } from '@/features/products/utils/itineraryConstants'

const CATEGORY_LABELS = { tour: 'Tour', activity: 'Activity', transport: 'Transport' }
const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', challenging: 'Challenging' }
const GUIDE_LABELS = {
  'tour-guide': 'Tour guide',
  driver: 'Driver',
  host: 'Host',
  greeter: 'Greeter',
  'self-guided': 'Self-guided',
  instructor: 'Instructor',
}
const CANCELLATION_LABELS = {
  standard: 'Standard policy',
  all_sales_final: 'All sales are final',
}
const MEETING_LABELS = { meeting_point: 'Meeting point', pickup: 'Pickup' }

const MIN_PHOTOS = 5
const MIN_HIGHLIGHTS = 3
const MIN_INCLUSIONS = 3
const MIN_EXCLUSIONS = 3

function formatDuration(duration, unit) {
  if (duration == null || duration === '') return null
  const n = Number(duration)
  if (Number.isNaN(n)) return null
  const u = unit === 'days' ? 'day' : unit === 'minutes' ? 'minute' : 'hour'
  return `${n} ${u}${n === 1 ? '' : 's'}`
}

function formatCutoff(minutes) {
  const n = Number(minutes)
  if (!n) return 'No cut-off'
  if (n % 60 === 0) return `${n / 60} hour${n / 60 === 1 ? '' : 's'} before start`
  return `${n} minutes before start`
}

const filled = (value) => typeof value === 'string' && value.trim().length > 0
const filledList = (value) => Array.isArray(value) && value.some((item) => filled(item))

function EditButton({ onClick, label = 'Edit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      <Pencil size={12} />
      {label}
    </button>
  )
}

function Section({ title, icon: Icon, onEdit, editLabel, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon && <Icon size={15} className="text-emerald-600" />}
          {title}
        </h3>
        {onEdit && <EditButton onClick={onEdit} label={editLabel} />}
      </div>
      {children}
    </section>
  )
}

function EmptyLine({ children = 'Not added yet' }) {
  return <p className="text-[13px] text-slate-400">{children}</p>
}

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function ListPills({ items, tone = 'slate', empty }) {
  const list = (items || []).filter(filled)
  if (list.length === 0) return <EmptyLine>{empty}</EmptyLine>
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item, i) => <Chip key={`${item}-${i}`} tone={tone}>{item}</Chip>)}
    </div>
  )
}

function CheckList({ items, positive, empty }) {
  const list = (items || []).filter(filled)
  if (list.length === 0) return <EmptyLine>{empty}</EmptyLine>
  return (
    <ul className="space-y-1.5">
      {list.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-start gap-2 text-sm leading-snug text-slate-700">
          {positive ? (
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          ) : (
            <XIcon size={14} className="mt-0.5 shrink-0 text-rose-500" />
          )}
          <span className="min-w-0 [overflow-wrap:anywhere]">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-700 [overflow-wrap:anywhere]">{children}</div>
    </div>
  )
}

/** Long descriptions are what overflowed this card; show the opening, keep the rest one click away. */
function Description({ text }) {
  const [expanded, setExpanded] = useState(false)
  if (!filled(text)) return <EmptyLine>No full description yet</EmptyLine>

  const isLong = text.length > 420
  return (
    <div>
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] ${
          isLong && !expanded ? 'line-clamp-6' : ''
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {expanded ? 'Show less' : 'Show full description'}
          <ChevronDown size={13} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      )}
    </div>
  )
}

function CompletionBar({ sections, onJump }) {
  const ready = sections.filter((section) => section.ready).length
  const total = sections.length
  const missing = sections.filter((section) => !section.ready)
  const percent = total === 0 ? 0 : Math.round((ready / total) * 100)

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">
          {ready} of {total} sections ready
          {missing.length > 0 && (
            <span className="text-slate-400">
              {' · '}
              {missing.slice(0, 2).map((section) => section.title).join(', ')}
              {missing.length > 2 ? ` +${missing.length - 2}` : ''}
            </span>
          )}
        </p>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      {missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {missing.slice(0, 4).map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onJump(section)}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
            >
              Fix {section.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Step17ProductPreview() {
  const s = useProductBuilderStore()
  const navigateTo = useProductBuilderStore((st) => st.navigateTo)

  const durationLabel = formatDuration(s.duration, s.durationUnit)
  const cover = s.coverPhoto || s.photos?.[0]?.url || s.photos?.[0]
  const highlights = (s.highlights || []).filter(filled)
  const photos = (s.photos || []).map((photo) => photo?.url || photo).filter(Boolean)
  const meetingPoints = Array.isArray(s.meetingPoints) && s.meetingPoints.length > 0
    ? s.meetingPoints
    : (s.meetingPoint ? [s.meetingPoint] : [])
  const pickupPoints = s.pickupType === 'area'
    ? (s.pickupAreas || []).map((area) => area.name || area.address).filter(Boolean)
    : (s.pickupLocations || []).map((location) => location.name || location.address).filter(Boolean)

  const pricedCategories = (s.pricingCategories || []).filter((category) => !category.notAllowed && category.price != null)
  const fromPrice = s.uniformPrice != null
    ? s.uniformPrice
    : (pricedCategories.length > 0 ? Math.min(...pricedCategories.map((category) => Number(category.price))) : null)

  // One definition of "ready", used by the progress bar and the fix links, so
  // the count can never disagree with the list below it.
  // Recomputed on render: eleven small objects cost less than a dependency
  // list that has to stay correct as sections are added.
  const sections = ([
    {
      key: 'content',
      title: 'Description',
      ready: filled(s.title) && filled(s.shortDescription) && filled(s.fullDescription) && highlights.length >= MIN_HIGHLIGHTS,
      jump: () => navigateTo('product-content', 'descriptions'),
    },
    {
      key: 'photos',
      title: 'Photos',
      ready: photos.length >= MIN_PHOTOS && Boolean(s.copyrightConfirmed),
      jump: () => navigateTo('media', 'photos'),
    },
    {
      key: 'itinerary',
      title: 'Itinerary',
      ready: Array.isArray(s.locations) && s.locations.length > 0,
      jump: () => navigateTo('product-content', 'locations'),
    },
    {
      key: 'inclusions',
      title: 'Inclusions',
      ready: filledList(s.whatsIncluded)
        && (s.whatsIncluded || []).filter(filled).length >= MIN_INCLUSIONS
        && (s.whatsNotIncluded || []).filter(filled).length >= MIN_EXCLUSIONS,
      jump: () => navigateTo('product-content', 'inclusions'),
    },
    {
      key: 'guide',
      title: 'Guide',
      ready: filled(s.guideType),
      jump: () => navigateTo('product-content', 'guide-info'),
    },
    {
      key: 'extra',
      title: 'Extra information',
      ready: filled(s.emergencyPhone) && Boolean(s.wifiIncludedAnswered),
      jump: () => navigateTo('product-content', 'extra-info'),
    },
    {
      key: 'options',
      title: 'Booking options',
      ready: Array.isArray(s.options) && s.options.length > 0,
      jump: () => navigateTo('option-setup', 'options'),
    },
    {
      key: 'pricing',
      title: 'Pricing',
      ready: fromPrice != null,
      jump: () => navigateTo('option-setup', 'pricing'),
    },
    {
      key: 'meeting',
      title: MEETING_LABELS[s.meetingMode] || 'Meeting point',
      ready: s.meetingMode === 'pickup' ? pickupPoints.length > 0 : meetingPoints.length > 0,
      jump: () => navigateTo('option-setup', 'meeting-point'),
    },
    {
      key: 'cancellation',
      title: 'Cancellation',
      ready: filled(s.cancellationType),
      jump: () => navigateTo('product-content', 'cancellation-policy'),
    },
    {
      key: 'cutoff',
      title: 'Cut-off',
      ready: s.cutoffMinutes != null,
      jump: () => navigateTo('option-setup', 'cutoff'),
    },
  ])

  const missing = sections.filter((section) => !section.ready)

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-4">
      {/* Summary */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid sm:grid-cols-[200px_1fr]">
          <div className="h-40 bg-slate-100 sm:h-full">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-slate-400">No cover photo</div>
            )}
          </div>
          <div className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Review</p>
                <h2 className="mt-1 text-xl font-bold leading-tight text-slate-900 [overflow-wrap:anywhere]">
                  {s.title || <span className="italic text-slate-400">Untitled product</span>}
                </h2>
              </div>
              <EditButton onClick={() => navigateTo('getting-started', 'title')} label="Title" />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {s.category && <Chip tone="emerald">{CATEGORY_LABELS[s.category] || s.category}</Chip>}
              {durationLabel && <Chip><Clock size={11} />{durationLabel}</Chip>}
              {s.difficulty && <Chip>{DIFFICULTY_LABELS[s.difficulty] || s.difficulty}</Chip>}
              {s.language && <Chip>{String(s.language).toUpperCase()}</Chip>}
              {fromPrice != null && <Chip tone="emerald">From {formatCurrency(fromPrice, s.currency)}</Chip>}
            </div>

            {filled(s.shortDescription) && (
              <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{s.shortDescription}</p>
            )}
          </div>
        </div>
        <CompletionBar sections={sections} onJump={(section) => section.jump()} />
      </section>

      {missing.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[13px] leading-relaxed text-amber-900">
            {missing.length} {missing.length === 1 ? 'section is' : 'sections are'} incomplete. You can still
            submit, but the review team may send it back. Use the fix links above or the Edit buttons below.
          </p>
        </div>
      )}

      {/* Content */}
      <Section title="Description and highlights" icon={Info} onEdit={() => navigateTo('product-content', 'descriptions')}>
        <Description text={s.fullDescription} />
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Highlights</p>
          <CheckList items={highlights} positive empty="No highlights yet" />
        </div>
        {s.keywords?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Keywords</p>
            <ListPills items={s.keywords} tone="emerald" />
          </div>
        )}
      </Section>

      {/* Photos: four across, with a count instead of a hundred thumbnails */}
      <Section title="Photos" icon={ImageIcon} onEdit={() => navigateTo('media', 'photos')}>
        {photos.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.slice(0, 8).map((url, i) => (
                <img key={`${url}-${i}`} src={url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-slate-500">
              {photos.length} photo{photos.length === 1 ? '' : 's'}
              {photos.length < MIN_PHOTOS && ` · ${MIN_PHOTOS - photos.length} more needed`}
            </p>
          </>
        ) : <EmptyLine>No photos uploaded</EmptyLine>}
      </Section>

      {/* Itinerary */}
      <Section title="Itinerary" icon={MapPin} onEdit={() => navigateTo('product-content', 'locations')}>
        {(s.locations?.length > 0) ? (
          <ol className="space-y-3">
            {s.locations.map((loc, i) => (
              <li key={loc.id || i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                    {loc.name || loc.address || 'Stop'}
                  </p>
                  {(loc.city || loc.country) && (
                    <p className="text-[12px] text-slate-500">{[loc.city, loc.country].filter(Boolean).join(', ')}</p>
                  )}
                  {filled(loc.description) && (
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{loc.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : <EmptyLine>No itinerary stops added</EmptyLine>}
      </Section>

      {/* Inclusions */}
      <Section title="Inclusions" icon={Check} onEdit={() => navigateTo('product-content', 'inclusions')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Included{(s.whatsIncluded || []).filter(filled).length > 0 && ` · ${(s.whatsIncluded || []).filter(filled).length}`}
            </p>
            <CheckList items={s.whatsIncluded} positive empty="Nothing listed as included" />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Not included{(s.whatsNotIncluded || []).filter(filled).length > 0 && ` · ${(s.whatsNotIncluded || []).filter(filled).length}`}
            </p>
            <CheckList items={s.whatsNotIncluded} empty="Nothing listed as excluded" />
          </div>
        </div>
        {(s.foodProvided || s.meals?.length > 0 || s.drinksIncluded) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {s.foodProvided && <Chip tone="emerald"><UtensilsCrossed size={11} />Food provided</Chip>}
            {s.drinksIncluded && <Chip tone="emerald"><Wine size={11} />Drinks included</Chip>}
            {s.meals?.filter((meal) => filled(meal?.type)).map((meal, i) => (
              <Chip key={i}>{meal.type}{filled(meal.format) ? ` (${meal.format})` : ''}</Chip>
            ))}
          </div>
        )}
      </Section>

      {/* Logistics: four short facts in one card instead of four cards */}
      <Section title="Logistics" icon={Navigation}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Fact label="Guide">
            <div className="flex items-center justify-between gap-2">
              <span>{GUIDE_LABELS[s.guideType] || s.guideType || <span className="text-slate-400">Not specified</span>}</span>
              <button type="button" onClick={() => navigateTo('product-content', 'guide-info')} className="text-[11px] font-semibold text-emerald-700 hover:underline">Edit</button>
            </div>
            {(s.guideMaterials?.audioGuide || s.guideMaterials?.infoBooklet) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.guideMaterials?.audioGuide && <Chip>Audio guide</Chip>}
                {s.guideMaterials?.infoBooklet && <Chip>Info booklet</Chip>}
              </div>
            )}
          </Fact>

          <Fact label={MEETING_LABELS[s.meetingMode] || 'Meeting point'}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {s.meetingMode === 'pickup' ? (
                  <ListPills items={pickupPoints} empty="No pickup area set" />
                ) : meetingPoints.length > 0 ? (
                  <div className="space-y-0.5">
                    {meetingPoints.map((point, i) => (
                      <p key={i}>{[point.name, point.address].filter(Boolean).join(' — ')}</p>
                    ))}
                  </div>
                ) : <span className="text-slate-400">No meeting point set</span>}
                {filled(s.meetingPointDescription) && (
                  <p className="mt-1 text-[12px] text-slate-500">{s.meetingPointDescription}</p>
                )}
              </div>
              <button type="button" onClick={() => navigateTo('option-setup', 'meeting-point')} className="shrink-0 text-[11px] font-semibold text-emerald-700 hover:underline">Edit</button>
            </div>
          </Fact>

          <Fact label="Cancellation">
            <div className="flex items-center justify-between gap-2">
              <span>{CANCELLATION_LABELS[s.cancellationType] || 'Standard policy'}</span>
              <button type="button" onClick={() => navigateTo('product-content', 'cancellation-policy')} className="text-[11px] font-semibold text-emerald-700 hover:underline">Edit</button>
            </div>
            {(s.supplierCanCancelBadWeather || s.supplierCanCancelNotEnoughTravelers) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.supplierCanCancelBadWeather && <Chip tone="amber">May cancel for weather</Chip>}
                {s.supplierCanCancelNotEnoughTravelers && <Chip tone="amber">May cancel if minimum not met</Chip>}
              </div>
            )}
          </Fact>

          <Fact label="Booking cut-off">
            <div className="flex items-center justify-between gap-2">
              <span>{formatCutoff(s.cutoffMinutes)}</span>
              <button type="button" onClick={() => navigateTo('option-setup', 'cutoff')} className="text-[11px] font-semibold text-emerald-700 hover:underline">Edit</button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.instantConfirmation ? <Chip tone="emerald">Instant confirmation</Chip> : <Chip>Manual confirmation</Chip>}
              {s.lastMinuteBookings && <Chip>Last-minute allowed</Chip>}
            </div>
          </Fact>
        </div>
      </Section>

      {/* Extra information */}
      <Section title="Extra information" icon={Info} onEdit={() => navigateTo('product-content', 'extra-info')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Fact label="Not suitable for">
            <ListPills items={s.notSuitableFor} empty="None listed" />
          </Fact>
          <Fact label="Not allowed">
            <ListPills items={s.notAllowed} empty="None listed" />
          </Fact>
          <Fact label="What to bring">
            <ListPills items={s.mandatoryItems} empty="None listed" />
          </Fact>
          <Fact label="Emergency phone">
            {filled(s.emergencyPhone) ? (
              <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{s.emergencyPhone}</span>
            ) : <span className="text-rose-600">Missing — required</span>}
          </Fact>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {s.petFriendly && <Chip tone="emerald">Pet friendly</Chip>}
          {s.wheelchairAccessible && <Chip tone="emerald">Wheelchair accessible</Chip>}
          {s.wifiIncludedAnswered && <Chip tone={s.wifiIncluded ? 'emerald' : 'slate'}>{s.wifiIncluded ? 'Wi-Fi included' : 'No Wi-Fi'}</Chip>}
          {s.passportRequired && <Chip tone="amber"><Ticket size={11} />Passport required</Chip>}
        </div>

        {filled(s.knowBeforeYouGo) && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Know before you go</p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{s.knowBeforeYouGo}</p>
          </div>
        )}
      </Section>

      {/* Options & pricing in one card: they describe the same thing */}
      <Section title="Options and pricing" icon={Tag} onEdit={() => navigateTo('option-setup', 'options')}>
        {(s.options?.length > 0) ? (
          <div className="space-y-2">
            {s.options.map((option, i) => (
              <div key={option.id || i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                    {option.title || 'Untitled option'}
                  </p>
                  {option.refCode && <span className="shrink-0 text-[11px] text-slate-400">{option.refCode}</span>}
                </div>
                {filled(option.description) && (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{option.description}</p>
                )}
                {(option.isPrivate || option.skipTheLine) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {option.isPrivate && <Chip>Private</Chip>}
                    {option.skipTheLine && <Chip>Skip the line</Chip>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <EmptyLine>No booking options added</EmptyLine>}

        <div className="mt-4 border-t border-slate-100 pt-3">
          {s.pricingApproach === 'sameForEveryone' || s.pricingModel === 'perGroup' ? (
            <p className="text-sm text-slate-700">
              {s.uniformPrice != null
                ? <>Price per {s.pricingModel === 'perGroup' ? 'group' : 'person'}: <strong>{formatCurrency(s.uniformPrice, s.currency)}</strong></>
                : <EmptyLine>Price not set</EmptyLine>}
            </p>
          ) : pricedCategories.length > 0 ? (
            <div className="space-y-1.5">
              {pricedCategories.map((category, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-slate-700">
                    {category.name || 'Traveler'}
                    {(category.minAge != null || category.maxAge != null) && (
                      <span className="ml-2 text-[12px] text-slate-400">
                        {category.minAge ?? 0}–{category.maxAge ?? '∞'} yrs
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900">{formatCurrency(category.price, s.currency)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyLine>No pricing set</EmptyLine>}

          <p className="mt-2 text-[12px] text-slate-500">
            Min {s.minParticipants} · Max {s.maxParticipants} travelers
          </p>
        </div>
      </Section>

      {s.durationUnit === 'days' && Number(s.duration) > 1 && (
        <Section title="Accommodation" icon={Bed}>
          {s.accommodationIncluded ? (
            <p className="text-sm text-slate-700">Included in the price.</p>
          ) : <EmptyLine>Not included</EmptyLine>}
          {s.dayLogistics && Object.keys(s.dayLogistics).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(s.dayLogistics).map(([day, log]) => (
                (log?.accommodation || log?.noSleepOver) && (
                  <p key={day} className="text-[13px] text-slate-600">
                    Day {day}: {log.noSleepOver ? 'No overnight stay' : (ACCOMMODATION_LABELS[log.accommodation] || 'Accommodation')}
                  </p>
                )
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
