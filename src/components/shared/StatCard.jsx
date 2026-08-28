import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  blue: "bg-blue-50 text-blue-800 border-blue-200/60",
  amber: "bg-amber-50 text-amber-800 border-amber-200/60",
  red: "bg-red-50 text-red-800 border-red-200/60",
  cyan: "bg-cyan-50 text-cyan-800 border-cyan-200/60",
  violet: "bg-violet-50 text-violet-800 border-violet-200/60",
};

const ICON_BG = {
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
  cyan: "bg-cyan-100 text-cyan-600",
  violet: "bg-violet-100 text-violet-600",
};

export default function StatCard({
  label,
  value,
  icon,
  accent = "emerald",
  trend,
  subtitle,
  loading,
  onClick,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={cn(
        "rounded-xl border p-5 transition-all duration-300",
        ACCENT_CLASSES[accent] || ACCENT_CLASSES.emerald,
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-slate-800 tabular-nums leading-tight">{value}</p>
          )}
          {(trend || subtitle) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {trend && (
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-red-600")}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend.isPositive ? "+" : ""}{trend.value.toFixed(1)}%
                </span>
              )}
              {subtitle && <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>}
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl shrink-0", ICON_BG[accent] || ICON_BG.emerald)}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
