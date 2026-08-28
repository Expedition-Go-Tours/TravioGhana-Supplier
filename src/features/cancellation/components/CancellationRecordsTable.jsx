import { CalendarX2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SORT_FIELDS = {
  travelDate: "Travel Date",
  reason: "Cancellation Reason",
  bookingReference: "Booking Reference",
  productName: "Product",
  bookingValue: "Booking Value",
  refundAmount: "Refund Amount",
};

export default function CancellationRecordsTable({
  records,
  pagination,
  sortField,
  sortDir,
  onSort,
  onPageChange,
  onExportCSV,
  days,
  totalLost,
}) {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={13} className="text-slate-300 shrink-0" />;
    return sortDir === "asc" ? (
      <ArrowUp size={13} className="text-emerald-600 shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-emerald-600 shrink-0" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[20px] shadow-none overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          Cancellations used to calculate your rate
        </h2>
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
          <p className="text-sm font-semibold text-slate-700">No cancelled bookings counted toward your rate</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[320px] leading-relaxed">
            Only supplier-caused cancellations from the last {days} days appear here. Weather, force
            majeure, and customer-requested cancellations are excluded.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                        <SortIcon field={key} />
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
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{r.travelDate}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-60 truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">
                      {r.bookingReference}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{r.productName}</td>
                    <td className="px-4 py-3.5 text-slate-800 whitespace-nowrap font-semibold text-right">
                      {formatCurrency(r.bookingValue)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-right">
                      {r.refundAmount != null ? formatCurrency(r.refundAmount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-teal-50/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-teal-800">{formatCurrency(totalLost)}</span>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} records)
              </span>
              <div className="flex items-center gap-1">
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
