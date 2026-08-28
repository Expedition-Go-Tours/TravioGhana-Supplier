export default function CancellationProgressBar({ rate }) {
  const clampedRate = Math.min(Math.max(rate, 0), 6);
  const position = (clampedRate / 6) * 100;
  const pinColor = clampedRate < 2 ? "#166534" : clampedRate < 3 ? "#22c55e" : clampedRate < 5 ? "#f59e0b" : "#ef4444";

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
        {/* Gradient bar */}
        <div
          className="h-3 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #166534 0%, #166534 33.33%, #86efac 33.33%, #86efac 50%, #f59e0b 50%, #f59e0b 75%, #ef4444 75%, #ef4444 100%)",
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

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-slate-500 pt-1">
        <span>0%</span>
        <span>2%</span>
        <span>3%</span>
        <span>5%+</span>
      </div>
    </div>
  );
}
