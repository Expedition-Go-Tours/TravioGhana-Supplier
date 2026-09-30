import { cn } from "@/lib/utils";

/**
 * The portal's button conventions, in the variant/size API the Stays pages
 * already use. Values match the rest of the dashboard (emerald primary,
 * white-bordered secondary, red danger) so the two workspaces read the same.
 */
const VARIANTS = {
  default:
    "border border-emerald-200/60 bg-white text-emerald-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50",
  primary:
    "border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800",
  danger:
    "border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50",
};

const SIZES = {
  default: "px-4 py-2.5 text-sm",
  small: "px-3 py-1.5 text-xs",
};

export default function StaysButton({
  variant = "default",
  size = "default",
  className,
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
