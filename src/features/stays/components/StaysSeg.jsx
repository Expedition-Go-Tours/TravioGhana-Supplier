import { cn } from "@/lib/utils";

/**
 * Two filter treatments from the portal, chosen per context:
 *
 *   chips (default)  the Bookings quick-filter row — `bg-[#044b3b]` active
 *   tabs             the Finance/Settings underline tabs — emerald underline
 *   segmented        the Availability date-mode pill — grey track, white active
 *
 * Role semantics are explicit so screen readers announce the selected option.
 */
export default function StaysSeg({ options, value, onChange, ariaLabel, variant = "chips", className }) {
  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn("flex items-center gap-0 rounded-lg bg-slate-100 p-0.5", className)}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                isActive
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "tabs") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn("flex items-center gap-5 overflow-x-auto border-b border-gray-200 scrollbar-none sm:gap-6", className)}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(option.value)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                isActive
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1 overflow-x-auto scrollbar-none", className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
              isActive
                ? "bg-[#044b3b] text-white shadow-sm"
                : "text-slate-500 hover:bg-emerald-50/40 hover:text-slate-700",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
