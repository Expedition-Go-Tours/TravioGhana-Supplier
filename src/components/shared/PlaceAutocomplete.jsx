import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import { usePlaces } from '@/hooks/usePlaces'

const TYPE_LABELS = { city: 'City', town: 'Town', attraction: 'Attraction' }

/**
 * PlaceAutocomplete — searchable combobox over the curated places catalog
 * (cities, towns, attractions) with an optional "add custom" fallback.
 *
 * Props:
 *  - value:      current field value (string), kept in sync externally
 *  - onSelect:   (place) => void — place = { name, type, city, region, lat, lng }
 *  - onChange:   (value) => void — fired on every keystroke (free-text sync)
 *  - onAddCustom:(value) => void — fired when the user picks the "+ Add" option
 *  - types:      string[] — restrict results (e.g. ['city', 'town'])
 *  - placeholder, hasError (red border), disabled
 */
export default function PlaceAutocomplete({
  value = '',
  onSelect,
  onChange,
  onAddCustom,
  placeholder = 'Search for a city or place…',
  hasError = false,
  disabled = false,
  types,
}) {
  const [input, setInput] = useState(value)
  const [debounced, setDebounced] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { data: places = [], isFetching } = usePlaces(debounced, types)

  // Sync an external value change (modal open, parent reset, selection) into
  // the field — render-phase adjustment. `debounced` intentionally follows via
  // the debounce effect so typing still debounces.
  if (value !== prevValue) {
    setPrevValue(value)
    setInput(value)
  }

  // Debounce keystrokes so we don't hit the API on every character.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 250)
    return () => clearTimeout(t)
  }, [input])

  // Close on outside click.
  useEffect(() => {
    function onDoc(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setHighlighted(-1)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Keep the highlighted option in view.
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  const handleSelect = useCallback(
    (place) => {
      onSelect?.(place)
      setInput(place.name)
      setOpen(false)
      setHighlighted(-1)
    },
    [onSelect],
  )

  const trimmed = input.trim()
  const exactMatch = places.some(
    (p) => String(p.name || '').toLowerCase() === trimmed.toLowerCase(),
  )
  const showCustom = !!onAddCustom && trimmed.length >= 2 && !exactMatch

  const handleAddCustom = useCallback(() => {
    onAddCustom?.(trimmed)
    setInput(trimmed)
    setOpen(false)
    setHighlighted(-1)
  }, [onAddCustom, trimmed])

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted((p) => (p < places.length - 1 ? p + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted((p) => (p > 0 ? p - 1 : places.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlighted >= 0 && highlighted < places.length) handleSelect(places[highlighted])
        break
      case 'Escape':
        setOpen(false)
        setHighlighted(-1)
        break
      case 'Tab':
        setOpen(false)
        setHighlighted(-1)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setInput(e.target.value)
            onChange?.(e.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? 'place-listbox' : undefined}
          aria-activedescendant={
            highlighted >= 0 ? `place-option-${highlighted}` : undefined
          }
          className={`w-full h-11 border bg-white px-3 pr-9 text-sm outline-none transition-colors ${
            hasError ? 'border-red-400' : 'border-slate-300 focus:border-emerald-500'
          }`}
        />
        {isFetching ? (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" />
        ) : input ? (
          <button
            type="button"
            onClick={() => {
              setInput('')
              onChange?.('')
              setDebounced('')
              setOpen(true)
              setHighlighted(-1)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            aria-label="Clear place search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && (
        <div
          id="place-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
        >
          {isFetching && places.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Searching…
            </div>
          )}

          {!isFetching && places.length === 0 && !showCustom && (
            <div className="px-4 py-3 text-sm text-slate-500">No matching places.</div>
          )}

          {places.map((place, i) => {
            const subtitle = [TYPE_LABELS[place.type] || place.type]
            if (place.city && place.city.toLowerCase() !== String(place.name || '').toLowerCase()) {
              subtitle.push(place.city)
            }
            if (place.region) subtitle.push(place.region)

            return (
              <div
                key={`${place.name}-${i}`}
                id={`place-option-${i}`}
                role="option"
                aria-selected={i === highlighted}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(place)}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-4 py-2.5 cursor-pointer text-sm flex items-start gap-2.5 ${
                  i === highlighted ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
                } ${i < places.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{place.name}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {subtitle.filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )
          })}

          {showCustom && (
            <>
              {places.length > 0 && <div className="border-t border-slate-100" />}
              <button
                type="button"
                onClick={handleAddCustom}
                onMouseDown={(e) => e.preventDefault()}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-emerald-50 transition-colors border-0 bg-transparent cursor-pointer text-slate-700"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-xs font-bold shrink-0">
                  +
                </span>
                <span>
                  Add <strong className="text-slate-800">&quot;{trimmed}&quot;</strong>
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
