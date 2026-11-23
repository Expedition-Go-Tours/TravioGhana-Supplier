import { cn } from "@/lib/utils";
import { PRESETS, isMonthKey, monthOptions } from "../periods";

/**
 * One control for both Performance pages.
 *
 * Presets stay as a segmented control because they are the common case; a
 * month is a dropdown because a supplier may want to look back a year, which a
 * three-button row cannot express. The select shows "Month…" while a preset is
 * active and the chosen month once one is picked, so the current state is
 * always visible in exactly one place.
 */
export default function PeriodPicker({ value, onChange, className }) {
  const months = monthOptions();
  const selectedMonth = isMonthKey(value);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Reporting period">
        {PRESETS.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={active}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <label htmlFor="analytics-month" className="sr-only">
        Reporting month
      </label>
      <select
        id="analytics-month"
        value={selectedMonth ? value : ""}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className={cn(
          "h-9 rounded-lg border bg-white px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          selectedMonth
            ? "border-emerald-300 text-slate-900"
            : "border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        <option value="">Month…</option>
        {months.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
}
