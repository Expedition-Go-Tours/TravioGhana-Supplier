import { Clock } from "lucide-react";
import useCountdown from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

const VARIANTS = {
  start: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
  end: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    icon: "text-rose-500",
  },
};

export default function CountdownBadge({ targetDate, label, variant = "end" }) {
  const { days, hours, minutes, isExpired } = useCountdown(targetDate);

  if (isExpired) return null;

  const v = VARIANTS[variant] || VARIANTS.end;

  // Coarse units on purpose: a seconds clock ticking in a list is noise, and
  // nothing in the offer changes between two minute boundaries.
  const value = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        v.bg, v.border, v.text
      )}
    >
      <Clock size={10} className={v.icon} />
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
