import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

/**
 * The property builder's navigation footer — the Stays mirror of the product
 * builder's WizardNavFooter: Back on the left, a status zone in the middle
 * (saving / validation error / draft saved) and the primary action on the
 * right, which becomes "Submit for review" on the last step.
 */
export default function PropertyBuilderFooter({
  stepNumber,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  error,
  saving = false,
  submitting = false,
  lastSavedAt,
}) {
  const [savedText, setSavedText] = useState("");

  useEffect(() => {
    if (!lastSavedAt || saving) return;
    const show = setTimeout(() => setSavedText("Draft saved"), 0);
    const hide = setTimeout(() => setSavedText(""), 2500);
    return () => {
      clearTimeout(hide);
      clearTimeout(show);
    };
  }, [lastSavedAt, saving]);

  const isFirstStep = stepNumber === 1;
  const isLastStep = stepNumber === totalSteps;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-6 sm:py-4 lg:px-8 sm:flex-nowrap sm:items-start">
      <div className="order-2 flex w-[calc(50%-6px)] items-center gap-3 sm:order-1 sm:w-auto sm:pt-1">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="order-1 flex w-full min-w-0 flex-col items-center gap-1 sm:order-2 sm:w-auto">
        {saving && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
            <Loader2 size={14} className="animate-spin" />
            Saving...
          </span>
        )}
        {!saving && error && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:w-auto sm:max-w-[500px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <AlertTriangle size={12} />
            </span>
            <p className="text-sm text-slate-700">{error}</p>
          </div>
        )}
        {!saving && !error && savedText && (
          <span className="text-xs font-semibold text-emerald-600">{savedText}</span>
        )}
      </div>

      <div className="order-3 flex w-[calc(50%-6px)] items-center justify-end gap-3 sm:w-auto sm:justify-start sm:pt-1">
        {!isLastStep ? (
          <button
            type="button"
            onClick={onNext}
            disabled={saving || submitting}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || submitting}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : saving ? "Saving..." : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}
