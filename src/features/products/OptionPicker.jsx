import { useProductBuilderStore } from './productBuilderStore'

// Lets the user choose which option's pricing / availability / cut-off they
// are configuring. Hidden for single-option products where the option-level
// editor is indistinguishable from the old product-level editor.
export default function OptionPicker({ label = 'Option', helpText, className = '' }) {
  const options = useProductBuilderStore((s) => s.options)
  const selectedOptionId = useProductBuilderStore((s) => s.selectedOptionId)
  const selectOption = useProductBuilderStore((s) => s.selectOption)

  if (!Array.isArray(options) || options.length < 1) return null

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-slate-800 mb-1.5">{label}</label>
      <select
        value={selectedOptionId || ''}
        onChange={(e) => e.target.value && selectOption(e.target.value)}
        className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      >
        {options.map((o, i) => (
          <option key={o.id} value={o.id}>
            {o.title ? `${o.title}${options.length > 1 ? ` — Option ${i + 1}` : ''}` : `Option ${i + 1}`}
          </option>
        ))}
      </select>
      {helpText && <p className="text-[13px] text-slate-400 mt-1.5">{helpText}</p>}
    </div>
  )
}
