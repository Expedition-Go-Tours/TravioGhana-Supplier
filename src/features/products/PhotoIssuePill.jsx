import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Trash2, X } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { describePhotoIssue } from "@/features/products/photoIssueCopy";
import { cn } from "@/lib/utils";

/**
 * A small badge on a specific photo that failed the catalogue audit.
 *
 * The audit used to be summarised above the product list, where it listed
 * "154 photos on 32 listings" and was impossible to act on. This puts the
 * verdict on the tile that has the problem; clicking it explains that one
 * image — its real pixels and what the storefront does to it.
 *
 * Rendered inside a tile with `overflow-hidden`, so the explanation is a
 * focused dialog rather than a clipped popover.
 */
export default function PhotoIssuePill({
  issue,
  imageSrc,
  className,
  replaceHref,
  onRemove,
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const copy = describePhotoIssue(issue);
  const urgent = copy.tone === "urgent";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm transition-colors",
          urgent ? "bg-amber-500/95 hover:bg-amber-600" : "bg-slate-900/60 hover:bg-slate-900/80",
          className,
        )}
        title={copy.title}
      >
        <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />
        {urgent ? "Needs attention" : "Sharper?"}
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-issue-title"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      urgent ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="photo-issue-title" className="text-sm font-semibold text-slate-900">
                      {copy.title}
                    </h2>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Storefront photo check
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {imageSrc && (
                <div className="mt-4 aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <OptimizedImage
                    src={imageSrc}
                    width={720}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="px-5 py-4">
                {copy.size && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-600">
                    {copy.size}
                    <span className="font-normal text-slate-400">actual size</span>
                  </span>
                )}
                <p className="mt-2.5 text-[13px] leading-5 text-slate-600">{copy.body}</p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onRemove();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove photo
                  </button>
                )}
                {replaceHref && (
                  <a
                    href={replaceHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    Replace in Photos
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {!onRemove && !replaceHref && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Got it
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
