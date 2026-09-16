import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, MessageSquareText, Ticket, User,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { REASON_LABELS } from "../constants";

function money(amount, currency) {
  return formatCurrency(amount, currency);
}

/**
 * GYG-style decision dialog for customer refund requests.
 *
 * Approve mode — a clear, positive confirmation summarizing exactly what is
 * being approved and what happens next. Decline mode — the same shell with a
 * required customer-facing reason. Escape / backdrop close only while idle;
 * the primary action is disabled and shows a spinner while submitting, so a
 * request can never be double-submitted.
 */
export default function RefundClaimDecisionModal({
  claim,
  mode,
  submitting = false,
  onClose,
  onConfirm,
}) {
  const open = !!claim;
  const isApprove = mode === "approve";
  const confirmRef = useRef(null);
  const noteRef = useRef(null);
  const [note, setNote] = useState("");

  // Escape closes only while idle (never mid-submit).
  useEffect(() => {
    if (!open || submitting) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Focus the sensible first control: the reason field when declining, the
  // primary action when approving.
  useEffect(() => {
    if (!open) return;
    const target = isApprove ? confirmRef.current : noteRef.current;
    target?.focus?.();
  }, [open, isApprove]);

  const closeIdle = () => {
    if (!submitting) onClose?.();
  };

  const handleConfirm = () => {
    if (submitting) return;
    if (isApprove) {
      onConfirm?.();
      return;
    }
    if (!note.trim()) return;
    onConfirm?.(note.trim());
  };

  if (!claim) return null;

  const customer = claim.booking?.customerName || "Customer";
  const tour = claim.booking?.tourTitle || "the tour";
  const typeLabel = claim.type === "FULL" ? "full" : "partial";
  const isFull = claim.type === "FULL";
  const amount = isFull ? claim.booking.total : claim.requestedAmount;
  const reasonLabel = REASON_LABELS[claim.reason] || claim.reason;
  const filedOn = claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeIdle}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={isApprove ? "Approve refund request" : "Decline refund request"}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isApprove ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                }`}
              >
                {isApprove ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {isApprove ? "Approve refund request?" : "Decline refund request"}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-1">
                  {isApprove
                    ? `${customer} requested a ${typeLabel} refund for ${tour}. Approving forwards it to our team to release the money.`
                    : `${customer} requested a ${typeLabel} refund for ${tour}. Explain your decision — the customer will see this note.`}
                </p>
              </div>
            </div>

            {/* Claim summary */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tour}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{claim.booking?.customerEmail || customer}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">
                    {money(amount, claim.booking?.currency)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isFull ? "Full refund" : `of ${money(claim.booking?.total, claim.booking?.currency)} paid`}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 text-xs text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Ticket size={12} className="text-slate-400 shrink-0" />
                  {claim.claimNumber}
                  {claim.booking?.bookingNumber ? ` · Ref ${claim.booking.bookingNumber}` : ""}
                  {filedOn ? ` · filed ${filedOn}` : ""}
                </p>
                <p className="flex items-start gap-1.5">
                  <MessageSquareText size={12} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{reasonLabel}</span>
                </p>
                {claim.details && (
                  <p className="pl-[18px] text-[13px] text-slate-600 leading-relaxed">{claim.details}</p>
                )}
              </div>
            </div>

            {isApprove ? (
              <p className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 text-xs text-emerald-700 flex items-start gap-2">
                <User size={13} className="shrink-0 mt-0.5" />
                <span>
                  Next step: our finance team reviews the approval and releases{" "}
                  <strong>{money(amount, claim.booking?.currency)}</strong> back to {customer}. Once released,
                  the amount is no longer part of a future payout to you.
                </span>
              </p>
            ) : (
              <label className="block mt-4">
                <span className="text-sm font-semibold text-slate-700">Reason for declining</span>
                <textarea
                  ref={noteRef}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                  placeholder="Explain the decision — the customer will see this note"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 disabled:opacity-60 disabled:bg-slate-50"
                />
              </label>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeIdle}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={isApprove ? confirmRef : null}
                onClick={handleConfirm}
                disabled={submitting || (!isApprove && !note.trim())}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {isApprove ? "Approve & forward" : "Decline request"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
