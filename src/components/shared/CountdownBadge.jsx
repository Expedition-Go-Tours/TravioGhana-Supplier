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

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CountdownBadge({ targetDate, label, variant = "end" }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) return null;

  const v = VARIANTS[variant] || VARIANTS.end;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0",
        v.bg, v.border, v.text
      )}
    >
      <Clock size={10} className={v.icon} />
      <span>{label}</span>
      <span className="font-mono tabular-nums tracking-tight">
        {pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}
