import { Pencil, Clock, Users, MapPin, Check, X as XIcon, ShieldCheck, Bed, UtensilsCrossed, Wine, Info, Phone, Ticket, Ban, Navigation, Tag } from 'lucide-react'
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

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium cursor-pointer hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
    >
      <Pencil size={13} />
      Edit
    </button>
  )
}

function Section({ title, icon: Icon, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={16} className="text-emerald-600" />}
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        {onEdit && <EditButton onClick={onEdit} />}
      </div>
      {children}
    </section>
  )
}

function EmptyLine({ children = 'Not provided yet' }) {
  return <p className="text-[13px] text-slate-400 italic">{children}</p>
}

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function ListPills({ items, tone = 'slate' }) {
  if (!items || items.length === 0) return <EmptyLine />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => <Chip key={i} tone={tone}>{item}</Chip>)}
    </div>
  )
}

function CheckList({ items, positive }) {
  if (!items || items.length === 0) return <EmptyLine />
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          {positive ? (
            <Check size={15} className="shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <XIcon size={15} className="shrink-0 text-rose-500 mt-0.5" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Step17ProductPreview() {
  const s = useProductBuilderStore()
  const navigateTo = useProductBuilderStore((st) => st.navigateTo)

  const durationLabel = formatDuration(s.duration, s.durationUnit)
  const cover = s.coverPhoto || s.photos?.[0]?.url || s.photos?.[0]
  const highlights = (s.highlights || []).filter((h) => h && h.trim())
  const meetingPoints = Array.isArray(s.meetingPoints) && s.meetingPoints.length > 0
    ? s.meetingPoints
    : (s.meetingPoint ? [s.meetingPoint] : [])
  const pickupPoints = s.pickupType === 'area'
    ? (s.pickupAreas || []).map((a) => a.name || a.address).filter(Boolean)
    : (s.pickupLocations || []).map((l) => l.name || l.address).filter(Boolean)

  return (
    <div className="max-w-[860px] space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="text-sm font-semibold text-emerald-900">Product preview</p>
        <p className="text-[13px] text-emerald-800/80 mt-1 leading-relaxed">
          This is how travelers will see your product. Review everything below before submitting.
          Use the Edit buttons to jump back to any step.
        </p>
      </div>

      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-72 bg-slate-100">
          {cover ? (
            <img src={cover} alt={s.title || 'Product cover'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-400 text-sm">No cover photo</div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {s.title || <span className="text-slate-400 italic">Untitled product</span>}
            </h2>
            <EditButton onClick={() => navigateTo('getting-started', 'title')} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {s.category && <Chip tone="emerald">{CATEGORY_LABELS[s.category] || s.category}</Chip>}
            {durationLabel && <Chip><Clock size={12} />{durationLabel}</Chip>}
            {s.difficulty && <Chip>{DIFFICULTY_LABELS[s.difficulty] || s.difficulty}</Chip>}
            {s.language && <Chip>{String(s.language).toUpperCase()}</Chip>}
          </div>
          {s.shortDescription && (
            <p className="text-sm text-slate-600 mt-4 leading-relaxed">{s.shortDescription}</p>
          )}
        </div>
      </section>

      {/* Description & highlights */}
      <Section title="Description & highlights" icon={Info} onEdit={() => navigateTo('product-content', 'descriptions')}>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {s.fullDescription || <span className="text-slate-400 italic">No full description yet</span>}
        </p>
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Highlights</p>
          <CheckList items={highlights} positive />
        </div>
        {(s.keywords?.length > 0) && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Keywords</p>
            <ListPills items={s.keywords} tone="emerald" />
          </div>
        )}
      </Section>

      {/* Photos */}
      <Section title="Photos" icon={MapPin} onEdit={() => navigateTo('media', 'photos')}>
        {(s.photos?.length > 0) ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {s.photos.map((p, i) => {
              const url = p?.url || p
              return <img key={i} src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
            })}
          </div>
        ) : <EmptyLine>No photos uploaded</EmptyLine>}
      </Section>

      {/* Itinerary */}
      <Section title="Itinerary" icon={MapPin} onEdit={() => navigateTo('product-content', 'locations')}>
        {(s.locations?.length > 0) ? (
          <ol className="space-y-4">
            {s.locations.map((loc, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {loc.name || loc.address || 'Stop'}
                  </p>
                  {(loc.city || loc.country) && (
                    <p className="text-[12px] text-slate-500">{[loc.city, loc.country].filter(Boolean).join(', ')}</p>
                  )}
                  {loc.description && (
                    <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{loc.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : <EmptyLine>No itinerary stops added</EmptyLine>}
      </Section>

      {/* Inclusions */}
      <Section title="What's included" icon={Check} onEdit={() => navigateTo('product-content', 'inclusions')}>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Included</p>
            <CheckList items={s.whatsIncluded} positive />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Not included</p>
            <CheckList items={s.whatsNotIncluded} />
          </div>
        </div>
        {(s.foodProvided || s.meals?.length > 0 || s.drinksIncluded) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {s.foodProvided && <Chip tone="emerald"><UtensilsCrossed size={12} />Food provided</Chip>}
            {s.drinksIncluded && <Chip tone="emerald"><Wine size={12} />Drinks included</Chip>}
            {s.meals?.map((m, i) => <Chip key={i}>{m.type}{m.format ? ` (${m.format})` : ''}</Chip>)}
          </div>
        )}
      </Section>

      {/* Guide */}
      <Section title="Guide information" icon={Users} onEdit={() => navigateTo('product-content', 'guide-info')}>
        <p className="text-sm text-slate-700">{GUIDE_LABELS[s.guideType] || s.guideType || 'Not specified'}</p>
        {(s.guideMaterials?.audioGuide || s.guideMaterials?.infoBooklet) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {s.guideMaterials?.audioGuide && <Chip>Audio guide</Chip>}
            {s.guideMaterials?.infoBooklet && <Chip>Info booklet</Chip>}
          </div>
        )}
      </Section>

      {/* Extra info */}
      <Section title="Extra information" icon={Info} onEdit={() => navigateTo('product-content', 'extra-info')}>
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Not suitable for</p>
            <ListPills items={s.notSuitableFor} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Not allowed</p>
            <ListPills items={s.notAllowed} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">What to bring</p>
            <ListPills items={s.mandatoryItems} />
          </div>
          {s.knowBeforeYouGo && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Know before you go</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{s.knowBeforeYouGo}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {s.petFriendly && <Chip tone="emerald">Pet friendly</Chip>}
            {s.wheelchairAccessible && <Chip tone="emerald">Wheelchair accessible</Chip>}
            {s.wifiIncluded && <Chip tone="emerald">Wi-Fi included</Chip>}
            {s.passportRequired && <Chip tone="amber"><Ticket size={12} />Passport required</Chip>}
          </div>
          {s.emergencyPhone && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Phone size={14} className="text-slate-400" /> Emergency phone: {s.emergencyPhone}
            </p>
          )}
        </div>
      </Section>

      {/* Booking options */}
      <Section title="Booking options" icon={Ticket} onEdit={() => navigateTo('option-setup', 'options')}>
        {(s.options?.length > 0) ? (
          <div className="space-y-3">
            {s.options.map((opt, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{opt.title || 'Untitled option'}</p>
                  {opt.refCode && <span className="text-[11px] text-slate-400">{opt.refCode}</span>}
                </div>
                {opt.description && <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">{opt.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {opt.isPrivate && <Chip>Private</Chip>}
                  {opt.skipTheLine && <Chip>Skip the line</Chip>}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyLine>No booking options added</EmptyLine>}
      </Section>

      {/* Pricing */}
      <Section title="Pricing" icon={Tag} onEdit={() => navigateTo('option-setup', 'pricing')}>
        {s.pricingApproach === 'sameForEveryone' || s.pricingModel === 'perGroup' ? (
          <p className="text-sm text-slate-700">
            {s.uniformPrice != null
              ? <>Price per {s.pricingModel === 'perGroup' ? 'group' : 'person'}: <strong>{formatCurrency(s.uniformPrice, s.currency)}</strong></>
              : <EmptyLine>Price not set</EmptyLine>}
          </p>
        ) : (s.pricingCategories?.filter((c) => !c.notAllowed)?.length > 0) ? (
          <div className="space-y-2">
            {s.pricingCategories.filter((c) => !c.notAllowed).map((cat, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">
                  {cat.name || 'Traveler'}
                  {(cat.minAge != null || cat.maxAge != null) && (
                    <span className="text-slate-400 text-[12px] ml-2">
                      {cat.minAge ?? 0}–{cat.maxAge ?? '∞'} yrs
                    </span>
                  )}
                </span>
                <span className="font-semibold text-slate-900">
                  {cat.price != null ? formatCurrency(cat.price, s.currency) : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : <EmptyLine>No pricing set</EmptyLine>}
        <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-slate-500">
          <span>Min {s.minParticipants} · Max {s.maxParticipants} travelers</span>
        </div>
      </Section>

      {/* Meeting / pickup */}
      <Section title={s.meetingMode === 'pickup' ? 'Pickup' : 'Meeting point'} icon={Navigation} onEdit={() => navigateTo('option-setup', 'meeting-point')}>
        {s.meetingMode === 'pickup' ? (
          <ListPills items={pickupPoints} />
        ) : meetingPoints.length > 0 ? (
          <div className="space-y-1">
            {meetingPoints.map((p, i) => (
              <p key={i} className="text-sm text-slate-700">{[p.name, p.address].filter(Boolean).join(' — ')}</p>
            ))}
          </div>
        ) : <EmptyLine>No meeting point set</EmptyLine>}
        {s.meetingPointDescription && (
          <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">{s.meetingPointDescription}</p>
        )}
      </Section>

      {/* Cancellation */}
      <Section title="Cancellation policy" icon={ShieldCheck} onEdit={() => navigateTo('product-content', 'cancellation-policy')}>
        <p className="text-sm text-slate-700">
          {CANCELLATION_LABELS[s.cancellationType] || 'Standard policy'}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {s.supplierCanCancelBadWeather && <Chip tone="amber">Supplier may cancel for bad weather</Chip>}
          {s.supplierCanCancelNotEnoughTravelers && <Chip tone="amber">Supplier may cancel if minimum not met</Chip>}
        </div>
      </Section>

      {/* Cut-off */}
      <Section title="Booking cut-off" icon={Clock} onEdit={() => navigateTo('option-setup', 'cutoff')}>
        <p className="text-sm text-slate-700">{formatCutoff(s.cutoffMinutes)}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {s.instantConfirmation ? <Chip tone="emerald">Instant confirmation</Chip> : <Chip>Manual confirmation</Chip>}
          {s.lastMinuteBookings && <Chip>Last-minute bookings allowed</Chip>}
        </div>
      </Section>

      {/* Accommodation note for multi-day */}
      {s.durationUnit === 'days' && Number(s.duration) > 1 && (
        <Section title="Accommodation" icon={Bed}>
          {s.accommodationIncluded ? (
            <p className="text-sm text-slate-700">Accommodation is included.</p>
          ) : <EmptyLine>Accommodation not included</EmptyLine>}
          {s.dayLogistics && Object.keys(s.dayLogistics).length > 0 && (
            <div className="mt-3 space-y-2">
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

      {/* Warnings */}
      {(s.notSuitableFor?.length === 0 && s.notAllowed?.length === 0 && s.whatsIncluded?.length === 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <Ban size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[13px] text-amber-800 leading-relaxed">
            Some sections look incomplete. You can still submit, but our review team may ask for changes.
            Use the Edit buttons above to complete anything that&rsquo;s missing.
          </p>
        </div>
      )}
    </div>
  )
}
