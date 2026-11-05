import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "bookings", label: "Bookings" },
];

const axisMoney = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    return `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  }
  return `$${n.toLocaleString("en-US")}`;
};

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const current = payload.find((entry) => entry.dataKey === "current");
  const previous = payload.find((entry) => entry.dataKey === "previous");
  const format = (value) =>
    metric === "revenue" ? formatCurrency(Number(value) || 0) : `${Number(value) || 0} bookings`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{format(current?.value)}</p>
      <p className="mt-0.5 text-xs text-slate-400">Previous {format(previous?.value)}</p>
    </div>
  );
}

export default function PerformanceChart({
  buckets = [],
  previous = [],
  metric = "revenue",
  onMetricChange,
  loading = false,
  error = null,
  onRetry,
  periodLabel,
}) {
  const data = buckets.map((bucket, index) => ({
    label: bucket.label,
    current: Number(bucket[metric]) || 0,
    previous: Number(previous[index]?.[metric]) || 0,
  }));

  const hasData = data.some((entry) => entry.current > 0 || entry.previous > 0);
  const total = data.reduce((sum, entry) => sum + entry.current, 0);
  const previousTotal = data.reduce((sum, entry) => sum + entry.previous, 0);

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Performance over time</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {periodLabel} · bars are this period, the dashed line is the one before
          </p>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Chart metric">
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onMetricChange?.(option.key)}
              aria-pressed={metric === option.key}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                metric === option.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-[260px] animate-pulse rounded-xl bg-slate-50" />
      ) : error ? (
        <div className="mt-4 flex h-[260px] flex-col items-center justify-center text-center">
          <AlertTriangle size={22} className="text-amber-500" />
          <p className="mt-2 text-sm font-medium text-slate-800">Couldn't load this chart</p>
          <p className="mt-1 max-w-[280px] text-xs text-slate-500">
            The figures are missing, not zero.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : !hasData ? (
        <div className="mt-4 flex h-[260px] flex-col items-center justify-center text-center">
          <BarChart3 size={24} className="text-slate-200" />
          <p className="mt-2 text-sm font-medium text-slate-700">No activity in this period</p>
          <p className="mt-1 max-w-[280px] text-xs text-slate-500">
            Nothing was booked and no revenue was paid between these dates.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={metric === "revenue" ? axisMoney : undefined}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip metric={metric} />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="current" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} name="This period" />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Previous period"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="sr-only">
            {metric === "revenue" ? "Revenue" : "Bookings"}: {total} this period,
            {` ${previousTotal} in the previous period.`}
          </p>

          <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> {periodLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-slate-400" /> Previous period
            </span>
            <span className="ml-auto font-medium text-slate-700 tabular-nums">
              {metric === "revenue" ? formatCurrency(total) : `${total} bookings`}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
