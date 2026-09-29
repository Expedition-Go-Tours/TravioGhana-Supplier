import { useLayoutEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { detectPreview, PREVIEW_BANNER_TEXT } from "@/lib/previewEnvironment";

/**
 * A non-dismissible strip at the top of every preview page, including login.
 *
 * It is in normal flow (sticky, not fixed) so it pushes the app shell down on
 * its own — no change to AppShell or main. Header and Sidebar stay pinned to
 * the viewport, so they read the banner's measured height through the
 * --preview-banner-height custom property, which index.css defaults to 0px.
 * With no banner present every offset resolves to its pre-existing value and
 * the production layout is unchanged.
 *
 * The height is measured rather than hard-coded: the copy wraps to two or three
 * lines on a phone, and a fixed offset would then leave the header overlapping
 * the banner.
 */
export default function PreviewBanner() {
  const reason = detectPreview();
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!reason) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--preview-banner-height", `${el.offsetHeight}px`);
    };
    apply();

    // Without ResizeObserver (older jsdom) the first measurement stands, which
    // is still better than a hard-coded guess.
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (observer) observer.observe(el);

    return () => {
      if (observer) observer.disconnect();
      root.style.removeProperty("--preview-banner-height");
    };
  }, [reason]);

  if (!reason) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Preview environment"
      data-preview-reason={reason}
      className="sticky top-0 z-[60] flex min-h-10 items-center justify-center gap-2 border-b border-amber-600/40 bg-amber-400 px-3 py-1.5 text-center text-xs leading-snug font-bold tracking-wide text-amber-950 uppercase sm:px-4"
    >
      <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{PREVIEW_BANNER_TEXT}</span>
    </div>
  );
}
