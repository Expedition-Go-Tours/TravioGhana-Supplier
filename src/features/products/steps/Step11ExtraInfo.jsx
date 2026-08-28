import { useRef, useState } from 'react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { GYG_MANDATORY_ITEMS, GYG_NOT_ALLOWED, GYG_NOT_SUITABLE_FOR } from '@/constants/gygLists'
import PhoneInput from '@/components/forms/PhoneInput'
import {
  EXTRA_INFO_TAG_MAX_CHARS,
  KNOW_BEFORE_YOU_GO_MAX_CHARS,
  VOUCHER_INFO_MAX_CHARS,
  limitMessage,
} from '@/features/products/productFormSchema'

function TagList({ items, onAdd, onRemove, placeholder, suggestions = [] }) {
  const inputRef = useRef(null)
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const atLimit = inputValue.length >= EXTRA_INFO_TAG_MAX_CHARS

  function handleAdd(val) {
    const value = (typeof val === 'string' ? val : inputValue).trim()
    if (value) {
      onAdd(value)
      setInputValue('')
      if (inputRef.current) inputRef.current.focus()
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !items.some((item) => item.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full text-[13px] font-semibold"
          >
            {item}
            <button
              onClick={() => onRemove(i)}
              type="button"
              className="bg-transparent border-0 cursor-pointer text-xs text-slate-500 p-0"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className={`flex-1 min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
            atLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          maxLength={EXTRA_INFO_TAG_MAX_CHARS}
          aria-invalid={atLimit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          className="shrink-0 h-[46px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold border-0 cursor-pointer hover:bg-emerald-700 transition-colors"
          type="button"
          disabled={!inputValue.trim()}
        >
          Add
        </button>
      </div>
      <div className="flex items-center justify-between mt-1">
        {atLimit ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{limitMessage(EXTRA_INFO_TAG_MAX_CHARS)}</span>
        ) : (
          <span />
        )}
        <span className={`text-[13px] tabular-nums shrink-0 ${atLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
          {inputValue.length} / {EXTRA_INFO_TAG_MAX_CHARS}
        </span>
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg mt-1">
          {filteredSuggestions.slice(0, 20).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onAdd(suggestion)
                setInputValue('')
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Step09ExtraInfo() {
  const notSuitableFor = useProductBuilderStore((s) => s.notSuitableFor)
  const notAllowed = useProductBuilderStore((s) => s.notAllowed)
  const petFriendly = useProductBuilderStore((s) => s.petFriendly)
  const wheelchairAccessible = useProductBuilderStore((s) => s.wheelchairAccessible)
  const wifiIncluded = useProductBuilderStore((s) => s.wifiIncluded)
  const mandatoryItems = useProductBuilderStore((s) => s.mandatoryItems)
  const knowBeforeYouGo = useProductBuilderStore((s) => s.knowBeforeYouGo)
  const emergencyPhone = useProductBuilderStore((s) => s.emergencyPhone)
  const voucherInfo = useProductBuilderStore((s) => s.voucherInfo)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(9)
  const addNotSuitable = useProductBuilderStore((s) => s.addNotSuitable)
  const removeNotSuitable = useProductBuilderStore((s) => s.removeNotSuitable)
  const addNotAllowed = useProductBuilderStore((s) => s.addNotAllowed)
  const removeNotAllowed = useProductBuilderStore((s) => s.removeNotAllowed)
  const addMandatoryItem = useProductBuilderStore((s) => s.addMandatoryItem)
  const removeMandatoryItem = useProductBuilderStore((s) => s.removeMandatoryItem)

  const knowBeforeAtLimit = knowBeforeYouGo.length >= KNOW_BEFORE_YOU_GO_MAX_CHARS
  const voucherAtLimit = voucherInfo.length >= VOUCHER_INFO_MAX_CHARS

  return (
    <div className="max-w-[720px]">
      <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
        All fields on this page are optional.
      </p>

      <div className="mb-5" data-field="notSuitableFor">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Who is this activity not suitable for?
        </label>
        <TagList
          items={notSuitableFor}
          onAdd={addNotSuitable}
          onRemove={removeNotSuitable}
          placeholder="e.g. Pregnant women, People with back problems"
          suggestions={GYG_NOT_SUITABLE_FOR}
        />
        {errors.notSuitableFor && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.notSuitableFor[0]}</span>}
      </div>

      <div className="mb-5" data-field="notAllowed">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          What's not allowed?
        </label>
        <TagList
          items={notAllowed}
          onAdd={addNotAllowed}
          onRemove={removeNotAllowed}
          placeholder="e.g. Pets, Smoking, Large bags"
          suggestions={GYG_NOT_ALLOWED}
        />
        {errors.notAllowed && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.notAllowed[0]}</span>}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Pet policy</label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={petFriendly}
            onChange={(e) => setField('petFriendly', e.target.checked)}
            className="w-[18px] h-[18px] cursor-pointer"
            data-field="petFriendly"
          />
          <span>Pets are allowed</span>
        </label>
        {errors.petFriendly && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.petFriendly[0]}</span>}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Wheelchair accessibility</label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={wheelchairAccessible}
            onChange={(e) => setField('wheelchairAccessible', e.target.checked)}
            className="w-[18px] h-[18px] cursor-pointer"
            data-field="wheelchairAccessible"
          />
          <span>Activity is wheelchair accessible</span>
        </label>
        {errors.wheelchairAccessible && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.wheelchairAccessible[0]}</span>}
      </div>

      <div className="mb-5" data-field="wifiIncluded">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Is WiFi or internet included? <span className="text-red-500">*</span>
        </label>
        <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setField('wifiIncluded', false)}
            className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
              !wifiIncluded
                ? 'bg-white text-slate-800 shadow-sm'
                : 'bg-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setField('wifiIncluded', true)}
            className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
              wifiIncluded
                ? 'bg-white text-slate-800 shadow-sm'
                : 'bg-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Yes
          </button>
        </div>
        {errors.wifiIncluded && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.wifiIncluded[0]}</span>}
      </div>

      <div className="mb-5" data-field="mandatoryItems">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          What mandatory items must the customer bring?
        </label>
        <TagList
          items={mandatoryItems}
          onAdd={addMandatoryItem}
          onRemove={removeMandatoryItem}
          placeholder="e.g. Passport, Comfortable shoes, Swimsuit"
          suggestions={GYG_MANDATORY_ITEMS}
        />
        {errors.mandatoryItems && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.mandatoryItems[0]}</span>}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Know before you go</label>
        <textarea
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring resize-vertical ${
            knowBeforeAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          rows={4}
          value={knowBeforeYouGo}
          onChange={(e) => setField('knowBeforeYouGo', e.target.value)}
          maxLength={KNOW_BEFORE_YOU_GO_MAX_CHARS}
          aria-invalid={!!errors.knowBeforeYouGo || knowBeforeAtLimit}
          placeholder="Insurance requirements, appropriate clothing, necessary documents..."
          data-field="knowBeforeYouGo"
        />
        <div className="flex items-center justify-between mt-1">
          {errors.knowBeforeYouGo ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{errors.knowBeforeYouGo[0]}</span>
          ) : knowBeforeAtLimit ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{limitMessage(KNOW_BEFORE_YOU_GO_MAX_CHARS)}</span>
          ) : (
            <span />
          )}
          <span className={`text-[13px] tabular-nums shrink-0 ${knowBeforeAtLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
            {knowBeforeYouGo.length} / {KNOW_BEFORE_YOU_GO_MAX_CHARS}
          </span>
        </div>
      </div>

      <div className="mb-5" data-field="emergencyPhone">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Emergency contact number</label>
        <PhoneInput
          value={emergencyPhone}
          onChange={(val) => setField('emergencyPhone', val)}
          defaultCountry="US"
          placeholder="Phone number"
        />
        <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
          This number will appear on the customer voucher.
        </p>
        {errors.emergencyPhone && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.emergencyPhone[0]}</span>}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Information on the voucher</label>
        <textarea
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring resize-vertical ${
            voucherAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          rows={4}
          value={voucherInfo}
          onChange={(e) => setField('voucherInfo', e.target.value)}
          maxLength={VOUCHER_INFO_MAX_CHARS}
          aria-invalid={!!errors.voucherInfo || voucherAtLimit}
          placeholder="Any additional information customers need after booking..."
          data-field="voucherInfo"
        />
        <div className="flex items-center justify-between mt-1">
          {errors.voucherInfo ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{errors.voucherInfo[0]}</span>
          ) : voucherAtLimit ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{limitMessage(VOUCHER_INFO_MAX_CHARS)}</span>
          ) : (
            <span />
          )}
          <span className={`text-[13px] tabular-nums shrink-0 ${voucherAtLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
            {voucherInfo.length} / {VOUCHER_INFO_MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  )
}