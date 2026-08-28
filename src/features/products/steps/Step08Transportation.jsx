import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, HelpCircle } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { GYG_TRANSPORT_TYPES } from '@/constants/gygLists'

export default function Step08Transportation() {
  const transportationProvided = useProductBuilderStore((s) => s.transportationProvided)
  const pickupTransportTypes = useProductBuilderStore((s) => s.pickupTransportTypes)
  const setField = useProductBuilderStore((s) => s.setField)
  const addPickupTransportType = useProductBuilderStore((s) => s.addPickupTransportType)
  const removePickupTransportType = useProductBuilderStore((s) => s.removePickupTransportType)
  const errors = useStepErrors(8)

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return GYG_TRANSPORT_TYPES
    const q = search.toLowerCase()
    return GYG_TRANSPORT_TYPES.filter((t) => t.toLowerCase().includes(q))
  }, [search])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleItem(item) {
    if (pickupTransportTypes.includes(item)) {
      removePickupTransportType(pickupTransportTypes.indexOf(item))
    } else {
      addPickupTransportType(item)
    }
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <div data-field="transportationProvided">
        {errors.transportationProvided && <span className="text-[13px] text-red-600 font-medium mb-2 block">{errors.transportationProvided[0]}</span>}
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm font-semibold text-slate-800">
            Is transportation used during this activity?
          </label>
          <HelpCircle size={16} className="text-blue-500" />
        </div>
        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          Provide the main transportation type(s) that customers use during the experience,
          like a Segway or bike. Transportation used for pickup and drop-off will be added
          later.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="transportationProvided"
              checked={transportationProvided === false}
              onChange={() => setField('transportationProvided', false)}
              className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">No</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="transportationProvided"
              checked={transportationProvided === true}
              onChange={() => setField('transportationProvided', true)}
              className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Yes</span>
          </label>
        </div>
      </div>

      {transportationProvided && (
        <div ref={ref} className="relative" data-field="pickupTransportTypes">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Search for items"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {pickupTransportTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pickupTransportTypes.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  {item}
                  <button type="button" onClick={() => removePickupTransportType(pickupTransportTypes.indexOf(item))} className="p-0.5 hover:bg-slate-200 rounded">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-[300px] overflow-y-auto">
              {filtered.map((type) => {
                const selected = pickupTransportTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleItem(type)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                      selected ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="px-3.5 py-3 text-sm text-slate-400">No results found</p>
              )}
            </div>
            )}
          {errors.pickupTransportTypes && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.pickupTransportTypes[0]}</span>}
        </div>
      )}
    </div>
  )
}
