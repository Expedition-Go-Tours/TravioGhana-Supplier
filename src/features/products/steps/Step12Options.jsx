import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  ArrowLeft, Plus, Check,
  Copy, Trash2,
} from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import DraftNumberInput from '@/components/ui/DraftNumberInput'

const MAX_OPTIONS = 8

const SKIP_THE_LINE_OPTIONS = [
  { value: 'skip_tickets', label: 'Skip the line to get tickets' },
  { value: 'separate_entrance', label: 'Separate entrance' },
  { value: 'express_security', label: 'Express security' },
  { value: 'express_elevators', label: 'Express elevators' },
]

const VALIDITY_TYPE_OPTIONS = [
  { value: 'open_ended', label: 'Customer can use their ticket anytime' },
  { value: 'date_picked', label: 'Valid only on the selected booking date' },
  { value: 'period', label: 'Valid for a set period from the booking date' },
]

function NoYesPill({ value, onChange }) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
          !value
            ? 'bg-white text-slate-800 shadow-sm'
            : 'bg-transparent text-slate-400 hover:text-slate-600'
        }`}
      >
        No
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
          value
            ? 'bg-white text-slate-800 shadow-sm'
            : 'bg-transparent text-slate-400 hover:text-slate-600'
        }`}
      >
        Yes
      </button>
    </div>
  )
}

const CONFIRMATION_MODES = [
  {
    value: true,
    title: 'Instant confirmation',
    desc: 'Bookings are confirmed automatically as soon as payment is received. You don’t need to do anything.',
  },
  {
    value: false,
    title: 'Manual confirmation',
    desc: 'Bookings stay pending after payment until you accept them in the Bookings section. Customer is told to wait for your confirmation.',
  },
]

function ConfirmationModeCard({ value, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-1">
        Booking confirmation
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">
        Choose how new bookings for this tour are confirmed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONFIRMATION_MODES.map((mode) => {
          const selected = value === mode.value
          return (
            <button
              key={String(mode.value)}
              type="button"
              onClick={() => onChange(mode.value)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                selected
                  ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  {mode.title}
                  {selected && <Check size={14} className="text-emerald-600 shrink-0" />}
                </span>
                <span className="block text-xs text-slate-500 leading-relaxed mt-1">
                  {mode.desc}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SkipLinePills({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {SKIP_THE_LINE_OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {selected && <Check size={12} className="shrink-0" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function TicketValidityBlock({ option, index, updateOption }) {
  const validityType = option.validityType === 'from_activation' ? 'open_ended' : (option.validityType || 'open_ended')

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800 mb-1">How long will the ticket be valid?</h4>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">This determines when and for how long customers can use their ticket after booking. Choose whether it's flexible or tied to a specific date — this affects how your availability and cut-off times work.</p>

      <div className="space-y-3">
        {VALIDITY_TYPE_OPTIONS.map(({ value, label }) => {
          const selected = validityType === value
          const needsValidityInput = value === 'period'
          return (
            <label key={value} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name={`validityType_${index}`}
                checked={selected}
                onChange={() => updateOption(index, {
                  validityType: value === 'open_ended' ? 'from_activation' : value,
                  validity: needsValidityInput ? (option.validity ?? 1) : null,
                  validityUnit: needsValidityInput ? (option.validityUnit ?? 'days') : null,
                  validityStartDate: '',
                  validityEndDate: '',
                })}
                className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-700">{label}</span>
                {needsValidityInput && selected && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[13px] text-slate-500">Valid for</span>
                    <DraftNumberInput
                      className="w-20 min-h-[34px] rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm transition-all focus-ring text-right"
                      min={1}
                      value={option.validity ?? 1}
                      onCommit={(v) => updateOption(index, { validity: v == null ? 1 : v })}
                    />
                    <Select value={option.validityUnit ?? 'days'} onValueChange={(v) => updateOption(index, { validityUnit: v })}>
                      <SelectTrigger className="min-h-[34px] h-9 text-sm px-2 border-slate-200 rounded-lg w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hour(s)</SelectItem>
                        <SelectItem value="days">Day(s)</SelectItem>
                        <SelectItem value="weeks">Week(s)</SelectItem>
                        <SelectItem value="months">Month(s)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[13px] text-slate-500">from booking date</span>
                  </div>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function OptionSummaryCard({ option, index, onEdit, onDuplicate, onRemove }) {
  const featurePills = []
  if (option.isPrivate) featurePills.push({ label: 'Private', type: 'private' })
  if (option.skipTheLine && option.skipTheLine !== 'none') featurePills.push({ label: 'Skip line', type: 'skip' })
  if (option.audioGuide) featurePills.push({ label: 'Audio guide', type: 'audio' })
  if (option.infoBooklet) featurePills.push({ label: 'Booklet', type: 'booklet' })
  if (option.maxGroupSize) featurePills.push({ label: `Max ${option.maxGroupSize} ppl`, type: 'group' })

  let durationSummary
  if (option.validityType === 'open_ended' || option.validityType === 'from_activation') {
    durationSummary = 'Valid anytime'
  } else if (option.validityType === 'period') {
    durationSummary = `Valid ${option.validity || 1} ${option.validityUnit || 'days'} from booking`
  } else {
    durationSummary = 'Valid on selected date'
  }


  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              {option.title || 'Untitled'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>{durationSummary}</span>
            {option.refCode && option.refCode !== 'default' && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Ref: {option.refCode}</span>
              </>
            )}
          </div>

          {featurePills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {featurePills.map((p) => (
                <span key={p.type} className={`text-[11px] font-medium px-2 py-0.5 rounded-full leading-none ${
                  p.type === 'private' ? 'bg-violet-100 text-violet-600' :
                  p.type === 'wc' ? 'bg-emerald-100 text-emerald-600' :
                  p.type === 'skip' ? 'bg-amber-100 text-amber-600' :
                  p.type === 'audio' ? 'bg-emerald-100 text-emerald-600' :
                  p.type === 'booklet' ? 'bg-teal-100 text-teal-600' :
                  p.type === 'group' ? 'bg-orange-100 text-orange-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all bg-transparent border-0 cursor-pointer"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all bg-transparent border-0 cursor-pointer"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(index)}
            className="px-3 h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all border-0 cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionEditorScreen({ option, index, updateOption, onBack, onRemove, errors }) {
  const titleError = errors[`options.${index}.title`]

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 bg-transparent border-0 cursor-pointer transition-colors"
      >
        <ArrowLeft size={16} />
        Back to options
      </button>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-sm font-semibold text-slate-800">{option.title || 'Untitled'}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="ml-auto w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all bg-transparent border-0 cursor-pointer"
          title="Remove option"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mx-auto" style={{ maxWidth: '600px' }}>
        <div className="mb-6" data-field={`options.${index}.title`}>
          <label className="block text-sm font-semibold text-slate-800 mb-1">
            Option title <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm transition-all focus-ring"
            type="text"
            value={option.title}
            onChange={(e) => updateOption(index, { title: e.target.value })}
            placeholder="e.g. Standard tour, Private experience, etc."
          />
          {titleError && <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{titleError[0]}</span>}
        </div>

        <hr className="border-slate-100 mb-6" />

        <div className="mb-6" data-field={`options.${index}.refCode`}>
          <label className="block text-sm font-semibold text-slate-800 mb-1">
            Option reference code <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            Provide a reference code to help you keep track of which option the customer has booked. This is for your own records and won&apos;t be seen by the customer.
          </p>
          <div className="relative">
            <input
              className={`w-full min-h-[42px] rounded-lg border bg-white px-3.5 py-2 text-sm transition-all focus-ring pr-16 ${
                (option.refCode ?? '').length >= 20 ? 'border-red-300 text-red-600' : 'border-slate-200'
              }`}
              type="text"
              value={option.refCode ?? ''}
              onChange={(e) => updateOption(index, { refCode: e.target.value })}
              maxLength={20}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${(option.refCode ?? '').length >= 20 ? 'text-red-600' : 'text-slate-400'}`}>
              {(option.refCode ?? '').length} / 20
            </span>
          </div>
        </div>

        <hr className="border-slate-100 mb-6" />

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-800 mb-1">
            Is this a private activity?
          </label>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            This means that only one group or person can participate. There won&apos;t be other customers in the same activity.
          </p>
          <NoYesPill
            value={option.isPrivate}
            onChange={(v) => updateOption(index, { isPrivate: v })}
          />
        </div>

        <hr className="border-slate-100 mb-6" />

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Will the customer skip the line to get in? If so, which line?
          </label>
          <NoYesPill
            value={option.skipTheLine !== 'none'}
            onChange={(v) => updateOption(index, { skipTheLine: v ? 'skip_tickets' : 'none' })}
          />
          {option.skipTheLine !== 'none' && (
            <SkipLinePills
              value={option.skipTheLine}
              onChange={(v) => updateOption(index, { skipTheLine: v })}
            />
          )}
        </div>

        <hr className="border-slate-100 mb-6" />

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-800 mb-3">
            Ticket validity
          </label>
          <TicketValidityBlock option={option} index={index} updateOption={updateOption} />
        </div>
      </div>
    </motion.div>
  )
}

export default function Step12Options() {
  const options = useProductBuilderStore((s) => s.options)
  const addOption = useProductBuilderStore((s) => s.addOption)
  const updateOption = useProductBuilderStore((s) => s.updateOption)
  const removeOption = useProductBuilderStore((s) => s.removeOption)
  const duplicateOption = useProductBuilderStore((s) => s.duplicateOption)
  const instantConfirmation = useProductBuilderStore((s) => s.instantConfirmation)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(12)

  const [editingIndex, setEditingIndex] = useState(null)
  const [showIntro, setShowIntro] = useState(true)
  const creatingRef = useRef(false)
  const prevCountRef = useRef(options.length)

  useEffect(() => {
    if (creatingRef.current && options.length > prevCountRef.current) {
      setEditingIndex(options.length - 1)
      setShowIntro(false)
      creatingRef.current = false
    }
    prevCountRef.current = options.length
  }, [options.length])

  function handleCreate() {
    creatingRef.current = true
    addOption()
  }

  function handleEdit(index) {
    setEditingIndex(index)
  }

  function handleBack() {
    setEditingIndex(null)
  }

  const count = options.length
  const atLimit = count >= MAX_OPTIONS
  const nearLimit = count >= 6 && count < MAX_OPTIONS

  if (editingIndex !== null && options[editingIndex]) {
    return (
      <div className="max-w-[720px]" data-field="options">
        {errors.options && (
          <div className="flex items-center gap-1.5 text-[13px] text-red-600 font-medium mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.5" />
              <path d="M7 4V8M7 9.5V9.51" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {errors.options[0]}
          </div>
        )}
        <OptionEditorScreen
          option={options[editingIndex]}
          index={editingIndex}
          updateOption={updateOption}
          onBack={handleBack}
          onRemove={removeOption}
          errors={errors}
        />
      </div>
    )
  }

  if (showIntro && count === 0) {
    return (
      <div className="max-w-[720px]" data-field="options">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Add booking option(s) to your product</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Options allow you to customize your activity and attract more customers. For example, your options can have different:
          </p>
          <ul className="text-sm text-slate-500 space-y-1 mb-4 list-disc pl-5">
            <li>durations (1 or 2 hours)</li>
            <li>group sizes (10 or 20 people) or set-ups (private or public)</li>
            <li>languages (English or Spanish)</li>
            <li>inclusions (with or without lunch)</li>
            <li>ways to start the activity (meeting point or hotel pickup)</li>
          </ul>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The option is where the pricing/availability are stored, and where bookings are made. So you need at least one option per product to start receiving bookings.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all border-0 cursor-pointer"
          >
            <Plus size={16} />
            Create new option
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[720px]" data-field="options">
      {errors.options && (
        <div className="flex items-center gap-1.5 text-[13px] text-red-600 font-medium mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.5" />
            <path d="M7 4V8M7 9.5V9.51" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {errors.options[0]}
        </div>
      )}

      <ConfirmationModeCard
        value={instantConfirmation}
        onChange={(v) => setField('instantConfirmation', v)}
      />

      {count === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">No options yet</h4>
          <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
            You need at least one option to make your product bookable. Create one now.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all border-0 cursor-pointer"
          >
            <Plus size={16} />
            Create new option
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Product options</h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                atLimit ? 'bg-red-100 text-red-600' :
                nearLimit ? 'bg-amber-100 text-amber-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {count}/{MAX_OPTIONS}
              </span>
            </div>
            {!showIntro && count > 0 && (
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-transparent border-0 cursor-pointer transition-colors"
              >
                Show info
              </button>
            )}
          </div>

          {showIntro && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
              <p className="text-sm text-slate-500 leading-relaxed mb-3">
                Options allow you to customize your activity and attract more customers. For example, your options can have different:
              </p>
              <ul className="text-sm text-slate-500 space-y-0.5 mb-3 list-disc pl-5">
            <li>ticket validity (valid on selected date or for a set period)</li>
                <li>group sizes (10 or 20 people) or set-ups (private or public)</li>
                <li>languages (English or Spanish)</li>
                <li>inclusions (with or without lunch)</li>
                <li>ways to start the activity (meeting point or hotel pickup)</li>
              </ul>
              <p className="text-sm text-slate-500 leading-relaxed">
                The option is where the pricing/availability are stored, and where bookings are made. So you need at least one option per product to start receiving bookings.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowIntro(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer transition-colors"
                >
                  Hide info
                </button>
              </div>
            </div>
          )}

          {nearLimit && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[13px] font-medium text-amber-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="#D97706" strokeWidth="1.5" />
                <path d="M8 5V9M8 11V11.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              You&apos;re approaching the recommended limit of {MAX_OPTIONS} options. Consider using add-ons for smaller variations.
            </div>
          )}

          {atLimit && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[13px] font-medium text-red-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5" />
                <path d="M8 5V9M8 11V11.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Maximum {MAX_OPTIONS} options reached. Remove an option or create a separate product for additional variations.
            </div>
          )}

          <div className="space-y-2">
            {options.map((opt, i) => (
              <OptionSummaryCard
                key={opt.id}
                option={opt}
                index={i}
                onEdit={handleEdit}
                onDuplicate={duplicateOption}
                onRemove={removeOption}
              />
            ))}
          </div>

          {!atLimit && (
            <button
              type="button"
              onClick={handleCreate}
              className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-slate-200 bg-transparent text-sm font-semibold text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all cursor-pointer"
            >
              <Plus size={16} className="group-hover:scale-110 transition-transform" />
              Add another option
            </button>
          )}
        </div>
      )}
    </div>
  )
}
