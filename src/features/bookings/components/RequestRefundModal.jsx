import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import useModalDialog from "@/components/shared/useModalDialog";
import {
  createRefundRequest,
  fetchRefundQuote,
  newRefundRequestIdempotencyKey,
} from "../api";

const OPEN_REQUEST_LABEL = {
  PENDING_APPROVAL: "Waiting for review",
  EXECUTING: "Being processed",
  FAILED: "Needs a retry",
};

const money = (value, currency) => formatCurrency(Number(value || 0), currency || "USD");

function errorMessage(err, fallback) {
  return err?.response?.data?.message || fallback;
}

function BookingSummary({ booking, quote, currency, gross, refunded, refundable, requestedBy }) {
  const travelDate = booking?.travelDate || quote?.booking?.travelDate;
  const tour = booking?.tourName || booking?.tour?.title || quote?.booking?.tourTitle || "This booking";
  const traveler = booking?.leadTravelerName && booking.leadTravelerName !== "—"
    ? booking.leadTravelerName
    : booking?.customerName || quote?.booking?.customerName;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{tour}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {booking?.bookingNumber || quote?.booking?.bookingNumber || "Booking"}
            {travelDate ? ` · Travel ${formatDate(travelDate)}` : ""}
          </p>
          {traveler && <p className="mt-0.5 truncate text-xs text-slate-500">Lead traveller: {traveler}</p>}
          {requestedBy && <p className="mt-0.5 truncate text-[11px] text-slate-400">Requested by {requestedBy}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Total traveller paid
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
            {money(gross, currency)}
          </p>
        </div>
      </div>
      {refunded > 0 && (
        <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs text-slate-500">
          {money(refunded, currency)} already refunded · {money(refundable, currency)} left to refund
        </p>
      )}
    </div>
  );
}

function ChoiceGroup({ legend, name, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">
        {legend} <span className="text-danger-500">*</span>
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map(([label, optionValue]) => {
          const selected = value === optionValue;
          return (
            <label
              key={label}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors",
                "focus-within:ring-2 focus-within:ring-primary-100",
                selected
                  ? "border-primary-300 bg-primary-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span>{label}</span>
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(optionValue)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-primary-400 bg-primary-400" : "border-slate-300 bg-white",
                )}
              >
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SummaryRow({ label, value, tone = "default" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <span className="text-[13px] text-slate-600">{label}</span>
      <span
        className={cn(
          "shrink-0 text-[13px] font-semibold tabular-nums",
          tone === "danger" ? "text-danger-600" : "text-slate-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function RequestRefundModal({ isOpen, onClose, booking, onSubmitted }) {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [operated, setOperated] = useState(null);
  const [attended, setAttended] = useState(null);
  const [reasonCode, setReasonCode] = useState("");
  // FULL refunds the remaining refundable balance without an amount input.
  // AMOUNT is the only mode that needs a typed value.
  const [refundMode, setRefundMode] = useState("FULL");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);
  const [idempotencyKey] = useState(() => newRefundRequestIdempotencyKey());
  const submitLock = useRef(false);
  const bookingId = booking?.id;

  const { panelRef, closeRef } = useModalDialog({
    open: isOpen,
    onClose: () => {
      if (!submitting) onClose?.();
    },
    enabled: !submitting,
  });

  const loadQuote = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchRefundQuote(bookingId);
      if (!data) throw new Error("The server did not return this booking's refund details.");
      setQuote(data);
    } catch (err) {
      setQuote(null);
      setLoadError(errorMessage(err, "Could not load this booking's refund details."));
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!isOpen || !bookingId) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadQuote();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, bookingId, loadQuote]);

  // The modal owns the page behind it. useModalDialog handles focus and
  // Escape; scrolling is separate because it is a body style, not a listener.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const currency = quote?.booking?.currency || booking?.currency || "USD";
  const gross = Number(quote?.booking?.grossAmount ?? booking?.grossAmount ?? 0);
  const refunded = Number(quote?.booking?.refundAmount ?? 0);
  const refundable = Number(quote?.refundable ?? 0);
  const supplierPayout = Number(quote?.supplierShareRaw ?? quote?.booking?.supplierPayout ?? 0);
  const payoutSettled = ["INVOICED", "REQUESTED", "PAID"].includes(String(quote?.payoutStatus || ""));
  const openRequest = quote?.openRequest || null;

  const estimate = useMemo(() => {
    const full = refundMode === "FULL";
    const raw = full ? 100 : Number(value);
    if (!Number.isFinite(raw) || raw <= 0) {
      return { proposed: 0, charge: 0, capped: false, overPercent: false };
    }

    let proposed = full ? (gross * raw) / 100 : raw;
    const overAmount = !full && proposed > refundable + 0.005;
    if (full) proposed = Math.min(proposed, refundable);

    const isFull = proposed >= refundable - 0.005 && refunded === 0;
    const charge = isFull
      ? (payoutSettled ? supplierPayout : 0)
      : gross > 0
        ? (supplierPayout * proposed) / gross
        : 0;

    return {
      proposed: Math.max(0, Math.round(proposed * 100) / 100),
      charge: Math.max(0, Math.round(charge * 100) / 100),
      capped: overAmount,
      overPercent: false,
    };
  }, [refundMode, value, gross, refundable, supplierPayout, payoutSettled, refunded]);

  const otherNeedsNote = reasonCode === "OTHER" && !note.trim();
  const balance = quote?.supplierBalance || null;
  const balanceAfter = balance && estimate.proposed > 0 ? balance.available - estimate.charge : null;

  const canSubmit =
    !!quote?.eligible &&
    !openRequest &&
    operated !== null &&
    (operated === false || attended !== null) &&
    !!reasonCode &&
    !otherNeedsNote &&
    (refundMode === "FULL" || Number(value) > 0) &&
    estimate.proposed > 0 &&
    !estimate.capped &&
    !submitting;

  const missing = [];
  if (operated === null) missing.push("whether the tour operated");
  else if (operated === true && attended === null) missing.push("whether the customer attended");
  if (!reasonCode) missing.push("a reason");
  if (otherNeedsNote) missing.push("a note explaining the Other reason");
  if (refundMode === "AMOUNT" && !(Number(value) > 0)) missing.push("a refund amount");
  if (estimate.capped) missing.push("an amount within the refundable balance");

  const savedPreview = result?.preview || estimate;

  function chooseOperated(next) {
    setOperated(next);
    // Going back to "Yes" must ask the attendance question again rather than
    // keeping the inferred "No" from the did-not-operate branch.
    setAttended(next === false ? false : null);
  }

  function chooseRefundMode(next) {
    setRefundMode(next);
    // A full refund and a typed amount are different things. Clearing prevents
    // a value typed in one mode from silently carrying into the other.
    setValue("");
  }

  async function handleSubmit() {
    if (!canSubmit || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await createRefundRequest(
        booking.id,
        {
          operated,
          attended: operated === false ? false : attended,
          reasonCode,
          refundType: refundMode === "FULL" ? "PERCENT" : "AMOUNT",
          value: refundMode === "FULL" ? 100 : Number(value),
          note: note.trim() || null,
        },
        { idempotencyKey },
      );
      const request = response.data?.data?.request || null;
      if (!request) throw new Error("The server did not return the refund request.");
      setResult(request);
      onSubmitted?.(request);
      toast.success("Refund request submitted for review");
    } catch (err) {
      setSubmitError(errorMessage(err, "We could not submit this request. Please try again."));
      if (err?.response?.status === 409) loadQuote().catch(() => {});
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const closeButton = (
    <button
      ref={closeRef}
      type="button"
      onClick={() => !submitting && onClose?.()}
      disabled={submitting}
      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
      aria-label="Close refund request"
    >
      <X size={18} />
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in-0 duration-200 motion-reduce:animate-none"
        onClick={() => !submitting && onClose?.()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-modal-title"
        aria-describedby="refund-modal-description"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none sm:max-w-[560px] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Refund request
            </p>
            <h2 id="refund-modal-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Refund customer
            </h2>
            <p id="refund-modal-description" className="mt-1 text-sm leading-relaxed text-slate-500">
              {booking?.bookingNumber ? `Booking ${booking.bookingNumber} · ` : ""}
              Nothing moves until Travio approves the request.
            </p>
          </div>
          {closeButton}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading refund details">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : loadError ? (
            <div className="space-y-4">
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3.5 text-sm text-danger-700">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Could not load this booking</p>
                  <p className="mt-1">{loadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadQuote}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          ) : !quote ? (
            <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3.5 text-sm text-danger-700">
              We could not load this booking's refund details. Close the window and try again.
            </div>
          ) : openRequest ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Info size={18} className="mt-0.5 shrink-0 text-warning-700" />
                  <div>
                    <p className="font-semibold text-warning-800">A request is already in progress</p>
                    <p className="mt-1 text-sm leading-relaxed text-warning-800">
                      <span className="font-mono font-semibold">{openRequest.requestNumber}</span> is{" "}
                      {OPEN_REQUEST_LABEL[openRequest.status]?.toLowerCase() || "being reviewed"} for this booking.
                      You cannot file a second request until this one is resolved.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                You can follow the decision, or withdraw the request while it is still pending, from Finance.
              </p>
            </div>
          ) : !quote.eligible ? (
            <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-4 text-warning-800">
              <Info size={18} className="mt-0.5 shrink-0 text-warning-700" />
              <div>
                <p className="font-semibold">This booking cannot be refunded here</p>
                <p className="mt-1 text-sm leading-relaxed">{quote.reason}</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4" role="status" aria-live="polite">
              <div className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success-600" />
                <div>
                  <p className="font-semibold text-slate-900">Request submitted</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {result.requestNumber ? `${result.requestNumber} is` : "Your request is"} waiting for Travio to review.
                    Nothing has been refunded yet — you will get an email once it is decided.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 py-3">
                <SummaryRow label="Traveller receives" value={money(savedPreview.proposed, currency)} />
                <SummaryRow
                  label="Charged to your balance if approved"
                  value={money(savedPreview.charge, currency)}
                />
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                These are the figures recorded with the request. Travio may recalculate them against the live
                booking before approving.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <BookingSummary
                booking={booking}
                quote={quote}
                currency={currency}
                gross={gross}
                refunded={refunded}
                refundable={refundable}
                requestedBy={quote.requestedByEmail}
              />

              <ChoiceGroup
                legend="Did this tour operate?"
                name="operated"
                value={operated}
                onChange={chooseOperated}
                options={[["Yes", true], ["No", false]]}
              />

              {operated === true && (
                <ChoiceGroup
                  legend="Did the customer go on this tour?"
                  name="attended"
                  value={attended}
                  onChange={setAttended}
                  options={[["Yes", true], ["No", false]]}
                />
              )}

              {operated === false && (
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  Not asked — a tour that did not operate cannot have been attended.
                </p>
              )}

              <div>
                <label htmlFor="refund-reason" className="block text-sm font-semibold text-slate-800">
                  Reason for refund <span className="text-danger-500">*</span>
                </label>
                <select
                  id="refund-reason"
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  className="mt-1.5 h-11 w-full max-w-[320px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">Select a reason</option>
                  {(quote.reasons || []).map((reason) => (
                    <option key={reason.code} value={reason.code}>{reason.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)]">
                <div>
                  <label htmlFor="refund-type" className="block text-sm font-semibold text-slate-800">
                    Refund type <span className="text-danger-500">*</span>
                  </label>
                  <select
                    id="refund-type"
                    value={refundMode}
                    onChange={(event) => chooseRefundMode(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="FULL">Full amount</option>
                    <option value="AMOUNT">Specific amount</option>
                  </select>
                </div>

                {refundMode === "FULL" ? (
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Amount</span>
                    <div className="mt-1.5 flex h-11 w-full items-center rounded-lg border border-primary-200 bg-primary-50 px-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {money(refundable, currency)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">Full remaining refund</p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="refund-amount" className="block text-sm font-semibold text-slate-800">
                      Refund amount <span className="text-danger-500">*</span>
                    </label>
                    <div
                      className={cn(
                        "mt-1.5 flex h-11 w-full overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2",
                        estimate.capped
                          ? "border-danger-300 focus-within:border-danger-400 focus-within:ring-danger-100"
                          : "border-slate-300 focus-within:border-slate-400 focus-within:ring-slate-100",
                      )}
                    >
                      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                        {currency}
                      </span>
                      <input
                        id="refund-amount"
                        type="number"
                        min="0"
                        max={refundable || undefined}
                        step="0.01"
                        inputMode="decimal"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="0.00"
                        aria-invalid={estimate.capped}
                        aria-describedby="refund-amount-help"
                        className="w-full bg-transparent px-3 text-sm tabular-nums text-slate-800 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => chooseRefundMode("FULL")}
                      className="mt-1.5 inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Use full amount
                    </button>
                    <p id="refund-amount-help" className="mt-1 text-xs text-slate-500">
                      Refundable balance: {money(refundable, currency)}.
                    </p>
                    {estimate.capped && (
                      <p role="alert" className="mt-1 text-xs text-danger-600">
                        That is more than the {money(refundable, currency)} left to refund.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {estimate.proposed > 0 && (
                <div className="space-y-2.5">
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 py-3">
                    <SummaryRow label="Traveller receives" value={money(estimate.proposed, currency)} />
                    <SummaryRow
                      label="Charged to your balance if approved"
                      value={money(estimate.charge, currency)}
                    />
                    {balance && (
                      <SummaryRow
                        label="Your available balance now"
                        value={money(balance.available, currency)}
                      />
                    )}
                    {balanceAfter !== null && (
                      <SummaryRow
                        label="Balance after this refund"
                        value={money(balanceAfter, currency)}
                        tone={balanceAfter < 0 ? "danger" : "primary"}
                      />
                    )}
                  </div>
                  {estimate.charge === 0 && (
                    <p className="text-xs leading-relaxed text-slate-500">
                      This booking has not been paid out yet, so a full refund costs you nothing extra beyond
                      the payout itself.
                    </p>
                  )}
                  {balanceAfter !== null && balanceAfter < 0 && (
                    <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-xs leading-relaxed text-warning-800">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      This pushes your balance negative. That is allowed — the traveller is still owed the
                      refund — but your next payout is held until the balance clears.
                    </p>
                  )}
                  <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                    <Wallet size={12} className="mt-0.5 shrink-0" />
                    Travio recalculates these figures against the live booking before approving.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="refund-note" className="block text-sm font-semibold text-slate-800">
                  Note for the reviewer{" "}
                  <span className="font-normal text-slate-400">
                    {reasonCode === "OTHER" ? "(required for Other)" : "(optional)"}
                  </span>
                </label>
                <textarea
                  id="refund-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="What happened, and anything we should know before approving."
                  aria-describedby="refund-note-help"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
                <div id="refund-note-help" className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{reasonCode === "OTHER" ? "Explain what happened." : "Shared with the Travio reviewer."}</span>
                  <span className="tabular-nums">{note.length}/1000</span>
                </div>
              </div>

              {submitError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          {loading ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          ) : loadError || !quote ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          ) : openRequest ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                to="/finance?tab=refunds"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                View in Finance <ArrowRight size={14} />
              </Link>
            </div>
          ) : !quote.eligible ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          ) : result ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
              <Link
                to="/finance?tab=refunds"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Track request <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {!canSubmit && !submitting && (
                <p className="text-xs text-slate-500" role="status" aria-live="polite">
                  {missing.length > 2
                    ? "Complete the remaining questions to continue."
                    : missing.length === 2
                      ? `Add ${missing.join(" and ")}.`
                      : `Add ${missing[0]}.`}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-[11px] leading-relaxed text-slate-500 sm:block">
                  Submitting only files a request. No money moves until Travio approves it.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {submitting ? "Submitting…" : "Submit refund request"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
