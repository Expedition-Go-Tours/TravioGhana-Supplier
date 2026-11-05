import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Eye,
  Loader2,
  Percent,
  RefreshCw,
  ShoppingCart,
  Star,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import { TAB_SPRING } from "@/lib/motion";
import useMediaQuery from "@/hooks/useMediaQuery";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { fetchGa4Funnel, fetchProductPerformance } from "../api";
import KpiCard from "../components/KpiCard";
import { percentChange } from "../comparisons";
import PerformanceChart from "../components/PerformanceChart";

const PERIODS = [
  { key: "30d", label: "30 days", full: "Last 30 days", days: 30 },
  { key: "90d", label: "90 days", full: "Last 90 days", days: 90 },
  { key: "12m", label: "12 months", full: "Last 12 months", days: 365 },
];

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "conversion", label: "Bookings & conversion" },
  { key: "rating", label: "Rating" },
  { key: "cancellations", label: "Cancellations" },
];

const isoDay = (date) => date.toISOString().slice(0, 10);

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {src && !failed ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Eye size={16} className="text-slate-300" />
      )}
    </span>
  );
}

function StepBar({ label, value, of, icon: Icon }) {
  const pct = of > 0 ? Math.round((value / of) * 100) : null;
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
        {Number(value || 0).toLocaleString("en-US")}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {pct == null ? "starting point" : `${pct}% of previous step`}
      </p>
    </div>
  );
}

export default function ProductPerformancePage() {
  const { tourId } = useParams();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [period, setPeriod] = useState("30d");
  const [metric, setMetric] = useState("revenue");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("revenue");

  const [data, setData] = useState(null);
  const [ga4Row, setGa4Row] = useState(null);
  const [ga4Enabled, setGa4Enabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const config = PERIODS.find((entry) => entry.key === period) || PERIODS[0];
    const requestId = ++requestRef.current;
    const to = new Date();
    const from = new Date(Date.now() - config.days * 86_400_000);

    setLoading(true);
    setError(null);

    const [productResult, ga4Result] = await Promise.allSettled([
      fetchProductPerformance(tourId, period),
      fetchGa4Funnel({ from: isoDay(from), to: isoDay(to) }),
    ]);
    if (requestId !== requestRef.current) return;

    if (productResult.status === "fulfilled") {
      setData(productResult.value);
    } else {
      setData(null);
      setError(
        productResult.reason?.response?.data?.message ||
          productResult.reason?.message ||
          "Could not load this product's performance.",
      );
    }

    if (ga4Result.status === "fulfilled" && ga4Result.value?.enabled !== false) {
      const row = (ga4Result.value?.rows || []).find((entry) => entry.itemId === tourId) || null;
      setGa4Row(row);
      setGa4Enabled(true);
    } else {
      setGa4Row(null);
      setGa4Enabled(!(ga4Result.status === "fulfilled" && ga4Result.value?.enabled === false));
    }

    setLoading(false);
  }, [period, tourId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const config = PERIODS.find((entry) => entry.key === period) || PERIODS[0];
  const revenueDelta = data ? percentChange(data.revenue.gross, data.revenue.previousGross) : undefined;
  const bookingsDelta = data ? percentChange(data.bookings.total, data.bookings.previousTotal) : undefined;
  const views = ga4Row ? Number(ga4Row.itemsViewed) || 0 : 0;
  const purchased = ga4Row ? Number(ga4Row.itemsPurchased) || 0 : 0;
  const conversion = views ? (purchased / views) * 100 : null;
  const carted = ga4Row ? Number(ga4Row.itemsAddedToCart) || 0 : 0;

  const leadMax = data
    ? Math.max(1, ...data.bookings.leadTime.distribution.map((bucket) => bucket.count))
    : 1;

  if (error && !loading) {
    return (
      <div className="space-y-4">
        <Link to="/analytics" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Performance
        </Link>
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white px-6 py-16 text-center">
          <AlertTriangle size={24} className="text-amber-500" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Could not load this product</p>
          <p className="mt-1 max-w-[360px] text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/analytics" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Performance
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={data?.product?.photo} alt={data?.product?.name || ""} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
              {data?.product?.name || (loading ? "Loading…" : "Product")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {data ? `${config.full} · product performance` : "Product performance"}
            </p>
          </div>
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Revenue"
          icon={Wallet}
          value={data ? formatCurrency(data.revenue.gross) : "—"}
          delta={revenueDelta}
          deltaLabel="vs previous"
          sub={data ? `Payout ${formatCurrency(data.revenue.payout)}` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Bookings"
          icon={ShoppingCart}
          value={data ? data.bookings.total : "—"}
          delta={bookingsDelta}
          deltaLabel="vs previous"
          sub={data ? `${data.bookings.confirmed} confirmed · ${data.bookings.pending} pending` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Average booking"
          icon={Percent}
          value={data ? formatCurrency(data.revenue.avgValue) : "—"}
          sub={data ? `${data.revenue.paid} paid bookings` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Conversion"
          icon={Eye}
          value={conversion == null ? "—" : `${conversion.toFixed(1)}%`}
          sub={
            !ga4Enabled
              ? "Google Analytics not connected"
              : ga4Row
                ? `${views.toLocaleString("en-US")} views → ${purchased.toLocaleString("en-US")} booked`
                : "No storefront activity"
          }
          loading={loading}
        />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 scrollbar-none" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={cn(
              "relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              tab === entry.key ? "text-white" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {tab === entry.key && (
              <motion.span
                layoutId="product-tab-pill"
                className="absolute inset-0 rounded-lg bg-emerald-600"
                transition={TAB_SPRING}
              />
            )}
            <span className="relative z-10">{entry.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2 }}
        >
      {tab === "revenue" && (
        <PerformanceChart
          buckets={data?.series?.buckets || []}
          previous={data?.series?.previous || []}
          metric={metric}
          onMetricChange={setMetric}
          loading={loading}
          error={null}
          onRetry={() => setReloadKey((key) => key + 1)}
          periodLabel={config.full}
        />
      )}

      {tab === "conversion" && (
        <div className="space-y-4">
          <section className="rounded-[20px] border border-slate-200 bg-white p-5">
            <h2 className="text-[15px] font-semibold text-slate-900">Storefront funnel</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {config.full} · from Google Analytics
            </p>

            {!ga4Enabled ? (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                Google Analytics is not connected, so views and carts are unknown here — they are not zero.
              </p>
            ) : !ga4Row ? (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No storefront activity for this product in this period.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StepBar label="Viewed" value={views} icon={Eye} />
                  <StepBar label="Added to cart" value={carted} of={views} icon={ShoppingCart} />
                  <StepBar label="Booked" value={purchased} of={carted} icon={Star} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {conversion == null
                    ? "No views recorded."
                    : `${conversion.toFixed(2)}% of viewers booked this product.`}
                </p>
              </>
            )}
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-5">
            <h2 className="text-[15px] font-semibold text-slate-900">Booking window</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              How far ahead of the travel date these bookings were made
              {data?.bookings?.leadTime?.averageDays != null
                ? ` · average ${data.bookings.leadTime.averageDays} days`
                : ""}
            </p>

            <ul className="mt-4 space-y-2.5">
              {(data?.bookings?.leadTime?.distribution || []).map((bucket) => {
                const width = Math.round((bucket.count / leadMax) * 100);
                return (
                  <li key={bucket.label} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-slate-500">{bucket.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums text-slate-700">{bucket.count}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {tab === "rating" && (
        <section className="rounded-[20px] border border-slate-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-slate-900">Rating</h2>
          <p className="mt-0.5 text-xs text-slate-400">All time, from approved reviews on this product.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Average</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {data ? `${Number(data.rating.average).toFixed(1)} ★` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Reviews</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{data ? data.rating.count : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">3★ or below</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {data ? `${Number(data.rating.lowShare).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          <Link to="/reviews" className="mt-4 inline-block text-xs font-medium text-emerald-700 hover:underline">
            Read the reviews
          </Link>
        </section>
      )}

      {tab === "cancellations" && (
        <section className="rounded-[20px] border border-slate-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-slate-900">Cancellations</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Supplier-caused cancellations divided by the bookings that were at risk in this period.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Rate</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {data ? `${Number(data.cancellations.rate).toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {data ? `${data.cancellations.supplierCaused} of ${data.cancellations.atRisk} at risk` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Cancelled</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {data ? data.cancellations.total : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">by cancellation date</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Value lost</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {data ? formatCurrency(data.cancellations.lostValue) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">supplier-caused only</p>
            </div>
          </div>

          <Link to="/cancellation-rate" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
            <Ban size={13} /> All cancellations
          </Link>
        </section>
      )}

        </motion.div>
      </AnimatePresence>

      {!isWide && tab === "revenue" && (
        <p className="text-[11px] text-slate-400">
          Tap a bar to read the exact figure.
        </p>
      )}
    </div>
  );
}
