import { CUTOFF_OPTIONS, formatCutoffLabel } from './cutoffOptions'

export function CutoffSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
    >
      {CUTOFF_OPTIONS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.items.map((mins) => (
            <option key={mins} value={mins}>{formatCutoffLabel(mins)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
