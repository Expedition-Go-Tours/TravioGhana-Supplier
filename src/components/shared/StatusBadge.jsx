import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  AWAITING_CONFIRMATION: {
    bg: "bg-[#f1f5f9]",
    text: "text-[#475569]",
    border: "border-[#e2e8f0]",
    dot: "bg-[#94a3b8]",
  },
  CONFIRMED: {
    bg: "bg-[#eff6ff]",
    text: "text-[#1d4ed8]",
    border: "border-[#93c5fd]",
    dot: "bg-[#298dff]",
  },
  CANCELLED: {
    bg: "bg-[#ffebeb]",
    text: "text-[#b91c1c]",
    border: "border-[#fca5a5]",
    dot: "bg-[#dc3545]",
  },
  REJECTED: {
    bg: "bg-[#ffebeb]",
    text: "text-[#b91c1c]",
    border: "border-[#fca5a5]",
    dot: "bg-[#dc3545]",
  },
  REFUND_REQUEST: {
    bg: "bg-[#fff7ed]",
    text: "text-[#c2410c]",
    border: "border-[#fdba74]",
    dot: "bg-[#f97316]",
  },
  REFUNDED: {
    bg: "bg-[#eff6ff]",
    text: "text-[#1d4ed8]",
    border: "border-[#93c5fd]",
    dot: "bg-[#298dff]",
  },
  REFUND_REJECTED: {
    bg: "bg-[#f5f3ff]",
    text: "text-[#6d28d9]",
    border: "border-[#c4b5fd]",
    dot: "bg-[#7429f8]",
  },
  AMENDMENT_REQUEST: {
    bg: "bg-[#ecfeff]",
    text: "text-[#0e7490]",
    border: "border-[#67e8f9]",
    dot: "bg-[#18ddef]",
  },
  AMENDED: {
    bg: "bg-[#f0fdfa]",
    text: "text-[#0f766e]",
    border: "border-[#5eead4]",
    dot: "bg-[#0f766e]",
  },
  PAID: {
    bg: "bg-[#ebfcf5]",
    text: "text-[#047857]",
    border: "border-[#6ee7b7]",
    dot: "bg-[#00d67f]",
  },
  PENDING: {
    bg: "bg-[#f1f5f9]",
    text: "text-[#475569]",
    border: "border-[#e2e8f0]",
    dot: "bg-[#94a3b8]",
  },
  FAILED: {
    bg: "bg-[#ffebeb]",
    text: "text-[#b91c1c]",
    border: "border-[#fca5a5]",
    dot: "bg-[#dc3545]",
  },
  ACTIVE: {
    bg: "bg-[#ebfcf5]",
    text: "text-[#047857]",
    border: "border-[#6ee7b7]",
    dot: "bg-[#00d67f]",
  },
  INACTIVE: {
    bg: "bg-[#f8fafc]",
    text: "text-[#64748b]",
    border: "border-[#e2e8f0]",
    dot: "bg-[#9e9e9e]",
  },
  DRAFT: {
    bg: "bg-[#f1f5f9]",
    text: "text-[#475569]",
    border: "border-[#e2e8f0]",
    dot: "bg-[#94a3b8]",
  },
  PENDING_APPROVAL: {
    bg: "bg-[#eff6ff]",
    text: "text-[#1d4ed8]",
    border: "border-[#93c5fd]",
    dot: "bg-[#298dff]",
  },
  COMPLETED: {
    bg: "bg-[#f0fdf4]",
    text: "text-[#166534]",
    border: "border-[#86efac]",
    dot: "bg-[#16a34a]",
  },
};

/**
 * Filled variants for badges that sit on a photo or another dark surface.
 *
 * The tinted style (light fill, coloured text, hairline border) is only
 * legible on white. Pasted on a product image it turned into a white pill
 * wrapped around a green-bordered pill — two badges pretending to be one.
 * On media the badge fills with the status colour instead, so the colour and
 * the label travel together.
 */
const STATUS_SOLID = {
  AWAITING_CONFIRMATION: "bg-slate-600",
  CONFIRMED: "bg-blue-600",
  CANCELLED: "bg-red-600",
  REJECTED: "bg-red-600",
  REFUND_REQUEST: "bg-orange-600",
  REFUNDED: "bg-blue-600",
  REFUND_REJECTED: "bg-violet-600",
  AMENDMENT_REQUEST: "bg-cyan-600",
  AMENDED: "bg-teal-600",
  PAID: "bg-emerald-600",
  PENDING: "bg-slate-500",
  FAILED: "bg-red-600",
  ACTIVE: "bg-emerald-600",
  INACTIVE: "bg-slate-500",
  DRAFT: "bg-slate-500",
  PENDING_APPROVAL: "bg-blue-600",
  COMPLETED: "bg-emerald-600",
};

export default function StatusBadge({ status, label, size = "sm", variant = "soft" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.INACTIVE;
  const sizeClasses = size === "sm"
    ? "text-xs px-2 py-0.5"
    : "text-sm px-2.5 py-1";
  const solid = variant === "solid";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        solid
          ? cn("text-white shadow-sm", STATUS_SOLID[status] || "bg-slate-500")
          : cn("border", style.bg, style.text, style.border),
        sizeClasses
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          solid ? "bg-white/90" : style.dot
        )}
      />
      <span className={cn(solid && "font-semibold")}>
        {label || status.replace(/_/g, " ")}
      </span>
    </span>
  );
}
