import { useEffect, useRef } from "react";
import { X, CalendarX2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SORT_FIELDS = {
  travelDate: "Travel Date",
  reason: "Cancellation Reason",
  bookingReference: "Booking Reference",
  productName: "Product",
  bookingValue: "Booking Value",
  refundAmount: "Refund Amount",
};

export default function CancellationDetailsModal({
  summary,
  records,
  pagination,
  sortField,
  sortDir,
  onSort,
  onPageChange,
  onExportCSV,
  days,
  onClose,
}) {
  const rate = summary?.cancellationRate ?? 0;
  const confirmed = summary?.confirmed ?? 0;
  const cancelled = summary?.cancelled ?? 0;
  const completed = summary?.completed ?? 0;
  const completionRate = summary?.completionRate ?? 0;
  const totalLost = summary?.bookingValueLost ?? 0;
  const closeRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={13} className="text-slate-300 shrink-0" />;
    return sortDir === "asc" ? (
      <ArrowUp size={13} className="text-emerald-600 shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-emerald-600 shrink-0" />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cancellation details"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cancellation Details</h2>
            <p className="text-sm text-slate-500">Last {days} days</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{rate}%</div>
              <div className="text-xs text-slate-500">Cancellation Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{confirmed}</div>
              <div className="text-xs text-slate-500">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{cancelled}</div>
              <div className="text-xs text-slate-500">Cancelled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{completed}</div>
              <div className="text-xs text-slate-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{completionRate}%</div>
              <div className="text-xs text-slate-500">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <CalendarX2 size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No cancelled bookings</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[320px] leading-relaxed">
                No supplier-caused cancellations in the last {days} days.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 sticky top-0">
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
          )}
        </div>

        {/* Footer */}
        {records.length > 0 && (
          <div className="border-t border-slate-100">
            <div className="px-6 py-3 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Lost</span>
              <span className="text-sm font-bold text-slate-800">{formatCurrency(totalLost)}</span>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between">
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
                            ? "bg-emerald-600 text-white"
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

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
