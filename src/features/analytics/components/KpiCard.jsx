import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Delta({ value, label }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Minus size={12} /> New
        {label && <span className="font-normal text-slate-400">{label}</span>}
      </span>
    );
  }
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Minus size={12} /> No change
        {label && <span className="font-normal text-slate-400">{label}</span>}
      </span>
    );
  }
  const up = value > 0;
  const magnitude = Math.abs(value);
  const shown = magnitude >= 10 ? Math.round(magnitude) : Number(magnitude.toFixed(1));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        up ? "text-emerald-700" : "text-rose-700",
      )}
    >
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {shown}%
      {label && <span className="font-normal text-slate-400">{label}</span>}
    </span>
  );
}

export default function KpiCard({
  className,
  label,
  value,
  sub,
  delta,
  deltaLabel,
  definition,
  icon: Icon,
  loading = false,
  children,
}) {
  return (
    <div className={cn("rounded-[20px] border border-slate-200 bg-white p-5", className)}>
      <div className="flex min-h-[30px] items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          {definition && (
            <span title={definition} aria-label={definition} className="text-slate-300">
              <Info size={13} />
            </span>
          )}
        </div>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <Icon size={15} />
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-7 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          <div className="mt-1.5 min-h-[18px]">
            {delta !== undefined && <Delta value={delta} label={deltaLabel} />}
            {delta === undefined && sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
          {delta !== undefined && sub && (
            <p className="mt-1 truncate text-xs text-slate-400" title={sub}>
              {sub}
            </p>
          )}
          {children}
        </>
      )}
    </div>
  );
}
