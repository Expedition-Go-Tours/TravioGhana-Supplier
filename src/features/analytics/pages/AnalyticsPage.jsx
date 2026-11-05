import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Percent,
  RefreshCw,
  ShoppingCart,
  Star,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  fetchAnalyticsSummary,
  fetchAnalyticsTimeseries,
  fetchGa4Funnel,
  fetchProductAnalytics,
} from "../api";
import { fetchCancellationSummary } from "@/features/cancellation/api";
import KpiCard from "../components/KpiCard";
import { percentChange } from "../comparisons";
import PerformanceChart from "../components/PerformanceChart";
import ProductPerformanceTable from "../components/ProductPerformanceTable";
import Ga4FunnelPanel from "../components/Ga4FunnelPanel";

const PERIODS = [
  { key: "30d", label: "30 days", full: "Last 30 days", days: 30 },
  { key: "90d", label: "90 days", full: "Last 90 days", days: 90 },
  { key: "12m", label: "12 months", full: "Last 12 months", days: 365 },
];

const isoDay = (date) => date.toISOString().slice(0, 10);

const formatPercent = (value) =>
  value == null ? "—" : `${Number(value).toFixed(1)}%`;

/** The server's message when it sent one; the client's text otherwise. */
const messageFor = (reason, fallback) =>
  reason?.response?.data?.message || reason?.message || fallback;

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");
  const [metric, setMetric] = useState("revenue");
  const [reloadKey, setReloadKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState(null);
  const [products, setProducts] = useState([]);
  const [ga4, setGa4] = useState(null);
  const [cancellation, setCancellation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const config = PERIODS.find((entry) => entry.key === period) || PERIODS[0];
    const requestId = ++requestRef.current;
    const to = new Date();
    const from = new Date(Date.now() - config.days * 86_400_000);

    setLoading(true);
    setErrors({});

    const [summaryResult, seriesResult, productsResult, ga4Result, cancellationResult] =
      await Promise.allSettled([
        fetchAnalyticsSummary(period),
        fetchAnalyticsTimeseries(period),
        fetchProductAnalytics(period),
        fetchGa4Funnel({ from: isoDay(from), to: isoDay(to) }),
        fetchCancellationSummary(undefined, config.days),
      ]);

    // A slower response for a previous period must not overwrite a newer one.
    if (requestId !== requestRef.current) return;

    const nextErrors = {};
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    else nextErrors.summary = messageFor(summaryResult.reason, "Could not load the period summary.");

    if (seriesResult.status === "fulfilled") setSeries(seriesResult.value);
    else nextErrors.series = messageFor(seriesResult.reason, "Could not load the trend.");

    if (productsResult.status === "fulfilled") setProducts(productsResult.value);
    else nextErrors.products = messageFor(productsResult.reason, "Could not load product performance.");

    if (ga4Result.status === "fulfilled") setGa4(ga4Result.value);
    else nextErrors.ga4 = messageFor(ga4Result.reason, "Could not load Google Analytics.");

    if (cancellationResult.status === "fulfilled") setCancellation(cancellationResult.value);
    else nextErrors.cancellation = true;

    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [period]);

  useEffect(() => {
    // Deferred out of the effect body so the fetch (and its first setState)
    // does not run during the effect itself.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const config = PERIODS.find((entry) => entry.key === period) || PERIODS[0];

  const revenueDelta = summary?.revenue
    ? percentChange(summary.revenue.gross, summary.revenue.previousGross)
    : undefined;
  const bookingsDelta = summary?.bookings
    ? percentChange(summary.bookings.total, summary.bookings.previousTotal)
    : undefined;

  const ga4Totals = ga4?.enabled === false ? null : ga4?.totals;
  const conversionRate =
    ga4Totals && Number(ga4Totals.itemsViewed) > 0
      ? (Number(ga4Totals.itemsPurchased) / Number(ga4Totals.itemsViewed)) * 100
      : null;

  const cancellationRate = cancellation?.cancellationRate;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Performance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenue, bookings and conversion for your products.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Reporting period">
            {PERIODS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                aria-pressed={period === option.key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  period === option.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        {config.full} · compared with the {config.days} days before
        {lastUpdated && ` · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
      </p>

      {errors.summary && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{errors.summary} The cards below are missing, not zero.</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="ml-auto font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Revenue"
          icon={Wallet}
          definition="Gross value of bookings paid inside the period. Your payout after commission is shown underneath."
          value={summary?.revenue ? formatCurrency(summary.revenue.gross) : "—"}
          delta={revenueDelta}
          deltaLabel="vs previous"
          sub={summary?.revenue ? `Payout ${formatCurrency(summary.revenue.payout)}` : undefined}
          loading={loading}
        />

        <KpiCard
          label="Bookings"
          icon={ShoppingCart}
          definition="Bookings created inside the period, whatever their status."
          value={summary?.bookings ? summary.bookings.total : "—"}
          delta={bookingsDelta}
          deltaLabel="vs previous"
          sub={
            summary?.bookings
              ? `${summary.bookings.confirmed} confirmed · ${summary.bookings.pending} pending`
              : undefined
          }
          loading={loading}
        />

        <KpiCard
          label="Conversion"
          icon={Percent}
          definition="Booked divided by product views, from Google Analytics. Unavailable when GA4 is not connected."
          value={ga4?.enabled === false ? "—" : formatPercent(conversionRate)}
          sub={
            ga4?.enabled === false
              ? "Google Analytics not connected"
              : ga4Totals
                ? `${Number(ga4Totals.itemsViewed).toLocaleString("en-US")} views → ${Number(ga4Totals.itemsPurchased).toLocaleString("en-US")} booked`
                : "No storefront activity"
          }
          loading={loading}
        />

        <KpiCard
          label="Rating"
          icon={Star}
          definition="All-time average of approved reviews. Not limited to the selected period."
          value={summary?.rating ? `${Number(summary.rating.average).toFixed(1)} ★` : "—"}
          sub={
            summary?.rating
              ? `${summary.rating.count} review${summary.rating.count === 1 ? "" : "s"} · ${formatPercent(summary.rating.lowShare)} at 3★ or below`
              : undefined
          }
          loading={loading}
        />

        <KpiCard
          className="col-span-2 md:col-span-1"
          label="Cancellation rate"
          icon={Ban}
          definition="Supplier-caused cancellations divided by the bookings that were at risk in the period."
          value={cancellation ? formatPercent(cancellationRate) : "—"}
          sub={
            cancellation
              ? `${cancellation.supplierCausedCount} of ${cancellation.eligibleBookings} eligible bookings`
              : "Not available"
          }
          loading={loading}
        >
          <button
            type="button"
            onClick={() => navigate("/cancellation-rate")}
            className="mt-3 text-[11px] font-medium text-emerald-700 hover:underline"
          >
            View cancellations
          </button>
        </KpiCard>
      </div>

      <PerformanceChart
        buckets={series?.buckets || []}
        previous={series?.previous || []}
        metric={metric}
        onMetricChange={setMetric}
        loading={loading}
        error={errors.series}
        onRetry={() => setReloadKey((key) => key + 1)}
        periodLabel={config.full}
      />

      <ProductPerformanceTable
        products={products}
        ga4Rows={ga4?.enabled === false ? [] : ga4?.rows || []}
        loading={loading}
        error={errors.products}
        onRetry={() => setReloadKey((key) => key + 1)}
        periodLabel={config.full}
      />

      <Ga4FunnelPanel
        data={ga4}
        loading={loading}
        error={errors.ga4}
        onRetry={() => setReloadKey((key) => key + 1)}
        periodLabel={config.full}
      />
    </div>
  );
}
