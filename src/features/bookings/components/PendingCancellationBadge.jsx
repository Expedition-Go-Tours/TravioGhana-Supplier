import { useState } from "react";
import { Hourglass, Loader2, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * Amber "Pending approval" chip for a booking row/card whose cancellation has
 * been parked for admin review (SUPPLIER_CANCEL_REQUIRES_APPROVAL on).
 * Shows when the request was submitted so suppliers aren't left guessing.
 */
export function PendingCancellationBadge({ pendingCancellation, className = "" }) {
  if (!pendingCancellation) return null;
  return (
    <span
      data-testid="pending-cancellation-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300/70 text-[11px] font-semibold text-amber-800 ${className}`}
    >
      <Hourglass size={12} className="shrink-0" />
      Pending approval
      {pendingCancellation.createdAt && (
        <span className="font-normal text-amber-700">
          · requested {formatDate(pendingCancellation.createdAt)}
        </span>
      )}
    </span>
  );
}

/**
 * Withdraw action for a PENDING_APPROVAL cancellation request. Opens a confirm
 * dialog that spells out the two things suppliers care about: nothing on the
 * booking changes, and any blocked dates are re-opened. The parent's
 * `onWithdraw` owns the API call, toasts and list refresh (incl. 404 = already
 * decided).
 */
export function WithdrawCancellationButton({
  requestId,
  onWithdraw,
  label = "Withdraw",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onWithdraw?.(requestId);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={busy}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300/70 bg-white text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors disabled:opacity-50 ${className}`}
      >
        <X size={12} className="shrink-0" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Withdraw cancellation request"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (!busy) setOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">
              Withdraw cancellation request?
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              This booking has <strong>not</strong> been cancelled — nothing on
              the booking changes. Any dates this request blocked will be
              re-opened for new bookings. You can submit a new request later.
            </p>
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep request
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Withdraw request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PendingCancellationBadge;
