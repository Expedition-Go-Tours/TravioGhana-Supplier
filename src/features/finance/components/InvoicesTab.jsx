import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText,
  Loader2, MoreVertical, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModalDialog } from "@/components/shared/useModalDialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { downloadInvoicePdf, fetchInvoiceById } from "../api";

// The four statuses a supplier can act on. "Voided" maps to CANCELLED: an
// invoice that was voided still explains a window that produced no payment, so
// it stays visible rather than disappearing from the history.
const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "INVOICED", label: "Due" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Voided" },
];

const STATUS_PILLS = {
  PAID: "bg-emerald-50 text-emerald-700",
  APPROVED: "bg-sky-50 text-sky-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  INVOICED: "bg-amber-50 text-amber-700",
};

const STATUS_LABELS = {
  PAID: "Paid",
  APPROVED: "Approved",
  CANCELLED: "Voided",
  INVOICED: "Due",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "—";
}

function statusPill(status) {
  return STATUS_PILLS[status] || "bg-gray-100 text-gray-600";
}

/**
 * CSV of the invoice's bookings, built on the client from the detail payload.
 * Kept here rather than as a second endpoint: the line items are already
 * fetched for the drawer, and the booking list is the same rows a supplier
 * would otherwise copy out of the PDF by hand.
 */
function buildBookingsCsv(invoice) {
  const headers = [
    "Booking reference", "Experience", "Activity date", "Status",
    "Gross", "Commission", "Net", "Currency",
  ];
  const rows = (invoice.items || []).map((it) => [
    it.booking?.bookingNumber || "",
    `"${(it.booking?.tour?.title || "").replace(/"/g, '""')}"`,
    it.booking?.travelDate ? formatDate(it.booking.travelDate) : "",
    it.booking?.status || "",
    it.grossAmount,
    it.platformCommission,
    it.supplierPayout,
    it.currency || invoice.currency || "USD",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadBlob(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TablePagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page {page} of {pagination.totalPages} · {pagination.totalCount} invoice{pagination.totalCount === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={13} /> Previous
        </button>
        <button
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * Invoice detail drawer. Focus is trapped and Escape closes it, via the shared
 * useModalDialog hook — the same contract every other dialog on the page uses.
 */
function InvoiceDetailDrawer({ invoiceId, open, onClose }) {
  // Payload is keyed by invoice id: reopening a previously-viewed invoice is
  // instant, and switching invoices can never flash the previous one's rows.
  // `loading`/`error` are DERIVED from those maps rather than set inside the
  // effect, so the effect body never calls setState synchronously.
  const [cache, setCache] = useState({});
  const [errors, setErrors] = useState({});
  const [downloading, setDownloading] = useState(false);
  const { panelRef, closeRef } = useModalDialog({ open, onClose });

  const detail = invoiceId ? cache[invoiceId] || null : null;
  const error = invoiceId ? errors[invoiceId] || null : null;
  const loading = Boolean(open && invoiceId && !detail && !error);

  useEffect(() => {
    if (!open || !invoiceId || cache[invoiceId] || errors[invoiceId]) return undefined;
    let cancelled = false;
    fetchInvoiceById(invoiceId)
      .then((inv) => { if (!cancelled) setCache((c) => ({ ...c, [invoiceId]: inv })); })
      .catch((err) => {
        if (cancelled) return;
        setErrors((e) => ({
          ...e,
          [invoiceId]: err.response?.data?.message || err.message || "Could not load this invoice",
        }));
      });
    return () => { cancelled = true; };
  }, [open, invoiceId, cache, errors]);

  // Drop only this invoice's cached error so the effect refetches it.
  const retry = useCallback(() => {
    if (!invoiceId) return;
    setErrors((e) => {
      const next = { ...e };
      delete next[invoiceId];
      return next;
    });
  }, [invoiceId]);

  const handlePdf = useCallback(async () => {
    if (!detail) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(detail.id, detail.invoiceNumber);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not download the PDF");
    } finally {
      setDownloading(false);
    }
  }, [detail]);

  const handleCsv = useCallback(() => {
    if (!detail) return;
    downloadBlob(buildBookingsCsv(detail), `${detail.invoiceNumber || "invoice"}-bookings.csv`);
    toast.success("Booking list downloaded");
  }, [detail]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/40" onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-drawer-title"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col outline-none"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
              <div>
                <h2 id="invoice-drawer-title" className="text-base font-semibold text-gray-900 font-mono">
                  {detail?.invoiceNumber || "Invoice"}
                </h2>
                {detail && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {detail.cycleStartDate && detail.cycleEndDate
                      ? `${formatDate(detail.cycleStartDate)} – ${formatDate(detail.cycleEndDate)}`
                      : detail.cycleLabel}
                  </p>
                )}
              </div>
              <button
                ref={closeRef} onClick={onClose} aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-5 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${80 - i * 12}%` }} />
                  ))}
                </div>
              ) : error ? (
                <div className="p-5">
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
                    <AlertTriangle size={16} /> {error}
                    <button onClick={retry} className="ml-auto underline hover:no-underline">Retry</button>
                  </div>
                </div>
              ) : detail ? (
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", statusPill(detail.status))}>
                      {statusLabel(detail.status)}
                    </span>
                    {detail.reference && (
                      <span className="text-[11px] font-mono text-gray-500">Ref: {detail.reference}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Gross", value: formatCurrency(detail.grossTotal, detail.currency) },
                      { label: "Commission", value: formatCurrency(detail.commissionTotal, detail.currency) },
                      { label: "Net payout", value: formatCurrency(detail.netTotal, detail.currency), strong: true },
                    ].map((m) => (
                      <div key={m.label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                        <p className={cn("text-sm tabular-nums", m.strong ? "font-semibold text-gray-900" : "text-gray-700")}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <dl className="space-y-2 text-sm">
                    {[
                      ["Invoiced", detail.invoicedAt ? formatDate(detail.invoicedAt) : null],
                      ["Payment due", detail.paymentScheduledAt ? formatDate(detail.paymentScheduledAt) : null],
                      ["Paid", detail.paidAt ? formatDate(detail.paidAt) : null],
                      ["Pays to", detail.destination || null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4">
                        <dt className="text-gray-500 shrink-0">{k}</dt>
                        <dd className="text-gray-800 text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Bookings ({detail.items.length})
                    </h3>
                    {detail.items.length === 0 ? (
                      <p className="text-sm text-gray-500">No line items on this invoice.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {detail.items.map((it) => (
                          <li key={it.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 font-mono truncate">{it.booking?.bookingNumber || "—"}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {it.booking?.tour?.title || "—"}
                                {it.booking?.travelDate ? ` · ${formatDate(it.booking.travelDate)}` : ""}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900 tabular-nums shrink-0">
                              {formatCurrency(it.supplierPayout, it.currency)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={handlePdf}
                disabled={!detail || downloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Download PDF
              </button>
              <button
                onClick={handleCsv}
                disabled={!detail || detail.items.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <FileText size={15} /> Booking list
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Finance → Invoices. One invoice per payout window, generated on the
 * supplier's cadence. Suppliers not yet on the automatic cycle see an
 * explanation rather than an empty table.
 */
export default function InvoicesTab({ invoices, pagination, loading, error, page, onPageChange, onRetry, statusFilter, onStatusFilterChange, isEnrolled }) {
  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [pdfBusyId, setPdfBusyId] = useState(null);

  const handlePdf = useCallback(async (inv) => {
    setPdfBusyId(inv.id);
    try {
      await downloadInvoicePdf(inv.id, inv.invoiceNumber);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not download the PDF");
    } finally {
      setPdfBusyId(null);
    }
  }, []);

  // The row menu can export a booking list without opening the drawer, so it
  // needs the line items. They are fetched on demand rather than carried in
  // the list payload — the list stays one page of summary rows.
  const handleCsv = useCallback(async (inv) => {
    try {
      const detail = await fetchInvoiceById(inv.id);
      if (!detail || detail.items.length === 0) {
        toast.info("This invoice has no bookings to export");
        return;
      }
      downloadBlob(buildBookingsCsv(detail), `${detail.invoiceNumber || "invoice"}-bookings.csv`);
      toast.success("Booking list downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not build the booking list");
    }
  }, []);

  const activeFilter = useMemo(() => statusFilter || "", [statusFilter]);

  // Non-enrolled suppliers are not on the automatic invoice cycle; the tab
  // still exists so the nav never shows a dead link, but it explains itself.
  if (!isEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-gray-200 rounded-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <FileText size={26} className="text-emerald-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">Invoices are not available on your plan</h3>
        <p className="text-sm text-gray-500 max-w-[320px]">
          Once you are enrolled in automatic payouts, every payout window is issued as an invoice here — downloadable as a PDF with its booking list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            One invoice per payout window, generated on your schedule. Payment is due a few days after invoicing — your bank may credit it later.
          </p>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onStatusFilterChange(f.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeFilter === f.key
                ? "bg-emerald-700 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
          <AlertTriangle size={16} /> {error}
          <button onClick={onRetry} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">
              {activeFilter ? `No ${statusLabel(activeFilter).toLowerCase()} invoices` : "No invoices yet"}
            </h4>
            <p className="text-sm text-gray-500 max-w-[380px]">
              {activeFilter
                ? "Try another status, or clear the filter to see your full invoice history."
                : "Your first invoice is generated automatically on your schedule, once bookings in the payout window have cleared."}
            </p>
            {activeFilter && (
              <button
                onClick={() => onStatusFilterChange("")}
                className="mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline hover:no-underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity dates</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setOpenInvoiceId(inv.id)}
                        className="font-mono text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline text-left"
                      >
                        {inv.invoiceNumber}
                      </button>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Invoiced {inv.invoicedAt ? formatDate(inv.invoicedAt) : "—"} · due {inv.paymentScheduledAt ? formatDate(inv.paymentScheduledAt) : "—"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                      {inv.cycleStartDate && inv.cycleEndDate
                        ? `${formatDate(inv.cycleStartDate)} – ${formatDate(inv.cycleEndDate)}`
                        : inv.cycleLabel || "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 tabular-nums">{inv.bookingCount}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 tabular-nums">{formatCurrency(inv.commissionTotal, inv.currency)}</td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(inv.netTotal, inv.currency)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", statusPill(inv.status))}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {inv.status === "PAID" ? (
                        <>
                          <span>{inv.paidAt ? formatDate(inv.paidAt) : "—"}</span>
                          {inv.reference && (
                            <p className="text-[11px] text-gray-500 mt-0.5 font-mono">Ref: {inv.reference}</p>
                          )}
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Actions for ${inv.invoiceNumber}`}
                            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors opacity-50 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical size={15} className="text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setOpenInvoiceId(inv.id)}>
                            <FileText size={15} /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePdf(inv)} disabled={pdfBusyId === inv.id}>
                            {pdfBusyId === inv.id
                              ? <Loader2 size={15} className="animate-spin" />
                              : <Download size={15} />}
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCsv(inv)}>
                            <FileText size={15} /> Download booking list
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination pagination={pagination} page={page} onPageChange={onPageChange} />
          </div>
        )}
      </div>

      <InvoiceDetailDrawer
        invoiceId={openInvoiceId}
        open={Boolean(openInvoiceId)}
        onClose={() => setOpenInvoiceId(null)}
      />
    </div>
  );
}
