import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Eye,
  LineChart,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import useMediaQuery from "@/hooks/useMediaQuery";

/**
 * Storefront funnel (GA4) — items viewed → added to cart → purchased → revenue.
 *
 * The page owns the request and the period: this panel only renders what it is
 * given. Three states stay apart, because collapsing them turns a measurement
 * into a claim:
 *   - not connected  → an explanation, never a table of zeros
 *   - request failed → an error with Retry
 *   - no activity    → an explicit measured zero, with the dates
 */

const STEPS = [
  { key: "itemsViewed", label: "Viewed", icon: Eye },
  { key: "itemsAddedToCart", label: "Added to cart", icon: ShoppingCart },
  { key: "itemsPurchased", label: "Booked", icon: BadgeCheck },
];

function share(part, whole) {
  if (!whole) return null;
  return (part / whole) * 100;
}

export default function Ga4FunnelPanel({ data, loading, error, onRetry, periodLabel }) {
  const isWide = useMediaQuery("(min-width: 1024px)");
  const rows = data?.rows || [];
  const totals = data?.totals || null;

  const steps = useMemo(() => {
    if (!totals) return [];
    return STEPS.map((step, index) => {
      const count = Number(totals[step.key]) || 0;
      const previous = index === 0 ? null : Number(totals[STEPS[index - 1].key]) || 0;
      return {
        ...step,
        count,
        conversion: index === 0 ? null : share(count, previous),
      };
    });
  }, [totals]);

  const biggestDrop = useMemo(() => {
    if (!totals) return null;
    const viewToCart = share(Number(totals.itemsAddedToCart) || 0, Number(totals.itemsViewed) || 0);
    const cartToBook = share(Number(totals.itemsPurchased) || 0, Number(totals.itemsAddedToCart) || 0);
    if (viewToCart == null || cartToBook == null) return null;
    return viewToCart <= cartToBook
      ? { from: "Viewed", to: "Added to cart", lost: 100 - viewToCart }
      : { from: "Added to cart", to: "Booked", lost: 100 - cartToBook };
  }, [totals]);

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Storefront funnel</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            What happened before a booking existed · {periodLabel} · from Google Analytics
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          GA4
        </span>
      </div>

      {loading ? (
        <div className="space-y-4 p-5">
          <div className="h-20 animate-pulse rounded-xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-50" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <AlertTriangle size={22} className="text-amber-500" />
          <p className="mt-2 text-sm font-medium text-slate-800">Couldn't load the storefront funnel</p>
          <p className="mt-1 max-w-[340px] text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : data && data.enabled === false ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <LineChart size={24} className="text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-800">Not connected to Google Analytics</p>
          <p className="mt-1 max-w-[420px] text-xs text-slate-500">
            {data.reason ||
              "This server cannot read GA4, so views and add-to-carts are unknown here — they are not zero."}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <Eye size={24} className="text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-800">No product activity in this period</p>
          <p className="mt-1 max-w-[420px] text-xs text-slate-500">
            Google Analytics recorded no views, carts or purchases for your products between these dates.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.key} className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <step.icon size={12} />
                  {step.label}
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {step.count.toLocaleString("en-US")}
                </p>
                {index === 0 ? (
                  <p className="mt-0.5 text-[11px] text-slate-400">starting point</p>
                ) : (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <ArrowRight size={11} className="text-slate-300" />
                    {step.conversion == null ? "—" : `${step.conversion.toFixed(1)}% of previous step`}
                  </p>
                )}
              </div>
            ))}
          </div>

          {biggestDrop && (
            <p className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Biggest drop-off: <strong>{biggestDrop.from} → {biggestDrop.to}</strong> —{" "}
              {biggestDrop.lost.toFixed(0)}% do not continue.
            </p>
          )}

          {isWide ? (
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-[96px]" />
                <col className="w-[110px]" />
                <col className="w-[96px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 text-left font-semibold">Product</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Viewed</th>
                  <th className="px-3 py-2.5 text-right font-semibold">To cart</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Booked</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.itemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-2.5 text-[13px] text-slate-700">
                      <span className="line-clamp-1" title={row.itemName}>{row.itemName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600">
                      {Number(row.itemsViewed || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600">
                      {Number(row.itemsAddedToCart || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-700">
                      {Number(row.itemsPurchased || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-900">
                      {formatCurrency(row.itemRevenue, "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
                    <td className="px-5 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(totals.itemsViewed || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(totals.itemsAddedToCart || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(totals.itemsPurchased || 0).toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatCurrency(totals.itemRevenue, "USD")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {rows.map((row) => (
                <li key={row.itemId} className="px-4 py-3">
                  <p className="text-[13px] font-medium leading-snug text-slate-800">{row.itemName}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                    <span>
                      <span className="block text-slate-400">Viewed</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {Number(row.itemsViewed || 0).toLocaleString("en-US")}
                      </span>
                    </span>
                    <span>
                      <span className="block text-slate-400">To cart</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {Number(row.itemsAddedToCart || 0).toLocaleString("en-US")}
                      </span>
                    </span>
                    <span>
                      <span className="block text-slate-400">Booked</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {Number(row.itemsPurchased || 0).toLocaleString("en-US")}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(row.itemRevenue, "USD")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
            From Google Analytics for {data.from} – {data.to}. Shares are of your totals in this period
            {data.excludedCount > 0
              ? `; ${data.excludedCount} product${data.excludedCount === 1 ? "" : "s"} on the property were hidden because they are not yours or are test listings.`
              : "."}
          </p>
        </>
      )}
    </section>
  );
}
