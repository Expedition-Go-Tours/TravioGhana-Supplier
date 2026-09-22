import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CalendarX2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import DatePicker from "@/components/forms/DatePicker";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { fetchSupplierBookings, cancelBookingsBatch, getCancellationTaxonomy } from "../api";
import { fetchCancellationProducts } from "@/features/cancellation/api";
import {
  cancellationPayload,
  validateCancellationForm,
} from "../lib/cancellationReasons";
import CancellationReasonWizard, {
  CancellationConfirmPanel,
} from "./CancellationReasonWizard";

/**
 * GYG-style bulk cancellation wizard (Cancel multiple bookings):
 *   1. tour + date range (+ optional time)
 *   2. preview of matched bookings + mandatory "stop accepting new bookings"
 *   3. the SAME structured reason wizard (one reason for the whole batch)
 *   4. result screen (cancelled / failed / refunded / fees / blocked dates)
 */
export default function BulkCancelWizard({ isOpen, onClose, onCompleted }) {
  const [step, setStep] = useState("scope"); // scope | preview | reason | confirm | result
  const [scope, setScope] = useState({ tourId: "", dateFrom: "", dateTo: "", time: "" });
  const [scopeError, setScopeError] = useState("");
  const [stopAcceptingBookings, setStopAcceptingBookings] = useState(false);

  const [tours, setTours] = useState([]);
  const [toursLoading, setToursLoading] = useState(false);
  const [toursError, setToursError] = useState(false);

  const [preview, setPreview] = useState({ loading: false, count: 0, truncated: false, error: false });
  const [previewAttempt, setPreviewAttempt] = useState(0);

  const [taxonomy, setTaxonomy] = useState(null);
  const [taxonomyError, setTaxonomyError] = useState(false);

  const [form, setForm] = useState(null);
  const [wizardSeed, setWizardSeed] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const dialogRef = useRef(null);

  const loadTours = useCallback(async () => {
    setToursError(false);
    setToursLoading(true);
    try {
      setTours(await fetchCancellationProducts());
    } catch {
      setToursError(true);
    } finally {
      setToursLoading(false);
    }
  }, []);

  const loadTaxonomy = useCallback(async () => {
    setTaxonomyError(false);
    try {
      setTaxonomy(await getCancellationTaxonomy());
    } catch {
      setTaxonomyError(true);
    }
  }, []);

  // Reset when the wizard opens (adjust-state-during-render pattern).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setStep("scope");
    setScope({ tourId: "", dateFrom: "", dateTo: "", time: "" });
    setScopeError("");
    setStopAcceptingBookings(false);
    setForm(null);
    setWizardSeed(null);
    setResult(null);
    setToursError(false);
    setTaxonomyError(false);
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    // Deferred one microtask so the loaders never setState synchronously
    // inside the effect body (react-hooks/set-state-in-effect).
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (tours.length === 0 && !toursError) loadTours();
      if (!taxonomy && !taxonomyError) loadTaxonomy();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tours.length, toursError, taxonomy, taxonomyError, loadTours, loadTaxonomy]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, submitting]);

  // ── Step 2: best-effort matched-count preview from the supplier bookings ──
  useEffect(() => {
    if (!isOpen || step !== "preview") return;
    let cancelled = false;
    // Kicked off one microtask later so no state is set synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      if (cancelled) return;
      setPreview({ loading: true, count: 0, truncated: false, error: false });
      (async () => {
        try {
          const result = await fetchSupplierBookings({ page: 1, limit: 1000, tourId: scope.tourId });
          if (cancelled) return;
          const start = new Date(scope.dateFrom);
          const end = new Date(scope.dateTo);
          end.setHours(23, 59, 59, 999);
          const count = result.bookings.filter((b) => {
            if (b.status !== "PENDING" && b.status !== "CONFIRMED") return false;
            if (scope.time && b.selectedTime !== scope.time) return false;
            const travel = new Date(b.travelDate);
            return travel >= start && travel <= end;
          }).length;
          const truncated = (result.pagination?.totalCount ?? 0) > 1000;
          setPreview({ loading: false, count, truncated, error: false });
        } catch {
          if (!cancelled) setPreview({ loading: false, count: 0, truncated: false, error: true });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, step, previewAttempt, scope.tourId, scope.dateFrom, scope.dateTo, scope.time]);

  const busy = submitting;
  const selectedTour = tours.find((t) => t.id === scope.tourId) || null;

  const goToPreview = () => {
    if (!scope.tourId) return setScopeError("Choose a tour.");
    if (!scope.dateFrom || !scope.dateTo) return setScopeError("Choose a start and end date.");
    if (new Date(scope.dateTo) < new Date(scope.dateFrom))
      return setScopeError("The end date must be on or after the start date.");
    setScopeError("");
    setStep("preview");
  };

  const handleWizardSubmit = (wizardForm) => {
    setForm(wizardForm);
    setStep("confirm");
  };

  const handleBackToReason = () => {
    setWizardSeed({ values: form, stage: "details" });
    setStep("reason");
  };

  const handleSubmit = async () => {
    if (!form) return;
    const { isValid } = validateCancellationForm(form);
    if (!isValid) {
      setWizardSeed({ values: form, stage: "details" });
      setStep("reason");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        tourId: scope.tourId,
        dateFrom: scope.dateFrom,
        dateTo: scope.dateTo,
        stopAcceptingBookings,
        ...cancellationPayload(form),
      };
      if (scope.time) body.selectedTime = scope.time;
      const response = await cancelBookingsBatch(body);
      const data = response.data?.data || null;
      setResult(data);
      setStep("result");
      if (data?.requested !== undefined || Array.isArray(data?.requests)) {
        const count = data?.requested ?? 0;
        toast.success(
          `${count} cancellation request${count === 1 ? "" : "s"} submitted for review`
        );
      } else {
        toast.success(
          `Cancelled ${data?.cancelled ?? 0} booking${data?.cancelled === 1 ? "" : "s"}`
        );
      }
      onCompleted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel bookings");
    } finally {
      setSubmitting(false);
    }
  };

  const STEP_LABELS = [
    { key: "scope", label: "Dates" },
    { key: "preview", label: "Review" },
    { key: "reason", label: "Reason" },
    { key: "result", label: "Result" },
  ];
  const stepIndex =
    step === "confirm"
      ? 2 // confirm belongs to the reason step group
      : Math.max(0, STEP_LABELS.findIndex((s) => s.key === step));

  const close = () => {
    if (!busy) onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Cancel multiple bookings"
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
                  <CalendarX2 size={18} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    Cancel multiple bookings
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    One tour, one date range, one reason
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Close"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step indicator */}
            {step !== "result" && (
              <ol className="flex items-center gap-1.5 mb-5" aria-label="Progress">
                {STEP_LABELS.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium",
                        i === stepIndex
                          ? "bg-[#044b3b] text-white"
                          : i < stepIndex
                            ? "bg-emerald-50 text-[#044b3b]"
                            : "bg-slate-100 text-slate-400"
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full text-[10px] flex items-center justify-center",
                          i < stepIndex ? "bg-[#044b3b] text-white" : "bg-transparent"
                        )}
                      >
                        {i < stepIndex ? "✓" : i + 1}
                      </span>
                      {s.label}
                    </span>
                    {i < STEP_LABELS.length - 1 && (
                      <span className="w-3 h-px bg-slate-200" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            )}

            {/* ── Taxonomy / tours load errors ── */}
            {step === "reason" && taxonomyError && (
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

            {/* ══ Step 1: tour + date range ══ */}
            {step === "scope" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tour <span className="text-red-500">*</span>
                  </label>
                  {toursLoading ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                      <Loader2 size={15} className="animate-spin shrink-0" />
                      Loading your tours…
                    </div>
                  ) : toursError ? (
                    <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      Couldn’t load your tours.
                      <button
                        type="button"
                        onClick={loadTours}
                        className="shrink-0 px-3 py-1 text-xs font-medium bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <Select
                      value={scope.tourId}
                      onValueChange={(v) => setScope((p) => ({ ...p, tourId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a tour" />
                      </SelectTrigger>
                      <SelectContent>
                        {tours.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      From <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={scope.dateFrom}
                      onChange={(v) => setScope((p) => ({ ...p, dateFrom: v }))}
                      placeholder="Start date"
                      maxDate={scope.dateTo || undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      To <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={scope.dateTo}
                      onChange={(v) => setScope((p) => ({ ...p, dateTo: v }))}
                      placeholder="End date"
                      minDate={scope.dateFrom || undefined}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="bulk-cancel-time"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Time{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="bulk-cancel-time"
                    type="time"
                    value={scope.time}
                    onChange={(e) => setScope((p) => ({ ...p, time: e.target.value }))}
                    className="w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] transition-all"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Leave empty to include every time slot on those dates.
                  </p>
                </div>

                {scopeError && (
                  <p className="text-sm text-red-600" role="alert">
                    {scopeError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={goToPreview}
                    disabled={!scope.tourId || !scope.dateFrom || !scope.dateTo}
                    className="px-5 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ══ Step 2: preview + mandatory stop-selling prompt ══ */}
            {step === "preview" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-800">
                    {selectedTour?.name || "Selected tour"}
                  </p>
                  <p>
                    {formatDate(scope.dateFrom)} – {formatDate(scope.dateTo)}
                    {scope.time ? ` · ${scope.time}` : " · all time slots"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  {preview.loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 size={15} className="animate-spin" />
                      Counting matching bookings…
                    </div>
                  ) : preview.error ? (
                    <div className="flex items-center justify-between gap-3 text-sm text-red-700">
                      <span className="flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0" />
                        Couldn’t count matching bookings.
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewAttempt((n) => n + 1)}
                        className="shrink-0 px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : preview.count === 0 ? (
                    <p className="text-sm text-slate-600">
                      No pending or confirmed bookings match this tour, date
                      range{scope.time ? " and time" : ""}.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700">
                      <span className="text-xl font-bold text-slate-900 mr-1.5">
                        {preview.count}
                        {preview.truncated ? "+" : ""}
                      </span>
                      pending or confirmed booking
                      {preview.count === 1 && !preview.truncated ? "" : "s"} match
                      this selection.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Counted from your current bookings — the final number is
                    confirmed when the cancellation runs.
                  </p>
                </div>

                {/* Mandatory stop-selling prompt */}
                <div className="rounded-xl border border-amber-200/70 bg-amber-50 p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stopAcceptingBookings}
                      onChange={(e) => setStopAcceptingBookings(e.target.checked)}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded border-amber-400 accent-[#044b3b]"
                    />
                    <span className="text-sm font-medium text-amber-900">
                      Also stop accepting new bookings for these dates
                    </span>
                  </label>
                  <p className="mt-1.5 ml-6 text-xs text-amber-800 leading-relaxed">
                    Availability for {formatDate(scope.dateFrom)} –{" "}
                    {formatDate(scope.dateTo)} will be blocked on your calendar,
                    so customers won’t be able to book while it’s blocked. You
                    can unblock the dates later from Availability.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("scope")}
                    disabled={busy}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("reason")}
                    disabled={
                      preview.loading || preview.error || preview.count === 0
                    }
                    className="px-5 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ══ Step 3: structured reason wizard ══ */}
            {step === "reason" && taxonomy && (
              <CancellationReasonWizard
                key={wizardSeed ? `seed-${wizardSeed.stage}` : "fresh"}
                taxonomy={taxonomy}
                initialValues={wizardSeed?.values || null}
                initialStage={wizardSeed?.stage || "category"}
                onSubmit={handleWizardSubmit}
                onCancel={() => setStep("preview")}
                cancelLabel="Back to review"
              />
            )}
            {step === "reason" && !taxonomy && !taxonomyError && (
              <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-sm">Loading cancellation options…</p>
              </div>
            )}

            {/* ══ Step 3b: pre-confirm info panel ══ */}
            {step === "confirm" && taxonomy && form && (
              <div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Scope: </span>
                  {selectedTour?.name || "Selected tour"} ·{" "}
                  {formatDate(scope.dateFrom)} – {formatDate(scope.dateTo)}
                  {scope.time ? ` · ${scope.time}` : ""}
                  {preview.count > 0 && (
                    <span> · {preview.count} matched booking(s)</span>
                  )}
                </div>

                <CancellationConfirmPanel
                  taxonomy={taxonomy}
                  form={form}
                  variant="batch"
                />

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
                    onClick={handleSubmit}
                    disabled={busy || form.agreedToTerms !== true}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Confirm &amp; cancel{" "}
                    {preview.count > 0 ? preview.count : ""} bookings
                  </button>
                </div>
              </div>
            )}

            {/* ══ Step 4: result (executed vs parked requests) ══ */}
            {step === "result" && result && (
              <div>
                <BulkCancelResult result={result} taxonomy={taxonomy} />

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={close}
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
 * Result step for the bulk-cancel wizard. Branches on whether the batch was
 * executed (flag OFF, `cancelled`) or parked as approval requests (flag ON,
 * `requested`/`requests`). Exported for focused tests of both branches.
 */
export function BulkCancelResult({ result, taxonomy }) {
  if (!result) return null;

  const isRequest =
    result.requested !== undefined || Array.isArray(result.requests);

  if (isRequest) {
    const requested = result.requested ?? 0;
    const skipped = result.skipped ?? 0;
    const failed = result.failed ?? 0;
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Requests submitted", value: requested },
            { label: "Skipped", value: skipped },
            { label: "Failed", value: failed },
            { label: "Matched", value: result.matched ?? 0 },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="flex items-start gap-2">
            <CheckCircle2
              size={15}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <span>
              {requested} cancellation request{requested === 1 ? "" : "s"}{" "}
              submitted for review. Nothing has been cancelled yet and the
              customers have not been told — each request is reviewed by our
              team.
            </span>
          </p>

          {result.stopSellingApplied && result.blockedDates?.length > 0 && (
            <p className="flex items-start gap-2">
              <Ban size={15} className="text-amber-600 shrink-0 mt-0.5" />
              Stop-selling is already live for{" "}
              {result.blockedDates.length} date
              {result.blockedDates.length === 1 ? "" : "s"}:{" "}
              {result.blockedDates.slice(0, 6).join(", ")}
              {result.blockedDates.length > 6
                ? ` +${result.blockedDates.length - 6} more`
                : ""}
              . Withdrawing a request re-opens them.
            </p>
          )}

          {result.overflow && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200/70 p-3 text-amber-800">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              Your selection matched more bookings than one run can process
              (100 max). This run included the first 100 — run the wizard again
              for the rest.
            </p>
          )}

          {failed > 0 && Array.isArray(result.results) && (
            <ul className="rounded-lg bg-red-50 border border-red-200/70 p-3 text-xs text-red-700 space-y-1">
              <li className="font-semibold">
                {failed} booking(s) could not be submitted:
              </li>
              {result.results
                .filter((r) => !r.ok)
                .slice(0, 5)
                .map((r) => (
                  <li key={r.bookingId}>
                    {r.bookingNumber}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Cancelled", value: result.cancelled ?? 0 },
          { label: "Failed", value: result.failed ?? 0 },
          {
            label: "Total refunded",
            value: formatCurrency(Number(result.totalRefunded) || 0),
          },
          {
            label: "Cancellation fees",
            value: formatCurrency(Number(result.totalFees) || 0),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-lg font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          {result.matched ?? 0} booking(s) matched this run. Each customer gets
          a full refund and {(taxonomy?.feePct ?? 25) + "%"} cancellation fees (
          {formatCurrency(Number(result.totalFees) || 0)}) are deducted
          automatically from your next payout request.
        </p>

        {result.blockedDates?.length > 0 && (
          <p className="flex items-start gap-2">
            <Ban size={15} className="text-amber-600 shrink-0 mt-0.5" />
            Stopped accepting bookings for {result.blockedDates.length} date
            {result.blockedDates.length === 1 ? "" : "s"}:{" "}
            {result.blockedDates.slice(0, 6).join(", ")}
            {result.blockedDates.length > 6
              ? ` +${result.blockedDates.length - 6} more`
              : ""}
          </p>
        )}

        {result.overflow && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200/70 p-3 text-amber-800">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            Your selection matched more bookings than one run can cancel (100
            max). This run included the first 100 — run the wizard again to
            cancel the rest.
          </p>
        )}

        {result.failed > 0 && Array.isArray(result.results) && (
          <ul className="rounded-lg bg-red-50 border border-red-200/70 p-3 text-xs text-red-700 space-y-1">
            <li className="font-semibold">
              {result.failed} booking(s) could not be cancelled:
            </li>
            {result.results
              .filter((r) => !r.ok)
              .slice(0, 5)
              .map((r) => (
                <li key={r.bookingId}>
                  {r.bookingNumber}: {r.error}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
