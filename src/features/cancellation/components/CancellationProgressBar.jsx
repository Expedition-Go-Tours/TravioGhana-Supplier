// Cancellation-rate gauge with GetYourGuide thresholds on a 0–6% scale:
// Excellent ≤1% · Above standard ≤2% · At risk ≤5% · High >5%
export default function CancellationProgressBar({ rate }) {
  const clampedRate = Math.min(Math.max(rate, 0), 6);
  const position = (clampedRate / 6) * 100;
  const pinColor =
    clampedRate <= 1
      ? "#166534"
      : clampedRate <= 2
        ? "#eab308"
        : clampedRate <= 5
          ? "#f97316"
          : "#ef4444";

  return (
    <div className="space-y-1">
      {/* Your rate label with pointer */}
      <div className="relative inline-block">
        <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          Your rate
        </div>
        <div className="absolute left-4 -bottom-1.5 w-2.5 h-2.5 bg-white border-b border-r border-slate-200 transform rotate-45" />
      </div>

      {/* Progress bar container */}
      <div className="relative h-8 flex items-center">
        {/* Gradient bar — 0–1 / 1–2 / 2–5 / 5–6 zones */}
        <div
          className="h-3 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #166534 0%, #166534 16.67%, #eab308 16.67%, #eab308 33.33%, #f97316 33.33%, #f97316 83.33%, #ef4444 83.33%, #ef4444 100%)",
          }}
        />

        {/* Location pin marker */}
        <div
          className="absolute z-10 transition-all duration-500 ease-out"
          style={{
            left: `${position}%`,
            transform: "translateX(-50%)",
            top: "-10px",
          }}
        >
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
            <path
              d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 18 10 18s10-10.5 10-18c0-5.523-4.477-10-10-10z"
              fill={pinColor}
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="9.5" r="4" fill="white" />
          </svg>
        </div>
      </div>

      {/* Scale labels — positioned on the same 0–6% scale as the bar, so
          "1%" sits under the 1% junction rather than a third of the way in. */}
      <div className="relative h-4 text-xs text-slate-500">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2" style={{ left: "16.67%" }}>1%</span>
        <span className="absolute -translate-x-1/2" style={{ left: "33.33%" }}>2%</span>
        <span className="absolute -translate-x-1/2" style={{ left: "83.33%" }}>5%</span>
        <span className="absolute right-0">6%+</span>
      </div>
    </div>
  );
}
