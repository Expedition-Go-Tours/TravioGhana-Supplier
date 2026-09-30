import { cn } from "@/lib/utils";

/**
 * Status chips in the portal's shared badge language (`StatusBadge`):
 * rounded-full, hairline border, coloured dot, xs type. The four tones reuse
 * StatusBadge's exact palette values so a "Confirmed" pill looks identical
 * wherever it appears in the dashboard.
 */
const TONES = {
  green: { wrapper: "bg-[#ebfcf5] text-[#047857] border-[#6ee7b7]", dot: "bg-[#00d67f]" },
  amber: { wrapper: "bg-[#fff7ed] text-[#c2410c] border-[#fdba74]", dot: "bg-[#f97316]" },
  blue: { wrapper: "bg-[#eff6ff] text-[#1d4ed8] border-[#93c5fd]", dot: "bg-[#298dff]" },
  red: { wrapper: "bg-[#ffebeb] text-[#b91c1c] border-[#fca5a5]", dot: "bg-[#dc3545]" },
};

export default function StaysPill({ tone = "green", className, children }) {
  const style = TONES[tone] || TONES.green;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        style.wrapper,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {children}
    </span>
  );
}
