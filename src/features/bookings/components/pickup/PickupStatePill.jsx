import { pickupStateMeta } from "../../lib/pickupState";

/** Small state chip for a pickup row: sky = awaiting, red = incomplete, green = confirmed. */
export default function PickupStatePill({ state, className = "" }) {
  const meta = pickupStateMeta(state);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
