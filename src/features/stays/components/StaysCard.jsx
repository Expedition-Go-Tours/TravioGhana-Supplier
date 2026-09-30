import { cn } from "@/lib/utils";

/**
 * The dashboard's standard content card (same as the Experiences pages:
 * white surface, hairline border, soft shadow, 20px padding). `className`
 * still allows the per-page affordances pages express with utilities.
 */
export default function StaysCard({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-900/5",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
