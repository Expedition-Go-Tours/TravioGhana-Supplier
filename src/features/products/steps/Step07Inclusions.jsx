import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Info, HelpCircle, Plus, Trash2, X } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { DIETARY_OPTIONS } from '@/constants/gygLists'
import { INCLUSION_ITEM_MAX_CHARS, limitMessage } from '@/features/products/productFormSchema'
import { MEAL_TYPES, MEAL_FORMATS_BY_TYPE } from '@/features/products/utils/itineraryConstants'

function DietarySelect({ selected, onAdd, onRemove }) {
  function toggle(opt) {
    if (selected.includes(opt)) onRemove(selected.indexOf(opt))
    else onAdd(opt)
  }

  return (
    <div className="mt-3">
      <label className="block text-sm font-semibold text-slate-800 mb-1">Which dietary restrictions can you accommodate?</label>
      <p className="text-[13px] text-slate-500 mb-3">Please select all that are relevant</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {DIETARY_OPTIONS.map((opt) => {
          const isChecked = selected.includes(opt)
          return (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(opt)}
                  className="peer sr-only"
                />
                <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
                  isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 group-hover:border-slate-400'
                }`}>
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function InclusionList({ items, field, placeholder, accent }) {
  const addInclusionItem = useProductBuilderStore((s) => s.addInclusionItem)
  const removeInclusionItem = useProductBuilderStore((s) => s.removeInclusionItem)
  const updateInclusionItem = useProductBuilderStore((s) => s.updateInclusionItem)
  const inputRefs = useRef([])
  const isEmerald = accent === 'emerald'

  function handleAdd() {
    addInclusionItem(field, '')
    setTimeout(() => {
      inputRefs.current[items.length]?.focus()
    }, 0)
  }

  const label = isEmerald ? 'inclusion' : 'exclusion'

  return (
    <div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const atLimit = item.length >= INCLUSION_ITEM_MAX_CHARS
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <input
                  ref={(el) => { inputRefs.current[i] = el }}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm transition-all focus-ring"
                  type="text"
                  value={item}
                  onChange={(e) => updateInclusionItem(field, i, e.target.value)}
                  maxLength={INCLUSION_ITEM_MAX_CHARS}
                  aria-invalid={atLimit}
                  placeholder={placeholder}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs tabular-nums ${atLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                    {item.length} / {INCLUSION_ITEM_MAX_CHARS}
                  </span>
                </div>
                {atLimit && (
                  <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    {limitMessage(INCLUSION_ITEM_MAX_CHARS)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeInclusionItem(field, i)}
                className="shrink-0 w-7 h-7 mt-1.5 rounded-lg border-0 bg-transparent text-slate-400 cursor-pointer grid place-items-center hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </div>
      {items.length === 0 ? (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="underline">
            Add {label}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="underline">
            Add another {label}
          </span>
        </button>
      )}
    </div>
  )
}



export default function Step07Inclusions() {
  const store = useProductBuilderStore()
  const {
    whatsIncluded,
    whatsNotIncluded,
    foodProvided,
    meals,
    drinksIncluded,
    showDietaryRestrictions,
    dietaryOptions,
    duration,
    durationUnit,
  } = store
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(7)
  const addMeal = useProductBuilderStore((s) => s.addMeal)
  const updateMeal = useProductBuilderStore((s) => s.updateMeal)
  const removeMeal = useProductBuilderStore((s) => s.removeMeal)
  const addDietaryOption = useProductBuilderStore((s) => s.addDietaryOption)
  const removeDietaryOption = useProductBuilderStore((s) => s.removeDietaryOption)

  const isMultiDay = durationUnit === 'days' && typeof duration === 'number' && duration > 1

  return (
    <div className="max-w-[720px] space-y-6">
      {/* What's Included */}
      <div data-field="whatsIncluded">
        <label className="block text-sm font-semibold mb-1.5 text-slate-800">What's included?</label>
        <InclusionList
          items={whatsIncluded}
          field="whatsIncluded"
          placeholder="e.g. Entrance fees, Guide, Equipment"
          accent="emerald"
        />
        {errors.whatsIncluded && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.whatsIncluded[0]}</span>}
      </div>

      {/* What's Not Included */}
      <div data-field="whatsNotIncluded">
        <label className="block text-sm font-semibold mb-1.5 text-slate-800">What's not included?</label>
        <InclusionList
          items={whatsNotIncluded}
          field="whatsNotIncluded"
          placeholder="e.g. Food, Drinks, Hotel pickup"
          accent="rose"
        />
        {errors.whatsNotIncluded && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.whatsNotIncluded[0]}</span>}
      </div>

      {!isMultiDay && (
        <>
          <hr className="border-slate-100" />

      {/* Food & Drinks */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <h3 className="text-base font-semibold text-slate-900">Food & drinks</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
            <Info className="w-3.5 h-3.5" />
            Customizable
          </span>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-semibold text-slate-800">Is food included in your activity?</label>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="foodProvided"
                data-field="foodProvided"
                checked={foodProvided === false}
                onChange={() => setField('foodProvided', false)}
                className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">No</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="foodProvided"
                data-field="foodProvided"
                checked={foodProvided === true}
                onChange={() => {
                  setField('foodProvided', true)
                  if (meals.length === 0) addMeal()
                }}
                className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">Yes</span>
            </label>
          </div>
          {errors.foodProvided && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.foodProvided[0]}</span>}
        </div>

        {foodProvided && (
          <div className="space-y-4">
            {/* Meal rows */}
            <div className="space-y-3" data-field="meals">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Meals</label>
                <button
                  type="button"
                  onClick={addMeal}
                  className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="underline">Add meal</span>
                </button>
              </div>
              {meals.map((meal, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    {i === 0 && <label className="block text-sm font-medium text-slate-700 mb-1.5">Type of meal</label>}
                    <Select value={meal.type} onValueChange={(v) => {
                      const formats = MEAL_FORMATS_BY_TYPE[v] || []
                      const newFormat = formats.includes(meal.format) ? meal.format : ''
                      updateMeal(i, 'type', v)
                      if (newFormat !== meal.format) updateMeal(i, 'format', newFormat)
                    }}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Please select" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    {i === 0 && <label className="block text-sm font-medium text-slate-700 mb-1.5">Format</label>}
                    <Select value={meal.format} onValueChange={(v) => updateMeal(i, 'format', v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Please select" />
                      </SelectTrigger>
                      <SelectContent>
                        {(MEAL_FORMATS_BY_TYPE[meal.type] || []).map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {meals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMeal(i)}
                      className="shrink-0 flex items-center justify-center w-10 h-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove meal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Drinks checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                data-field="drinksIncluded"
                checked={drinksIncluded}
                onChange={(e) => setField('drinksIncluded', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-slate-700">Drinks are included</span>
            </label>

            {/* Dietary restrictions toggle */}
            <div className="flex items-center justify-between pt-2" data-field="showDietaryRestrictions">
              <span className="text-sm font-medium text-slate-700">
                Show dietary restrictions ({dietaryOptions.length})
              </span>
              <button
                type="button"
                onClick={() => setField('showDietaryRestrictions', !showDietaryRestrictions)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showDietaryRestrictions ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showDietaryRestrictions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {showDietaryRestrictions && (
              <div data-field="dietaryOptions">
                <DietarySelect
                  selected={dietaryOptions}
                  onAdd={addDietaryOption}
                  onRemove={removeDietaryOption}
                />
                {errors.dietaryOptions && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.dietaryOptions[0]}</span>}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}