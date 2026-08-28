import { CalendarX2 } from "lucide-react";
import CancellationProgressBar from "./CancellationProgressBar";

const STATUS_CONFIG = {
  Excellent: { color: "bg-green-100 text-green-800 border-green-200", icon: "★", label: "Excellent performance" },
  Good: { color: "bg-green-50 text-green-700 border-green-100", icon: "✓", label: "Good performance" },
  "Needs attention": { color: "bg-amber-100 text-amber-800 border-amber-200", icon: "⚠", label: "Needs attention" },
  High: { color: "bg-red-100 text-red-800 border-red-200", icon: "✗", label: "High cancellation rate" },
  "Building performance record": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: "📊", label: "Building performance record" },
};

const PERIOD_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

export default function CancellationCard({ summary, days = 30, onDaysChange, onViewDetails }) {
  const rate = summary?.cancellationRate ?? 0;
  const status = summary?.status ?? "Building performance record";
  const confirmed = summary?.confirmed ?? 0;
  const cancelled = summary?.cancelled ?? 0;
  const completed = summary?.completionRate ?? 0;
  const eligible = summary?.eligibleBookings ?? 0;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG["Building performance record"];

  return (
    <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <CalendarX2 size={22} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Cancellation rate</h2>
            <p className="text-sm text-slate-500">Your booking performance this month</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onDaysChange && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onDaysChange(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            View details
          </button>
        </div>
      </div>

      {/* Main Content: Rate + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Rate + Badge */}
        <div className="space-y-4">
          <div className="text-6xl font-bold text-slate-800 tracking-tight">{rate}%</div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusConfig.color}`}>
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
          <div className="text-sm text-slate-500">
            {eligible < 10 ? (
              <span>Complete at least 10 bookings to receive a cancellation performance rating.</span>
            ) : (
              <span>
                {cancelled} of {eligible} bookings cancelled
              </span>
            )}
          </div>
        </div>

        {/* Right: Stat Boxes */}
        <div className="border border-slate-200 rounded-2xl p-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div className="text-center px-4 py-3">
              <div className="text-3xl font-bold text-slate-800">{confirmed}</div>
              <div className="text-xs text-slate-500 mt-1">Confirmed</div>
            </div>
            <div className="text-center px-4 py-3">
              <div className="text-3xl font-bold text-slate-800">{cancelled}</div>
              <div className="text-xs text-slate-500 mt-1">Cancelled</div>
            </div>
            <div className="text-center px-4 py-3">
              <div className="text-3xl font-bold text-slate-800">{completed}%</div>
              <div className="text-xs text-slate-500 mt-1">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <CancellationProgressBar rate={rate} />

      {/* Legend + Period Selector */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-700" />
          Excellent
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-300" />
          Good
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          Needs attention
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          High
        </div>
      </div>

      {/* Performance Tip */}
      <div className="mt-4 text-xs text-slate-500 text-center">
        Keep your cancellation rate below 2% to maintain excellent performance.
      </div>
    </div>
  );
}
