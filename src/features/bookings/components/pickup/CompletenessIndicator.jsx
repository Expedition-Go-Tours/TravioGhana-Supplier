import { CheckCircle2, AlertTriangle } from "lucide-react";

function getPickupCompleteness(pickup) {
  if (!pickup) return { missing: ["place", "time", "instructions"], score: 0 };
  const missing = [];
  if (!pickup.place && !pickup.areaName && !pickup.locationName && !pickup.address)
    missing.push("place");
  if (!pickup.time) missing.push("time");
  if (!pickup.instructions) missing.push("instructions");
  return { missing, score: 3 - missing.length };
}

export default function CompletenessIndicator({ pickup }) {
  const { score } = getPickupCompleteness(pickup);
  if (score === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">
        <CheckCircle2 size={11} /> Complete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
      <AlertTriangle size={11} /> {score === 0 ? "No info" : `${score}/3`}
    </span>
  );
}

export { getPickupCompleteness };
