import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { createRefundRequest, fetchRefundQuote } from "../api";

/**
 * Request a refund on a delivered booking.
 *
 * Nothing moves here. The supplier files a structured request, an admin
 * decides, and only then is the traveller refunded and the supplier's balance
 * charged. The copy says that plainly, because a button labelled "refund" that
 * only files a request is the kind of thing that generates support tickets.
 *
 * The amount inputs are driven by the server's quote: the ceiling is what is
 * actually left after any earlier partial refund, and the supplier's share is
 * shown before they commit. The percentage/amount inputs are never disabled —
 * "the tour did not operate" is recorded and shown to the reviewer, but it does
 * not lock the amount.
 */
export default function RequestRefundModal({
  isOpen,
  onClose,
  booking,
  onSubmitted,
}) {
  // Starts true: the quote is the first thing this modal needs, and the
  // parent remounts it per booking (see the `key` in BookingsPage), so there
  // is no stale state to clear.
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [operated, setOperated] = useState(null);
  const [attended, setAttended] = useState(null);
  const [reasonCode, setReasonCode] = useState("");
  const [refundType, setRefundType] = useState("PERCENT");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !booking?.id) return;
    let cancelled = false;
    fetchRefundQuote(booking.id)
      .then((data) => {
        if (cancelled) return;
        setQuote(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err?.response?.data?.message || "Could not load this booking's refund details."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, booking?.id]);

  // Esc closes, matching every other modal in the app.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, submitting, onClose]);

  const currency = quote?.booking?.currency || booking?.currency || "USD";
  const gross = Number(quote?.booking?.grossAmount ?? booking?.grossAmount ?? 0);
  const refundable = Number(quote?.refundable ?? 0);
  const supplierPayout = Number(quote?.booking?.supplierPayout ?? 0);
  const payoutSettled = ["INVOICED", "REQUESTED", "PAID"].includes(
    String(quote?.payoutStatus || "")
  );

  /**
   * Client-side estimate only — the server recomputes and is authoritative.
   * Shown so the supplier understands the cost before filing, not after.
   */
  const estimate = useMemo(() => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return { proposed: 0, charge: 0, capped: false };
    let proposed = refundType === "PERCENT" ? (gross * raw) / 100 : raw;
    const capped = proposed > refundable + 0.005;
    if (refundType === "PERCENT") proposed = Math.min(proposed, refundable);
    const isFull = proposed >= refundable - 0.005 && Number(quote?.booking?.refundAmount || 0) === 0;
    const charge = isFull
      ? (payoutSettled ? supplierPayout : 0)
      : gross > 0
        ? (supplierPayout * proposed) / gross
        : 0;
    return {
      proposed: Math.round(proposed * 100) / 100,
      charge: Math.max(0, Math.round(charge * 100) / 100),
      capped: capped && refundType === "AMOUNT",
    };
  }, [value, refundType, gross, refundable, supplierPayout, payoutSettled, quote]);

  const canSubmit =
    !!quote?.eligible &&
    operated !== null &&
    attended !== null &&
    !!reasonCode &&
    Number(value) > 0 &&
    estimate.proposed > 0 &&
    !estimate.capped &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await createRefundRequest(booking.id, {
        operated,
        attended,
        reasonCode,
        refundType,
        value: Number(value),
        note: note.trim() || null,
      });
      const request = response.data?.data?.request || null;
      setResult(request);
      onSubmitted?.(request);
      toast.success("Refund request submitted for review");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "We could not submit this request. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => !submitting && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request a refund"
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Refund customer</h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.bookingNumber ? `Booking ${booking.bookingNumber}` : "This booking"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Loading refund details…
          </div>
        ) : loadError ? (
          <div className="px-6 py-8">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        ) : result ? (
          // ── Submitted ────────────────────────────────────────────────
          <div className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Request submitted</p>
                <p className="mt-1 text-sm text-emerald-800">
                  {result.requestNumber ? `${result.requestNumber} is` : "Your request is"} waiting for our team to review.
                  Nothing has been refunded yet — you will get an email once it is decided.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Traveller refund</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(estimate.proposed, currency)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Charged to your balance if approved</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(estimate.charge, currency)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-[#044b3b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#033629]"
            >
              Done
            </button>
          </div>
        ) : quote && !quote.eligible ? (
          // ── Not eligible ─────────────────────────────────────────────
          <div className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">This booking cannot be refunded here</p>
                <p className="mt-1 text-sm text-amber-800">{quote.reason}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : (
          // ── Form ─────────────────────────────────────────────────────
          <div className="px-6 py-5 space-y-5">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-500">Total traveller paid</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">
                {formatCurrency(gross, currency)}
              </p>
              {Number(quote?.booking?.refundAmount || 0) > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(quote.booking.refundAmount, currency)} already refunded ·{" "}
                  {formatCurrency(refundable, currency)} left
                </p>
              )}
            </div>

            {quote?.openRequest && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                <Info size={15} className="mt-0.5 shrink-0" />
                <span>
                  {quote.openRequest.requestNumber} is already awaiting a decision on this booking.
                </span>
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-medium text-slate-800">Did this tour operate?</legend>
              <div className="mt-2 flex gap-6">
                {[["Yes", true], ["No", false]].map(([label, v]) => (
                  <label key={label} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="operated"
                      checked={operated === v}
                      onChange={() => setOperated(v)}
                      className="h-4 w-4 accent-[#044b3b]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-slate-800">
                Did the customer go on this tour?
              </legend>
              <div className="mt-2 flex gap-6">
                {[["Yes", true], ["No", false]].map(([label, v]) => (
                  <label key={label} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="attended"
                      checked={attended === v}
                      onChange={() => setAttended(v)}
                      className="h-4 w-4 accent-[#044b3b]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="refund-reason" className="text-sm font-medium text-slate-800">
                Reason for refund
              </label>
              <select
                id="refund-reason"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-[#044b3b] focus:outline-none"
              >
                <option value="">Please select a reason</option>
                {(quote?.reasons || []).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="refund-type" className="text-sm font-medium text-slate-800">
                Type of refund
              </label>
              <select
                id="refund-type"
                value={refundType}
                onChange={(e) => setRefundType(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-[#044b3b] focus:outline-none"
              >
                <option value="PERCENT">Refund a percentage of the booking</option>
                <option value="AMOUNT">Refund a specific amount</option>
              </select>
            </div>

            <div>
              <label htmlFor="refund-amount" className="text-sm font-medium text-slate-800">
                Traveller refund amount
              </label>
              <div className="mt-1.5 flex rounded-lg border border-slate-300 focus-within:border-[#044b3b]">
                <input
                  id="refund-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-l-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                />
                <span className="flex items-center rounded-r-lg border-l border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                  {refundType === "PERCENT" ? "%" : currency}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {refundType === "PERCENT"
                  ? `Percentage of the ${formatCurrency(gross, currency)} booking. Max ${refundable > 0 ? formatCurrency(refundable, currency) : "—"}.`
                  : `Maximum ${formatCurrency(refundable, currency)}.`}
              </p>
              {estimate.capped && (
                <p className="mt-1 text-xs text-red-600">
                  That is more than the {formatCurrency(refundable, currency)} left to refund.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="refund-note" className="text-sm font-medium text-slate-800">
                Note for the reviewer <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="refund-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="What happened, and anything we should know before approving."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-[#044b3b] focus:outline-none"
              />
            </div>

            {quote?.requestedByEmail && (
              <div>
                <span className="text-sm font-medium text-slate-800">Requested by</span>
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  {quote.requestedByEmail}
                </div>
              </div>
            )}

            {estimate.proposed > 0 && (
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Traveller receives</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(estimate.proposed, currency)}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-slate-600">
                  <span>Charged to your balance if approved</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(estimate.charge, currency)}
                  </span>
                </div>
                {estimate.charge === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    We have not paid out this booking yet, so a full refund costs you nothing
                    extra beyond the payout itself.
                  </p>
                )}
              </div>
            )}

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-[#044b3b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#033629] disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Submitting…" : "Refund customer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
