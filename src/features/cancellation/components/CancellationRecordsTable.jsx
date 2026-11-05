import { CalendarX2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import useMediaQuery from "@/hooks/useMediaQuery";

const SORT_FIELDS = {
  cancelledOn: "Cancelled On",
  reason: "Reason",
  bookingReference: "Booking",
  bookingValue: "Value",
  countsTowardRate: "Rate Impact",
};

const MOBILE_SORTS = [
  { value: "cancelledOn:desc", label: "Newest first" },
  { value: "cancelledOn:asc", label: "Oldest first" },
  { value: "bookingValue:desc", label: "Highest value" },
  { value: "reason:asc", label: "Reason A–Z" },
  { value: "countsTowardRate:desc", label: "Counts toward rate first" },
];

const ORIGIN_LABEL = {
  CUSTOMER: "Customer",
  SUPPLIER: "You",
  SYSTEM: "System",
};

function ImpactBadge({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        Counts
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        Excluded
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

function OriginTag({ origin }) {
  const label = ORIGIN_LABEL[String(origin || "").toUpperCase()];
  if (!label) return null;
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
      {label}
    </span>
  );
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown size={13} className="shrink-0 text-slate-300" />;
  return sortDir === "asc" ? (
    <ArrowUp size={13} className="shrink-0 text-emerald-600" />
  ) : (
    <ArrowDown size={13} className="shrink-0 text-emerald-600" />
  );
}

export default function CancellationRecordsTable({
  records,
  pagination,
  sortField,
  sortDir,
  onSort,
  onSortChange,
  onPageChange,
  onExportCSV,
  days,
  totalLost,
}) {
  // The table needs five readable columns; below 1024px there isn't room, and
  // a horizontally scrolling table hides the value and impact columns — the
  // two things the page exists to show. Phones and small laptops get cards
  // instead. Only one layout is in the DOM, so a screen reader never hears the
  // same record twice.
  const isWide = useMediaQuery("(min-width: 1024px)");

  const changeSort = (field, dir) => {
    if (onSortChange) onSortChange(field, dir);
    else onSort(field);
  };

  const mobileSortValue = `${sortField || "cancelledOn"}:${sortField ? sortDir : "desc"}`;

  return (
    <div className="bg-white border border-slate-200 rounded-[20px] shadow-none overflow-hidden">
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Cancellation records
          </h2>
          <span className="text-xs text-slate-400">
            Counted by cancellation date
          </span>
        </div>
        {records.length > 0 && (
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
            <CalendarX2 size={22} className="text-teal-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No cancellations in the last {days} days</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[320px] leading-relaxed">
            All cancellations made in this period — whether initiated by you, the customer, or external events — will appear here.
          </p>
        </div>
      ) : (
        <>
          {isWide ? (
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[104px]" />
                <col />
                <col className="w-[190px]" />
                <col className="w-[116px]" />
                <col className="w-[104px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {Object.entries(SORT_FIELDS).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => onSort(key)}
                      className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {label}
                        <SortIcon field={key} sortField={sortField} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 align-top">
                      <div className="whitespace-nowrap text-xs text-slate-700">{r.cancelledOn || r.travelDate}</div>
                      <div className="mt-0.5 whitespace-nowrap text-[11px] text-slate-400">Travelled {r.travelDate}</div>
                    </td>
                    <td
                      className="px-4 py-3.5 min-w-0"
                      title={r.note ? `${r.reason}\n${r.note}` : r.reason}
                    >
                      <div className="flex items-start gap-1.5">
                        <OriginTag origin={r.origin} />
                        <span className="min-w-0 truncate text-slate-700">{r.reason}</span>
                      </div>
                      {r.note && (
                        <div className="mt-0.5 text-xs text-slate-400 truncate" title={r.note}>
                          {r.note}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 min-w-0">
                      <div className="truncate text-xs font-medium text-slate-700">{r.bookingReference}</div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400" title={r.productName}>
                        {r.productName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="whitespace-nowrap text-xs font-semibold text-slate-800">
                        {formatCurrency(r.bookingValue)}
                      </div>
                      <div className="mt-0.5 whitespace-nowrap text-[11px] text-slate-400">
                        {r.refundAmount != null ? `Refunded ${formatCurrency(r.refundAmount)}` : "No refund"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ImpactBadge value={r.countsTowardRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                <label htmlFor="cancellation-sort" className="text-xs text-slate-400">
                  Sort by
                </label>
                <select
                  id="cancellation-sort"
                  value={mobileSortValue}
                  onChange={(event) => {
                    const [field, dir] = event.target.value.split(":");
                    changeSort(field, dir);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {MOBILE_SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <ul className="divide-y divide-slate-100">
                {records.map((r) => (
                  <li key={r.id} className="px-4 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <OriginTag origin={r.origin} />
                          <p className="break-words text-sm font-medium text-slate-800">
                            {r.reason}
                          </p>
                        </div>
                        {r.note && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-400" title={r.note}>
                            {r.note}
                          </p>
                        )}
                      </div>
                      <ImpactBadge value={r.countsTowardRate} />
                    </div>

                    <p className="break-words text-xs text-slate-500" title={r.productName}>
                      {r.productName}
                    </p>

                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-600">{r.bookingReference}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(r.bookingValue)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                      <span>
                        Cancelled {r.cancelledOn || r.travelDate}
                        <span className="mx-1 text-slate-300">·</span>
                        Travelled {r.travelDate}
                      </span>
                      <span>
                        {r.refundAmount != null ? `Refunded ${formatCurrency(r.refundAmount)}` : "No refund"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-teal-50/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Value lost to supplier-caused cancellations</span>
            <span className="text-sm font-bold text-teal-800">{formatCurrency(totalLost)}</span>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-5 sm:px-6 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} records)
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                  disabled={pagination.currentPage <= 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(pagination.currentPage - 2, pagination.totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        pageNum === pagination.currentPage
                          ? "bg-teal-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => onPageChange((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
