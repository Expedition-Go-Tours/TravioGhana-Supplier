import { cn } from "@/lib/utils";

/**
 * The Experiences dashboard's stat-tile pattern: white card with a coloured
 * left border, optional icon tile, bold value above a muted label. The
 * `compact` and `hint` props stay in the API because the Stays pages pass
 * them; both are now expressed with the same typography the rest of the
 * dashboard uses.
 */
const ACCENTS = {
  emerald: "border-l-emerald-600",
  amber: "border-l-amber-400",
};

export default function StaysStatCard({
  label,
  value,
  hint,
  icon,
  accent = "emerald",
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-100/60 bg-white p-4 transition-all border-l-4",
        ACCENTS[accent] || ACCENTS.emerald,
        compact && "py-3.5",
        className,
      )}
    >
      {icon && (
        <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
          {icon}
        </div>
      )}
      <p className="text-lg font-bold leading-tight tracking-tight text-slate-800 tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
