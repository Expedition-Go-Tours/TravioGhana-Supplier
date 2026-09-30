import { cn } from "@/lib/utils";

/**
 * A hairline-separated line inside a card — action lists, top-property
 * rankings, review blocks and settings lines. Matches the portal's divider
 * treatment (`border-slate-100`).
 */
export default function StaysRow({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-slate-100 py-3 first:border-t-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
