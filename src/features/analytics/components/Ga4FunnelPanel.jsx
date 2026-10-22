import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  ShoppingCart,
  BadgeCheck,
  DollarSign,
  Info,
  LineChart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { fetchGa4Funnel } from "../api";

/**
 * Storefront funnel (GA4) — items viewed → added to cart → purchased → revenue,
 * per product, straight from Google Analytics.
 *
 * The point of this panel is the column the database cannot produce: a traveller
 * who LOOKED at a tour and never booked leaves no row anywhere we own. Until
 * this existed the analytics page showed bookings and revenue and implied the
 * rest.
 *
 * Three states are kept apart on purpose, because collapsing them is how
 * dashboards lie:
 *   - "Not connected to Google Analytics" (enabled: false) — those columns are
 *     UNKNOWN here. Rendered as an explanation, never as zeros.
 *   - "We couldn't load it" (request failed) — with Retry.
 *   - "No product activity in this period" — a real, measured zero.
 */

const RANGES = [
  { key: "30d", label: "Last 30 days", params: () => ({}) },
  {
    key: "90d",
    label: "Last 90 days",
    params: () => ({ from: daysAgo(90) }),
  },
  {
    key: "ytd",
    label: "This year",
    params: () => ({ from: `${new Date().getUTCFullYear()}-01-01` }),
  },
];

function daysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Count columns (viewed / added to cart) carry no share — GA4's own report
 * prints "–" there too, and inventing a 0.00% next to a real count would read
 * as "this product converts at zero" rather than "we don't break it down".
 */
function countCell(count) {
  return <span className="text-slate-500">{count}</span>;
}

/** Purchased / revenue carry their share of the supplier's own totals. */
function countWithShare(count, sharePct) {
  return `${count} (${sharePct.toFixed(2)}%)`;
}

export default function Ga4FunnelPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rangeKey, setRangeKey] = useState("30d");

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGa4Funnel(range.params()));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load the GA4 funnel");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals || null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Storefront funnel (Google Analytics)
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Who viewed, added to cart and bought each product — the part of the
            story that happens before a booking exists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  rangeKey === r.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Reload the GA4 funnel"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-14 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : error ? (
        <div className="py-12 px-6 text-center">
          <AlertTriangle size={28} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            We couldn't load the storefront funnel
          </p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : data && data.enabled === false ? (
        // NOT configured is NOT zero. Say what is missing and stop.
        <div className="py-12 px-6 text-center">
          <LineChart size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Not connected to Google Analytics yet
          </p>
          <p className="text-xs text-slate-500 max-w-[460px] mx-auto">
            {data.reason ||
              "This server cannot read GA4, so views and add-to-carts are unknown here — they are not zero."}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 px-6 text-center">
          <Eye size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            No product activity in this period
          </p>
          <p className="text-xs text-slate-500">
            Google Analytics recorded no views, carts or purchases for your
            products between these dates.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 font-medium text-slate-500">Product</th>
                  <th className="px-3 py-2.5 font-medium text-slate-500 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={11} /> Viewed
                    </span>
                  </th>
                  <th className="px-3 py-2.5 font-medium text-slate-500 text-right">
                    <span className="inline-flex items-center gap-1">
                      <ShoppingCart size={11} /> Added to cart
                    </span>
                  </th>
                  <th className="px-3 py-2.5 font-medium text-slate-500 text-right">
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck size={11} /> Purchased
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-right">
                    <span className="inline-flex items-center gap-1">
                      <DollarSign size={11} /> Revenue
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.itemId}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-2.5 text-slate-800">
                      <span className="line-clamp-2">{row.itemName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {countCell(row.itemsViewed)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {countCell(row.itemsAddedToCart)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700 font-medium">
                      {countWithShare(row.itemsPurchased, row.itemsPurchasedSharePct ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                      {formatCurrency(row.itemRevenue, "USD")}{" "}
                      <span className="text-slate-400 font-normal">
                        ({(row.itemRevenueSharePct ?? 0).toFixed(2)}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right">{totals.itemsViewed}</td>
                    <td className="px-3 py-2.5 text-right">{totals.itemsAddedToCart}</td>
                    <td className="px-3 py-2.5 text-right">{totals.itemsPurchased}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatCurrency(totals.itemRevenue, "USD")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex items-start gap-2 px-4 sm:px-5 py-3 text-[11px] text-slate-500 border-t border-slate-100">
            <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
            <p>
              From Google Analytics for {data.from} – {data.to}. Shares are of
              YOUR totals in this period
              {data.excludedCount > 0
                ? `; ${data.excludedCount} product${data.excludedCount === 1 ? "" : "s"} on the property were hidden because they are not yours or are test listings.`
                : "."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
