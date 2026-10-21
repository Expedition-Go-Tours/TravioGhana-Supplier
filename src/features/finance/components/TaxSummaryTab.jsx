import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Download,
  Receipt,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { fetchTaxSummary } from "../api";

/**
 * Tax summary — the record of tax the platform CHARGED on this supplier's paid
 * bookings, bucketed by month and currency.
 *
 * What it must never do: invent a total across currencies (GH₵200 and $200 are
 * two records), imply it is a filed return, or read "no tax" out of a fetch
 * that failed. Each of those has its own state below.
 */

const RANGES = [
  {
    key: "12m",
    label: "Last 12 months",
    params: () => ({}), // the API's default window
  },
  {
    key: "ytd",
    label: "This year",
    params: () => ({ from: `${new Date().getUTCFullYear()}-01-01` }),
  },
  {
    key: "q",
    label: "Last quarter",
    params: () => {
      // Whole calendar quarter behind the current one.
      const now = new Date();
      const quarter = Math.floor(now.getUTCMonth() / 3);
      const startMonth = quarter === 0 ? 9 : (quarter - 1) * 3;
      const year = quarter === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const endMonth = startMonth + 2;
      const lastDay = new Date(Date.UTC(year, endMonth + 1, 0)).getUTCDate();
      return {
        from: `${year}-${String(startMonth + 1).padStart(2, "0")}-01`,
        to: `${year}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      };
    },
  },
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function TaxSummaryTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rangeKey, setRangeKey] = useState("12m");

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTaxSummary(range.params());
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load the tax summary");
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
  const totals = useMemo(() => data?.totalsByCurrency || [], [data]);

  const rowsByCurrency = useMemo(() => {
    const grouped = new Map();
    for (const row of rows) {
      const list = grouped.get(row.currency) || [];
      list.push(row);
      grouped.set(row.currency, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const handleExport = useCallback(() => {
    if (!data) return;
    const lines = [
      ["Month", "Currency", "Bookings", "Gross", "Tax charged", "Net of tax"].join(","),
    ];
    for (const row of data.rows) {
      lines.push(
        [
          row.month,
          row.currency,
          row.bookings,
          row.gross.toFixed(2),
          row.tax.toFixed(2),
          row.net.toFixed(2),
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push(csvCell(data.disclaimer));

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `travio-tax-summary-${data.from}-to-${data.to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Tax summary downloaded");
  }, [data]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Tax summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tax charged on your paid bookings, per currency
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  rangeKey === r.key
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!data || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 size={26} className="animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="py-14 px-6 text-center">
          <AlertTriangle size={30} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-semibold text-gray-800 mb-1">
            We couldn't load the tax summary
          </p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 px-6 text-center">
          <Receipt size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-800 mb-1">
            No paid bookings in this period
          </p>
          <p className="text-xs text-gray-500">
            Nothing was charged, so there is no tax to report for these months.
          </p>
        </div>
      ) : (
        <>
          {/* Per-currency totals — never one figure across currencies. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 sm:p-5">
            {totals.map((total) => (
              <div
                key={total.currency}
                className="border border-gray-200 rounded-lg p-3.5"
              >
                <p className="text-xs text-gray-500">
                  Tax charged · <span className="font-semibold text-gray-700">{total.currency}</span>
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(total.tax, total.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {total.bookings} booking{total.bookings === 1 ? "" : "s"} ·{" "}
                  {formatCurrency(total.gross, total.currency)} gross ·{" "}
                  {formatCurrency(total.net, total.currency)} net of tax
                </p>
              </div>
            ))}
          </div>

          {/* Month × currency rows */}
          <div className="px-4 sm:px-5 pb-5">
            {rowsByCurrency.map(([currency, list]) => (
              <div key={currency} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold text-gray-600 mb-2">{currency}</p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-left">
                        <th className="px-3 py-2 font-medium text-gray-500">Month</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-right">Bookings</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-right">Gross</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-right">Tax charged</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-right">Net of tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => (
                        <tr key={`${row.month}-${row.currency}`} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-2 text-gray-800">{row.month}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{row.bookings}</td>
                          <td className="px-3 py-2 text-right text-gray-800">
                            {formatCurrency(row.gross, row.currency)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(row.tax, row.currency)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {formatCurrency(row.net, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* What this is — and is not. */}
          <div className="flex items-start gap-2 px-4 sm:px-5 pb-5 text-xs text-gray-500">
            <Info size={14} className="shrink-0 mt-0.5 text-gray-400" />
            <p>{data?.disclaimer}</p>
          </div>
          {data?.truncated && (
            <div className="px-4 sm:px-5 pb-5 text-xs text-amber-700">
              This summary stopped at 50,000 bookings — narrow the date range to
              see the rest.
            </div>
          )}
        </>
      )}
    </div>
  );
}
