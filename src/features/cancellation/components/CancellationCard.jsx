import { AlertTriangle, CalendarX2, ClipboardList, Star, X } from "lucide-react";
import CancellationProgressBar from "./CancellationProgressBar";

// GetYourGuide Performance Quality Standards vocabulary (matches the
// backend getStatus()):
//   < 10 eligible bookings → Building performance record (rating waived)
//   ≤ 1% → Excellent · ≤ 2% → Above standard · ≤ 5% → At risk · > 5% → High
// GetYourGuide's published bar is 1%, so 1–2% is deliberately not labelled
// "Good" — it is above the standard.
const STATUS_CONFIG = {
  Excellent: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Star,
    label: "Excellent",
  },
  "Above standard": {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertTriangle,
    label: "Above standard",
  },
  "At risk": {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    label: "At risk",
  },
  High: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: X,
    label: "High",
  },
  "Building performance record": {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: ClipboardList,
    label: "Building performance record",
  },
};

// Defensive aliases for a frontend served before the backend deploy lands.
const LEGACY_STATUS_LABELS = {
  Good: "Above standard",
  "Needs attention": "At risk",
};

const PERIOD_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

export default function CancellationCard({ summary, days = 90, onDaysChange, onViewDetails }) {
  const rate = summary?.cancellationRate ?? 0;
  const upcoming = summary?.upcomingConfirmed ?? 0;
  const cancelled = summary?.cancelled ?? 0;
  const supplierCaused = summary?.supplierCausedCount ?? 0;
  const completed = summary?.completed ?? 0;
  const eligible = summary?.eligibleBookings ?? 0;
  const noShowRate = summary?.noShowRate ?? 0;

  const serverStatus = summary
    ? LEGACY_STATUS_LABELS[summary.status] || summary.status
    : "Building performance record";
  const status = STATUS_CONFIG[serverStatus] ? serverStatus : "Building performance record";
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const periodLabel = `the last ${days} days`;
  const cancellationWord = cancelled === 1 ? "cancellation" : "cancellations";

  return (
    <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <CalendarX2 size={22} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Cancellation rate</h2>
            <p className="text-sm text-slate-500">Your booking performance over time</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {onDaysChange && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5" role="group" aria-label="Reporting period">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onDaysChange(opt.value)}
                  aria-pressed={days === opt.value}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    days === opt.value
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={onViewDetails}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            View details
          </button>
        </div>
      </div>

      {/* Main Content: Rate + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Rate + Badge */}
        <div className="space-y-3">
          <div className="text-6xl font-bold text-slate-800 tracking-tight">{rate}%</div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusConfig.color}`}
            title={status === "Above standard" ? "Above the 1% standard" : undefined}
          >
            <StatusIcon size={14} aria-hidden="true" />
            {statusConfig.label}
          </div>

          {/* The rate on its own hid the fact that 11 cancellations were all
              customer-caused. Always show the three numbers together. */}
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{cancelled}</span> {cancellationWord} ·{" "}
            <span className="font-semibold text-slate-800">{supplierCaused}</span> supplier-caused ·{" "}
            <span className="font-semibold text-slate-800">{rate}%</span> rate
          </p>
          <p className="text-xs text-slate-500">
            Based on {eligible} eligible booking{eligible === 1 ? "" : "s"} in {periodLabel}.
          </p>
          {eligible < 10 && (
            <p className="text-xs text-slate-500">
              Your rating is waived until you have 10 eligible bookings. Until then we
              show the rate for context, not a grade.
            </p>
          )}
        </div>

        {/* Right: Stat Boxes */}
        <div className="border border-slate-200 rounded-2xl p-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div
              className="text-center px-2 sm:px-4 py-3"
              title="Confirmed bookings with a future travel date — they join the rate when they travel or are cancelled."
            >
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{upcoming}</div>
              <div className="text-xs text-slate-500 mt-1">Upcoming</div>
            </div>
            <div className="text-center px-2 sm:px-4 py-3">
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{cancelled}</div>
              <div className="text-xs text-slate-500 mt-1">Cancelled</div>
            </div>
            <div className="text-center px-2 sm:px-4 py-3">
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{completed}</div>
              <div className="text-xs text-slate-500 mt-1">Completed</div>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-1 pt-2.5 text-center text-xs text-slate-500">
            Traveller no-show <span className="font-semibold text-slate-700">{noShowRate}%</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Bookings where the traveller did not arrive. You are still paid.
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <CancellationProgressBar rate={rate} />

      {/* Legend + Thresholds */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-700" />
          Excellent ≤1%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          Above standard ≤2%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          At risk ≤5%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          High &gt;5%
        </div>
      </div>

      {/* Performance Tip */}
      <div className="mt-4 text-xs text-slate-500 text-center">
        GetYourGuide&apos;s standard is 1% or lower. Ratings are waived below 10 bookings.
        A High rating means we may reach out to help — your products are never removed automatically.
      </div>
    </div>
  );
}
