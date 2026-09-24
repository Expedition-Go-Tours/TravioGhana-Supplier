import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Check, ChevronRight, Clock, Info, Loader2, PauseCircle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { updatePayoutSettings } from "../api";

/**
 * Payout schedule (GetYourGuide-style).
 *
 * Two pieces, one source of truth:
 *   PayoutScheduleEditor  — the chooser (Settings → Payout Settings)
 *   PayoutScheduleSummary — the read-only "next payout" card (Finance page)
 *
 * The backend sends the authoritative option list in `plan.options`; the
 * fallback below keeps the UI correct on an older payload but must never be the
 * only copy. Cadence wording deliberately avoids "bi-monthly"/"bi-weekly" and
 * always states the anchor days.
 */
const CYCLE_OPTIONS = [
  {
    value: "WEEKLY",
    shortLabel: "Weekly",
    runDays: "Every Monday",
    label: "Every week — paid every Monday",
    description: "Payouts are generated every Monday for experiences completed by the Sunday before.",
  },
  {
    value: "TWICE_MONTHLY",
    shortLabel: "Twice a month",
    runDays: "The 1st & 15th",
    label: "Twice a month — paid on the 1st & 15th",
    description: "Payouts are generated twice a month, on the 1st and the 15th.",
  },
  {
    value: "MONTHLY",
    shortLabel: "Monthly",
    runDays: "The 1st of each month",
    label: "Monthly — paid on the 1st",
    description: "One payout a month, generated on the 1st for the previous month.",
  },
];

const DEFAULT_OPTION = "TWICE_MONTHLY";

/** "Mon 6 Oct" (adds the year when it isn't this one) — run dates read better with a weekday. */
function formatRunDate(value, { withYear = true } = {}) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const opts = { weekday: "short", day: "numeric", month: "short" };
  if (withYear && d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-GB", opts);
}

function formatLongDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function optionsFor(plan) {
  return plan?.options?.length ? plan.options : CYCLE_OPTIONS;
}

function optionFor(plan, value) {
  return optionsFor(plan).find((o) => o.value === value) || null;
}

/** Small "switching on …" chip shared by both surfaces. */
function PendingChangeChip({ plan, onCancel, cancelling }) {
  if (!plan?.pendingCycle) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">
        <Clock size={12} />
        Switching to {optionFor(plan, plan.pendingCycle)?.shortLabel || plan.pendingCycle} on {formatLongDate(plan.pendingEffectiveAt)}
      </span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2 disabled:opacity-50"
        >
          {cancelling ? "Cancelling…" : "Cancel change"}
        </button>
      )}
    </div>
  );
}

/**
 * The chooser. Everything it needs comes from the server projection, so after a
 * save it hands the refreshed plan back to the parent (which keeps the Finance
 * page in sync on the next visit).
 */
export function PayoutScheduleEditor({ plan, available = 0, currency = "USD", onSaved }) {
  const options = optionsFor(plan);
  const baseline = plan?.pendingCycle || plan?.cycle || plan?.defaultCycle || DEFAULT_OPTION;
  const [selected, setSelected] = useState(baseline);
  const [initial] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const dirty = selected !== initial;
  const paused = plan?.autoRunsEnabled === false;
  const selectedOption = optionFor(plan, selected);
  // A plan change lands on the 1st of next month unless this is a first
  // enrolment (which the backend applies immediately).
  const isFirstEnrolment = !plan?.cycle;
  const nextRun = plan?.nextRunAt ? formatRunDate(plan.nextRunAt) : null;

  const save = async (cycle) => {
    setSaving(true);
    try {
      const updated = await updatePayoutSettings(cycle);
      if (updated?.pendingCycle) {
        toast.success(`Switching to ${optionFor(updated, updated.pendingCycle)?.shortLabel || updated.pendingCycle} on ${formatLongDate(updated.pendingEffectiveAt)}`);
      } else {
        const next = updated?.nextRunAt ? ` Next payout ${formatRunDate(updated.nextRunAt)}.` : "";
        toast.success(`Payout schedule updated.${next}`);
      }
      onSaved?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update your payout schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!dirty || saving) return;
    save(selected);
  };

  const handleCancelPending = async () => {
    if (!plan?.cycle) return;
    setCancelling(true);
    try {
      const updated = await updatePayoutSettings(plan.cycle);
      toast.success("Scheduled change cancelled");
      onSaved?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel the scheduled change");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Calendar size={16} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Payout schedule</h2>
          <p className="text-xs text-slate-500">
            Choose how often you get paid. Your earnings are paid out automatically — no request needed.
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {paused && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <PauseCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Automatic payouts are temporarily paused. Your schedule is saved and will resume automatically — in the
              meantime you can still request a payout from the Finance page.
            </p>
          </div>
        )}

        <div role="radiogroup" aria-label="Payout schedule" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(option.value)}
                className={cn(
                  "relative text-left p-4 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm font-semibold", isSelected ? "text-emerald-800" : "text-slate-700")}>
                    {option.shortLabel}
                  </p>
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0",
                      isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                    )}
                  >
                    {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-1.5">{option.runDays}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{option.description}</p>
              </button>
            );
          })}
        </div>

        {/* What the choice will actually do */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Next payout</span>
            <span className="font-semibold text-slate-800">
              {nextRun || "—"}
              {plan?.nextRunPeriodLabel && <span className="font-normal text-slate-400"> · covering {plan.nextRunPeriodLabel}</span>}
            </span>
          </div>
          {available > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Accumulating now</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(available, currency)}</span>
            </div>
          )}
          <div className="flex items-start gap-2 pt-1">
            <Info size={13} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500">
              {isFirstEnrolment
                ? "Your first payout runs on the next payout date above."
                : dirty
                  ? `Your change takes effect on ${formatLongDate(plan?.pendingEffectiveAt || nextMonthFirst())} so a payout is never split mid-cycle.`
                  : "Changes take effect on the 1st of the following month so a payout is never split mid-cycle."}
            </p>
          </div>
        </div>

        <PendingChangeChip plan={plan} onCancel={handleCancelPending} cancelling={cancelling} />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            {selectedOption ? `Selected: ${selectedOption.label}` : ""}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm",
              dirty && !saving
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextMonthFirst() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Read-only card for the Finance page: the current plan, the next run and what
 * is accumulating toward it. Replaces the legacy withdrawal-window card for
 * enrolled suppliers.
 */
export function PayoutScheduleSummary({ plan, available = 0, currency = "USD" }) {
  const option = optionFor(plan, plan?.cycle);
  const paused = plan?.autoRunsEnabled === false;

  return (
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-white shrink-0">
          <Calendar size={24} className="text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700">Payout schedule</p>
          <p className="text-xl font-bold text-gray-900">
            {option?.label || plan?.scheduleLabel || "—"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
              Next payout {formatRunDate(plan?.nextRunAt)}
            </span>
            {plan?.nextRunPeriodLabel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                Covering {plan.nextRunPeriodLabel}
              </span>
            )}
            {paused && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                <PauseCircle size={11} /> Paused
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {formatCurrency(available, currency)} accumulating · only completed bookings past their travel date are included.
          </p>
          <div className="mt-2">
            <PendingChangeChip plan={plan} />
          </div>
        </div>
      </div>
      <Link
        to="/settings?tab=payouts"
        className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap"
      >
        <Pencil size={15} />
        Change schedule
        <ChevronRight size={15} />
      </Link>
    </div>
  );
}

export default PayoutScheduleEditor;
