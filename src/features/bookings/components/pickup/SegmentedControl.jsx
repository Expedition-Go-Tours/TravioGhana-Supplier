import { cn } from "@/lib/utils";

/**
 * Segmented control used for the planner's date range and pickup-state filters.
 * Options: [{ key, label, count? }]. Renders real pressed state for a11y.
 */
export default function SegmentedControl({ options, value, onChange, ariaLabel, className = "" }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 sm:text-sm",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "hidden rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums sm:inline-block",
                  active ? "bg-[#044b3b] text-white" : "bg-white text-slate-500"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
