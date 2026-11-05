import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Image as ImageIcon,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import useMediaQuery from "@/hooks/useMediaQuery";
import OptimizedImage from "@/components/shared/OptimizedImage";

const COLUMNS = [
  { key: "name", label: "Product", align: "left", sortable: true },
  { key: "views", label: "Views", align: "right", sortable: true },
  { key: "conversion", label: "Conversion", align: "right", sortable: true },
  { key: "bookings", label: "Bookings", align: "right", sortable: true },
  { key: "revenue", label: "Revenue", align: "right", sortable: true },
  { key: "rating", label: "Rating", align: "right", sortable: true },
];

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/70 bg-slate-100">
      {show ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={36}
          height={36}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon size={14} className="text-slate-300" />
      )}
    </span>
  );
}

export default function ProductPerformanceTable({
  products = [],
  ga4Rows = [],
  loading = false,
  error = null,
  onRetry,
  periodLabel,
}) {
  const navigate = useNavigate();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [sort, setSort] = useState({ key: "revenue", dir: "desc" });
  const [query, setQuery] = useState("");

  const ga4ById = useMemo(
    () => new Map((ga4Rows || []).map((row) => [row.itemId, row])),
    [ga4Rows],
  );

  const rows = useMemo(() => {
    const merged = products.map((product) => {
      const ga4 = ga4ById.get(product.tourId);
      const views = ga4 ? Number(ga4.itemsViewed) || 0 : null;
      const purchased = ga4 ? Number(ga4.itemsPurchased) || 0 : null;
      return {
        ...product,
        views,
        conversion: views ? (purchased / views) * 100 : null,
      };
    });

    const term = query.trim().toLowerCase();
    const filtered = term
      ? merged.filter((row) => String(row.name || "").toLowerCase().includes(term))
      : merged;

    const value = (row) => {
      if (sort.key === "name") return String(row.name || "").toLowerCase();
      if (sort.key === "views") return row.views ?? -1;
      if (sort.key === "conversion") return row.conversion ?? -1;
      if (sort.key === "bookings") return row.bookings;
      if (sort.key === "rating") return row.rating;
      return row.revenue;
    };

    return [...filtered].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      if (left === right) return 0;
      const direction = sort.dir === "asc" ? 1 : -1;
      return left > right ? direction : -direction;
    });
  }, [products, ga4ById, query, sort]);

  const maxRevenue = rows.reduce((max, row) => Math.max(max, Number(row.revenue) || 0), 0);
  const hasGa4 = ga4Rows.length > 0;

  const changeSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  };

  const SortIcon = ({ column }) => {
    if (sort.key !== column) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sort.dir === "asc" ? (
      <ArrowUp size={12} className="text-emerald-600" />
    ) : (
      <ArrowDown size={12} className="text-emerald-600" />
    );
  };

  const open = (tourId) => {
    if (tourId) navigate(`/analytics/${tourId}`);
  };

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Product performance</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {periodLabel} · ranked by revenue. Views and conversion come from Google Analytics.
          </p>
        </div>

        <label className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search products</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-50" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <AlertTriangle size={22} className="text-amber-500" />
          <p className="mt-2 text-sm font-medium text-slate-800">Couldn't load product performance</p>
          <p className="mt-1 text-xs text-slate-500">The rows are missing, not zero.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <p className="text-sm font-medium text-slate-800">
            {query ? "No products match that search" : "No product activity in this period"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {query
              ? "Try a different name."
              : "Bookings and revenue for this period will appear here."}
          </p>
        </div>
      ) : isWide ? (
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-[84px]" />
            <col className="w-[104px]" />
            <col className="w-[90px]" />
            <col className="w-[126px]" />
            <col className="w-[84px]" />
            <col className="w-[40px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  aria-sort={sort.key === column.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => changeSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 select-none hover:text-slate-700",
                      column.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {column.label}
                    <SortIcon column={column.key} />
                  </button>
                </th>
              ))}
              <th className="px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.tourId || row.name}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
              >
                <td className="min-w-0 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => open(row.tourId)}
                    disabled={!row.tourId}
                    className="flex w-full min-w-0 items-center gap-3 text-left disabled:cursor-default"
                  >
                    <Thumb src={row.photo} alt="" />
                    <span className="truncate text-[13px] font-medium text-slate-800">{row.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                  {row.views == null ? <span className="text-slate-300">—</span> : row.views.toLocaleString("en-US")}
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                  {row.conversion == null ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    `${row.conversion.toFixed(1)}%`
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                  {row.bookings}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="block text-xs font-semibold tabular-nums text-slate-900">
                    {formatCurrency(row.revenue)}
                  </span>
                  <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${maxRevenue ? Math.round((row.revenue / maxRevenue) * 100) : 0}%` }}
                    />
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                  {row.rating > 0 ? `${row.rating.toFixed(1)} ★` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => open(row.tourId)}
                    disabled={!row.tourId}
                    aria-label={`Open ${row.name}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.tourId || row.name} className="px-4 py-4">
              <button
                type="button"
                onClick={() => open(row.tourId)}
                disabled={!row.tourId}
                className="flex w-full items-start gap-3 text-left disabled:cursor-default"
              >
                <Thumb src={row.photo} alt="" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug text-slate-800">
                    {row.name}
                  </span>
                  <span className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                    <span>
                      <span className="block text-slate-400">Bookings</span>
                      <span className="font-semibold tabular-nums text-slate-800">{row.bookings}</span>
                    </span>
                    <span>
                      <span className="block text-slate-400">Views</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {row.views == null ? "—" : row.views.toLocaleString("en-US")}
                      </span>
                    </span>
                    <span>
                      <span className="block text-slate-400">Conversion</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {row.conversion == null ? "—" : `${row.conversion.toFixed(1)}%`}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatCurrency(row.revenue)}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {row.rating > 0 ? `${row.rating.toFixed(1)} ★` : "Not rated"}
                    </span>
                  </span>
                </span>
                <ChevronRight size={15} className="mt-1 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && rows.length > 0 && !hasGa4 && (
        <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          Views and conversion are unavailable until Google Analytics is connected — they are not zero.
        </p>
      )}
    </section>
  );
}
