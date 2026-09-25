import { cn } from "@/lib/utils";
import { SHELL_GUTTER, SHELL_MEASURE, SHELL_PADDING_Y, SHELL_SURFACE } from "./shell";

/**
 * The dashboard's one and only content container.
 *
 * AppShell wraps <Outlet /> in this, so every page starts at the same left
 * edge as the header logo — see shell.js for the rules pages must follow.
 *
 * `bleed` is for the three routes that own their full-viewport layout
 * (chat, product builder, product detail). They skip the container but still
 * import SHELL_GUTTER for their own chrome, so their content lines up too.
 */
export default function PageContainer({ bleed = false, className, children }) {
  if (bleed) {
    return <div className={cn(SHELL_SURFACE, className)}>{children}</div>;
  }

  return (
    <div className={cn(SHELL_SURFACE, SHELL_MEASURE, SHELL_GUTTER, SHELL_PADDING_Y, className)}>
      {children}
    </div>
  );
}
