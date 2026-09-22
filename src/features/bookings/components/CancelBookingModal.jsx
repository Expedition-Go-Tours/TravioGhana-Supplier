import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, CheckCircle2, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getCancellationTaxonomy } from "../api";
import {
  cancellationPayload,
  cancellationRequestStatusLabel,
  refundStatusLabel,
  reasonLabel,
  validateCancellationForm,
} from "../lib/cancellationReasons";
import CancellationReasonWizard, {
  CancellationConfirmPanel,
} from "./CancellationReasonWizard";

/**
 * GYG-style structured cancellation:
 *   reason wizard (category → reason → fields + T&C) → pre-confirm info panel
 *   → PATCH /bookings/:id/status → success summary (refund, fee, rate impact,
 *   customer's choice window).
 *
 * The API call itself lives in the parent (BookingsPage) which owns toasts and
 * the list refresh; onConfirm resolves to { booking, cancellation } on success
 * and null on failure.
 */
export default function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading = false,
}) {
  const [view, setView] = useState("reason"); // reason | confirm | success
  const [form, setForm] = useState(null);
  const [wizardSeed, setWizardSeed] = useState(null);
  const [taxonomy, setTaxonomy] = useState(null);
  const [taxonomyError, setTaxonomyError] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);

  const loadTaxonomy = useCallback(async () => {
    setTaxonomyError(false);
    try {
      const data = await getCancellationTaxonomy();
      setTaxonomy(data);
    } catch {
      setTaxonomyError(true);
    }
  }, []);

  // Reset the form when the modal opens (adjust-state-during-render pattern —
  // the linter-approved way to sync state to a prop change without an effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setView("reason");
    setForm(null);
    setWizardSeed(null);
    setTaxonomyError(false);
    setResult(null);
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!isOpen || taxonomy || taxonomyError) return;
    // Deferred one microtask so the loader never setState synchronously inside
    // the effect body (react-hooks/set-state-in-effect).
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadTaxonomy();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, taxonomy, taxonomyError, loadTaxonomy]);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const busy = isLoading || submitting;

  const handleWizardSubmit = (wizardForm) => {
    setForm(wizardForm);
    setView("confirm");
  };

  const handleBackToReason = () => {
    setWizardSeed({ values: form, stage: "details" });
    setView("reason");
  };

  const handleConfirm = async () => {
    if (!form) return;
    // Belt-and-braces: mirror the server rules one last time before sending.
    const { isValid } = validateCancellationForm(form);
    if (!isValid) {
      setWizardSeed({ values: form, stage: "details" });
      setView("reason");
      return;
    }
    setSubmitting(true);
    try {
      const data = await onConfirm?.(cancellationPayload(form));
      if (data) {
        setResult(data);
        setView("success");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tourTitle = booking?.tour?.title || booking?.tourName || "this booking";
  const currency = booking?.currency || "USD";
  const cancellation = result?.cancellation || null;
  // Flag ON: the backend parks the cancel as a request instead of executing it.
  const request = result?.request || null;
  const isRequest = Boolean(request);
  const feePct = taxonomy?.feePct ?? 25;
  const choiceWindowHours = taxonomy?.choiceWindowHours ?? 48;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && onClose?.()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Cancel booking"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  {view === "success" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    {view !== "success"
                      ? "Cancel booking"
                      : isRequest
                        ? "Cancellation requested"
                        : "Booking cancelled"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {view === "success"
                      ? `“${tourTitle}”`
                      : `This will cancel the booking for “${tourTitle}”`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Taxonomy loading / error ── */}
            {!taxonomy && taxonomyError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200/70 flex items-center justify-between gap-3">
                <p className="text-sm text-red-700">
                  Couldn’t load the cancellation reasons. Check your connection.
                </p>
                <button
                  type="button"
                  onClick={loadTaxonomy}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {!taxonomy && !taxonomyError && (
              <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-sm">Loading cancellation options…</p>
              </div>
            )}

            {/* ── Step 1–3: structured reason wizard ── */}
            {taxonomy && view === "reason" && (
              <CancellationReasonWizard
                key={
                  wizardSeed
                    ? `seed-${wizardSeed.stage}`
                    : "fresh"
                }
                taxonomy={taxonomy}
                initialValues={wizardSeed?.values || null}
                initialStage={wizardSeed?.stage || "category"}
                onSubmit={handleWizardSubmit}
                onCancel={onClose}
              />
            )}

            {/* ── Step 4: pre-confirm info panel ── */}
            {taxonomy && view === "confirm" && form && (
              <div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Reason: </span>
                  {reasonLabel(form.cancellationCode, taxonomy)}
                  {form.explanation && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {form.explanation}
                    </p>
                  )}
                </div>

                <CancellationConfirmPanel
                  taxonomy={taxonomy}
                  form={form}
                  variant="single"
                />

                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Supplier-caused (operational) cancellations count toward your
                  cancellation rate.{" "}
                  <a
                    href="/cancellation-rate"
                    className="underline font-medium text-[#044b3b] hover:text-[#033629]"
                  >
                    View your rate
                  </a>
                </p>

                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    type="button"
                    onClick={handleBackToReason}
                    disabled={busy}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={busy || form.agreedToTerms !== true}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Confirm cancellation
                  </button>
                </div>
              </div>
            )}

            {/* ── Success summary (executed vs parked request) ── */}
            {view === "success" && (
              <div>
                <CancelSuccessSummary
                  cancellation={cancellation}
                  request={request}
                  currency={currency}
                  feePct={feePct}
                  choiceWindowHours={choiceWindowHours}
                />

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Success screen for the single-cancel modal. Branches on the payload:
 *  - `request` present  → the cancel was parked for admin approval (flag ON);
 *    emphatically nothing has changed yet and the customer has not been told.
 *  - `cancellation` present → executed immediately (flag OFF): refund, fee and
 *    rate impact, plus the customer's choice window.
 * Exported for focused tests of both branches.
 */
export function CancelSuccessSummary({
  cancellation = null,
  request = null,
  currency = "USD",
  feePct = 25,
  choiceWindowHours = 48,
}) {
  if (request) {
    return (
      <div className="rounded-xl border border-amber-200/70 bg-amber-50 p-4 space-y-2.5 text-sm text-amber-900">
        <p className="font-semibold">
          Cancellation request submitted for review.
        </p>
        <p className="leading-relaxed">
          Nothing has been cancelled yet; the customer has not been told. Our
          team will review it.
        </p>
        <p className="flex items-start justify-between gap-3">
          <span className="text-amber-800">Request status</span>
          <span className="font-semibold text-right">
            {cancellationRequestStatusLabel(request.status)}
          </span>
        </p>
        <p className="pt-1 border-t border-amber-200/70 leading-relaxed">
          You can withdraw this request from the booking or the Cancellation
          requests page while it is still pending.
        </p>
      </div>
    );
  }

  const fee = Number(cancellation?.fee) || 0;

  return (
    <>
      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50 p-4 space-y-2.5 text-sm text-emerald-900">
        {cancellation ? (
          <>
            <p className="flex items-start justify-between gap-3">
              <span className="text-emerald-800">Customer refund</span>
              <span className="font-semibold text-right">
                {refundStatusLabel(cancellation.refundStatus)}
                {Number(cancellation.refundAmount) > 0 &&
                  ` · ${formatCurrency(
                    Number(cancellation.refundAmount),
                    currency
                  )}`}
              </span>
            </p>
            <p className="flex items-start justify-between gap-3">
              <span className="text-emerald-800">Cancellation fee</span>
              <span className="font-semibold text-right">
                {fee > 0
                  ? `${formatCurrency(fee, currency)} — deducted from your future payouts`
                  : "No fee applies"}
              </span>
            </p>
            <p className="flex items-start justify-between gap-3">
              <span className="text-emerald-800">Cancellation rate</span>
              <span className="font-semibold text-right">
                {cancellation.countsTowardRate
                  ? "Counts toward your rate"
                  : "Not counted toward your rate"}
              </span>
            </p>
          </>
        ) : (
          <p>
            The booking has been cancelled and the customer has been notified.
          </p>
        )}
        <p className="pt-1 border-t border-emerald-200/70 leading-relaxed">
          The customer has {choiceWindowHours} hours to pick a new date or a
          refund
          {cancellation?.choiceDeadline
            ? ` (until ${formatDateTime(cancellation.choiceDeadline)})`
            : ""}
          .
        </p>
      </div>

      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
        {feePct}% cancellation fees are deducted automatically from your next
        payout request.
      </p>
    </>
  );
}
