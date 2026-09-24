import { Copy, Plus, X } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DAYS, DEFAULT_RANGE, clearAllHours, copyDayForward, firstDayWithHours, hasHours,
} from "../utils/operatingHours";

/**
 * Operating hours editor for the business profile.
 *
 * Deliberately a copy of the product builder's "standard weekly schedule" UI
 * (Step14PricingAvailability) so suppliers see the same time pickers and
 * affordances in both places: a row per day, one start–end range, "Add opening
 * hours" on closed days, and "Copy to remaining days" / "Remove all" once any
 * hours exist. The builder is untouched — this is a presentational duplicate,
 * driven entirely by `value` / `onChange`.
 */

const MINUTES = ["00", "15", "30", "45"];
const HOURS_12 = ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];

/** Hour / minute / AM-PM picker emitting a 24-hour "HH:mm" string. */
function TimeSelect({ value, onChange, ariaLabel }) {
  const [hour24, minute] = (value || DEFAULT_RANGE.startTime).split(":");
  const hourNum = parseInt(hour24, 10);
  const period = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  const hour12Str = String(hour12).padStart(2, "0");

  const emit = (h12, m, p) => {
    let h24 = parseInt(h12, 10);
    if (p === "AM") {
      if (h24 === 12) h24 = 0;
    } else if (h24 !== 12) {
      h24 += 12;
    }
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  };

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={ariaLabel}>
      <Select value={hour12Str} onValueChange={(h) => emit(h, minute, period)}>
        <SelectTrigger
          aria-label={ariaLabel ? `${ariaLabel} hour` : "Hour"}
          className="h-9 w-14 px-1 text-sm border-slate-200 rounded-lg justify-center [&>svg]:hidden [&>span]:line-clamp-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS_12.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-slate-400">:</span>
      <Select value={minute} onValueChange={(m) => emit(hour12Str, m, period)}>
        <SelectTrigger
          aria-label={ariaLabel ? `${ariaLabel} minutes` : "Minutes"}
          className="h-9 w-14 px-1 text-sm border-slate-200 rounded-lg justify-center [&>svg]:hidden [&>span]:line-clamp-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-0.5">
        {["AM", "PM"].map((p) => (
          <button
            key={p}
            type="button"
            aria-label={ariaLabel ? `${ariaLabel} ${p}` : p}
            aria-pressed={p === period}
            onClick={() => emit(hour12Str, minute, p)}
            className={`h-9 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold transition-colors ${
              p === period
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OperatingHoursEditor({ value, onChange, errors = {} }) {
  const week = value || {};
  const anyHours = hasHours(week);
  const sourceDay = firstDayWithHours(week);

  const setDay = (day, ranges) => onChange({ ...week, [day]: ranges });
  const addHours = (day) => setDay(day, [{ ...DEFAULT_RANGE }]);
  const updateRange = (day, patch) => setDay(day, [{ ...(week[day]?.[0] || DEFAULT_RANGE), ...patch }]);
  const removeHours = (day) => setDay(day, []);
  const copyToRemaining = () => onChange(copyDayForward(week, sourceDay));
  const removeAll = () => onChange(clearAllHours());

  return (
    <div>
      {anyHours && (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mb-2">
          {sourceDay && (
            <button
              type="button"
              onClick={copyToRemaining}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy to remaining days
            </button>
          )}
          <button
            type="button"
            onClick={removeAll}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Remove all
          </button>
        </div>
      )}

      <div className="space-y-1">
        {DAYS.map((day) => {
          const range = (week[day] || [])[0];
          const error = errors[day];
          return (
            <div key={day} data-day={day}>
              <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <h4 className="text-sm font-bold text-slate-900 shrink-0">{day}</h4>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:justify-end">
                  {range ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <TimeSelect
                          ariaLabel={`${day} start time`}
                          value={range.startTime}
                          onChange={(v) => updateRange(day, { startTime: v })}
                        />
                        <span className="text-slate-400">-</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <TimeSelect
                          ariaLabel={`${day} end time`}
                          value={range.endTime}
                          onChange={(v) => updateRange(day, { endTime: v })}
                        />
                        <button
                          type="button"
                          onClick={() => removeHours(day)}
                          aria-label={`Close ${day}`}
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addHours(day)}
                      aria-label={`Add opening hours for ${day}`}
                      className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium shrink-0 sm:self-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add opening hours
                    </button>
                  )}
                </div>
              </div>
              {error && (
                <span className="text-[13px] text-red-600 font-medium block -mt-1 pb-2">{error}</span>
              )}
              <hr className="border-slate-100" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
