import { Clock, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function toAmPm(time24) {
  if (!time24) return { hour: '08', minute: '00', period: 'AM' }
  const [h, m] = time24.split(':')
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

function Dropdown({ value, options, onChange, width = 'w-[64px]' }) {
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`h-10 ${width} flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:border-[#00838F] transition-colors`}
      >
        <span>{value}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
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

export default function AmPmTimePicker({ value, onChange, className = '' }) {
  const { hour, minute, period } = toAmPm(value)

  const setHour = useCallback((h) => onChange(to24Hour(h, minute, period)), [minute, period, onChange])
  const setMinute = useCallback((m) => onChange(to24Hour(hour, m, period)), [hour, period, onChange])
  const setPeriod = useCallback((p) => onChange(to24Hour(hour, minute, p)), [hour, minute, onChange])

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Clock size={14} className="text-slate-400 shrink-0" />
      <Dropdown value={hour} options={HOURS} onChange={setHour} width="w-[56px]" />
      <span className="text-slate-400 font-medium text-sm">:</span>
      <Dropdown value={minute} options={MINUTES} onChange={setMinute} width="w-[56px]" />
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setPeriod('AM')}
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
          className={`px-2.5 h-10 text-xs font-bold transition-colors ${
            period === 'PM'
              ? 'bg-[#00838F] text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  )
}
