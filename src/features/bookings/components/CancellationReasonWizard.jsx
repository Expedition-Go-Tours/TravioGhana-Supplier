import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_CANCELLATION_FORM,
  validateCancellationForm,
} from "../lib/cancellationReasons";

/**
 * The structured reason step shared by the single-booking cancel modal and the
 * bulk-cancel wizard:
 *
 *   1. category radio cards (plain-language descriptions)
 *   2. reason radio list for the chosen category
 *   3. conditional fields + mandatory T&C checkbox
 *
 * The parent renders the pre-confirm info panel (step 4) after onSubmit.
 */
export default function CancellationReasonWizard({
  taxonomy,
  initialValues,
  initialStage = "category",
  onSubmit,
  onCancel,
  submitLabel = "Continue",
  cancelLabel = "Keep booking",
}) {
  const [stage, setStage] = useState(initialStage);
  const [form, setForm] = useState(() => ({
    ...EMPTY_CANCELLATION_FORM,
    ...(initialValues || {}),
  }));
  const [showErrors, setShowErrors] = useState(false);

  const categories = taxonomy?.categories || [];
  const category = categories.find((c) => c.key === form.category) || null;
  const reasons = form.category
    ? taxonomy?.byCategory?.[form.category] || []
    : [];
  const { errors } = validateCancellationForm(form);

  const patch = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const selectCategory = (key) => {
    // Changing the category invalidates the previously chosen reason.
    setForm((prev) => ({
      ...prev,
      category: key,
      cancellationCode:
        prev.category === key ? prev.cancellationCode : "",
    }));
    setStage("reason");
    setShowErrors(false);
  };

  const selectReason = (code) => {
    patch({ cancellationCode: code });
    setStage("details");
    setShowErrors(false);
  };

  const trySubmit = () => {
    const { isValid } = validateCancellationForm(form);
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    onSubmit?.(form);
  };

  const err = (field) =>
    showErrors && errors[field] ? (
      <p className="mt-1.5 text-xs text-red-600" role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <div>
      {/* ── Step 1: category ── */}
      {stage === "category" && (
        <fieldset>
          <legend className="block text-sm font-medium text-slate-700 mb-2">
            Why are you cancelling?
          </legend>
          <div className="space-y-2">
            {categories.map((c) => (
              <label
                key={c.key}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  form.category === c.key
                    ? "border-[#044b3b] bg-emerald-50/60 ring-1 ring-[#044b3b]/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="cancellation-category"
                  value={c.key}
                  checked={form.category === c.key}
                  onChange={() => selectCategory(c.key)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#044b3b]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    {c.title}
                  </span>
                  <span className="block text-xs text-slate-500 leading-relaxed mt-0.5">
                    {c.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* ── Step 2: reason ── */}
      {stage === "reason" && (
        <fieldset>
          <legend className="block text-sm font-medium text-slate-700 mb-1">
            {category?.title || "Choose a reason"}
          </legend>
          <p className="text-xs text-slate-500 mb-2">
            {category?.description}
          </p>
          <div
            className="space-y-1.5 max-h-64 overflow-y-auto pr-1"
            role="radiogroup"
            aria-label="Cancellation reason"
          >
            {reasons.map((r) => (
              <label
                key={r.code}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                  form.cancellationCode === r.code
                    ? "border-[#044b3b] bg-emerald-50/60 text-slate-800 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="cancellation-reason"
                  value={r.code}
                  checked={form.cancellationCode === r.code}
                  onChange={() => selectReason(r.code)}
                  className="w-4 h-4 shrink-0 accent-[#044b3b]"
                />
                {r.label}
              </label>
            ))}
          </div>
          {err("cancellationCode")}
          <button
            type="button"
            onClick={() => setStage("category")}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={13} /> Change category
          </button>
        </fieldset>
      )}

      {/* ── Step 3: conditional fields + T&C ── */}
      {stage === "details" && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="cancellation-explanation"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              What happened? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancellation-explanation"
              rows={3}
              value={form.explanation}
              onChange={(e) => patch({ explanation: e.target.value })}
              placeholder={
                form.category === "FORCE_MAJEURE"
                  ? "Describe the event in detail — dates, impact on the booking…"
                  : "Explain why the experience can’t go ahead…"
              }
              aria-invalid={Boolean(showErrors && errors.explanation)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] transition-all resize-none"
            />
            {err("explanation")}
          </div>

          {form.category === "FORCE_MAJEURE" && (
            <div>
              <label
                htmlFor="cancellation-evidence"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Evidence link <span className="text-red-500">*</span>
              </label>
              <input
                id="cancellation-evidence"
                type="url"
                inputMode="url"
                value={form.evidenceUrl}
                onChange={(e) => patch({ evidenceUrl: e.target.value })}
                placeholder="https://… (weather report, news article, notice)"
                aria-invalid={Boolean(showErrors && errors.evidenceUrl)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] transition-all"
              />
              {err("evidenceUrl")}
            </div>
          )}

          {form.category === "CUSTOMER_REQUESTED" && (
            <div>
              <p className="block text-sm font-medium text-slate-700 mb-1.5">
                Do you agree to refund the customer?{" "}
                <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-2" role="radiogroup">
                {[true, false].map((value) => (
                  <label
                    key={String(value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer transition-all",
                      form.customerRefundAgreed === value
                        ? "border-[#044b3b] bg-emerald-50/60 text-slate-800 font-medium"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="cancellation-refund-agreed"
                      checked={form.customerRefundAgreed === value}
                      onChange={() => patch({ customerRefundAgreed: value })}
                      className="w-4 h-4 accent-[#044b3b]"
                    />
                    {value ? "Yes, refund the customer" : "No, I disagree"}
                  </label>
                ))}
              </div>
              {err("customerRefundAgreed")}
            </div>
          )}

          <div>
            <label
              htmlFor="cancellation-notes"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Internal notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="cancellation-notes"
              type="text"
              value={form.supplierNotes}
              onChange={(e) => patch({ supplierNotes: e.target.value })}
              placeholder="Visible only to your team"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] transition-all"
            />
          </div>

          <div
            className={cn(
              "rounded-xl border p-3",
              showErrors && errors.agreedToTerms
                ? "border-red-300 bg-red-50/60"
                : "border-slate-200 bg-slate-50"
            )}
          >
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => patch({ agreedToTerms: e.target.checked })}
                className="mt-0.5 w-4 h-4 shrink-0 rounded border-slate-300 accent-[#044b3b]"
                aria-invalid={Boolean(showErrors && errors.agreedToTerms)}
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                <ShieldCheck
                  size={13}
                  className="inline-block -mt-0.5 mr-1 text-[#044b3b]"
                />
                I confirm this cancellation complies with the supplier terms
                and conditions. I understand the customer will receive a full
                refund, that supplier-caused cancellations are recorded against
                my cancellation rate, and that any applicable cancellation fee
                will be deducted from my future payouts.
              </span>
            </label>
            {err("agreedToTerms")}
          </div>

          <button
            type="button"
            onClick={() => setStage("reason")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={13} /> Change reason
          </button>
        </div>
      )}

      {/* ── Wizard footer ── */}
      <div className="flex items-center justify-end gap-3 mt-5">
        {stage === "category" ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                setStage(stage === "details" ? "reason" : "category")
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            {stage === "details" && (
              <button
                type="button"
                onClick={trySubmit}
                disabled={!form.agreedToTerms}
                className="px-5 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-confirm info panel (step 4 of the wizard). The three mandated lines —
 * full refund, fee (operational only), and the customer's choice window.
 */
export function CancellationConfirmPanel({
  taxonomy,
  form,
  variant = "single",
}) {
  const feePct = taxonomy?.feePct ?? 25;
  const choiceWindowHours = taxonomy?.choiceWindowHours ?? 48;
  const feeApplies = form?.category === "OPERATIONAL";
  const subject =
    variant === "batch" ? "Each matched customer" : "The customer";

  return (
    <div className="rounded-xl border border-blue-200/70 bg-blue-50 p-4">
      <ul className="space-y-2 text-sm text-blue-900 leading-relaxed">
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-0.5">•</span>
          {subject} will receive a full refund
        </li>
        {feeApplies && (
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5">•</span>
            A {feePct}% cancellation fee will be deducted from your future
            payouts
          </li>
        )}
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-0.5">•</span>
          {subject} will be asked to pick a new date or a refund within{" "}
          {choiceWindowHours} hours
        </li>
      </ul>
    </div>
  );
}
