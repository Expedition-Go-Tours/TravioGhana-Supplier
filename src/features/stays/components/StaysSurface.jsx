import { cn } from "@/lib/utils";

/**
 * Root wrapper for every Stays page.
 *
 * Kept as a component (and no longer imposes a typeface) so pages have one
 * place to hang workspace-wide classes if they are ever needed again; today
 * it renders the page's content inside a fragment-like div.
 */
export default function StaysSurface({ children, className }) {
  return <div className={cn(className)}>{children}</div>;
}
