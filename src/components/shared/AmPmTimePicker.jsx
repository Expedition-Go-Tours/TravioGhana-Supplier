import { Clock, ChevronDown, X } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function normalize24(time24) {
  if (!time24) return ''
  const [h, m] = String(time24).split(':')
  const hour = parseInt(h, 10)
  const minute = parseInt(m, 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toAmPm(time24) {
  const normalized = normalize24(time24)
  if (!normalized) return { hour: '08', minute: '00', period: 'AM' }
  const [h, m] = normalized.split(':')
  const hour24 = parseInt(h, 10)
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  return { hour: String(hour12).padStart(2, '0'), minute: m || '00', period }
}

function to24Hour(hour, minute, period) {
  let h = parseInt(hour, 10)
  if (period === 'AM' && h === 12) h = 0
  else if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

function Dropdown({ value, options, onChange, width = 'w-[64px]', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`h-10 ${width} flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:border-[#00838F] transition-colors`}
      >
        <span>{value}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl max-h-48 overflow-y-auto"
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={opt === value}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors ${
                opt === value
                  ? 'bg-[#00838F]/10 text-[#00838F]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 12-hour time control.
 *
 * `allowEmpty` is for the pickup planner: a missing time must read "No time
 * set", not a fabricated 08:00 AM that the supplier can accidentally save.
 * Existing callers keep the old always-set behaviour.
 */
export default function AmPmTimePicker({
  value,
  onChange,
  className = '',
  allowEmpty = false,
  emptyLabel = 'No time set',
  defaultTime = '08:00',
  onClear,
}) {
  const normalized = normalize24(value)
  const { hour, minute, period } = toAmPm(normalized)
  const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort()

  const setHour = useCallback((h) => onChange(to24Hour(h, minute, period)), [minute, period, onChange])
  const setMinute = useCallback((m) => onChange(to24Hour(hour, m, period)), [hour, period, onChange])
  const setPeriod = useCallback((p) => onChange(to24Hour(hour, minute, p)), [hour, minute, onChange])

  if (allowEmpty && !normalized) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Clock size={14} className="text-slate-400 shrink-0" />
        <span className="text-sm text-slate-500">{emptyLabel}</span>
        <button
          type="button"
          onClick={() => onChange(defaultTime)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#00838F] hover:text-[#00838F]"
        >
          Set time
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Clock size={14} className="text-slate-400 shrink-0" />
      <Dropdown value={hour} options={HOURS} onChange={setHour} width="w-[56px]" label="Pickup hour" />
      <span className="text-slate-400 font-medium text-sm">:</span>
      <Dropdown value={minute} options={minuteOptions} onChange={setMinute} width="w-[56px]" label="Pickup minute" />
      <div className="flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label="AM or PM">
        <button
          type="button"
          onClick={() => setPeriod('AM')}
          aria-pressed={period === 'AM'}
          className={`px-2.5 h-10 text-xs font-bold transition-colors ${
            period === 'AM'
              ? 'bg-[#00838F] text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => setPeriod('PM')}
          aria-pressed={period === 'PM'}
          className={`px-2.5 h-10 text-xs font-bold transition-colors ${
            period === 'PM'
              ? 'bg-[#00838F] text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          PM
        </button>
      </div>
      {allowEmpty && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(''))}
          aria-label="Clear pickup time"
          className="ml-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  )
}
