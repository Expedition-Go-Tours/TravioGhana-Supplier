import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLivePlatforms } from "@/lib/platforms";

/**
 * "Preview" control for a product.
 * - 0 live platforms → disabled affordance ("Preview available once published").
 * - 1 live platform  → direct external link to that platform's tour page.
 * - 2 live platforms → animated popover to pick which platform to preview.
 *
 * Pass `label` (e.g. "Preview") to render a labeled pill button — used in the
 * product detail header next to Edit / Create special offer. Without a label
 * it renders as the compact icon control used on product cards.
 *
 * Rendered through a portal so the popover is never clipped by an
 * `overflow-hidden` ancestor.
 */
export default function PreviewMenu({ product, className, label }) {
  const live = useMemo(() => getLivePlatforms(product), [product]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const computePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!open) return;
    computePos();
    const onDown = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      const menu = document.getElementById("preview-menu");
      if (menu && menu.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onReposition = () => computePos();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  // Compact icon control (cards) vs labeled pill button (detail header).
  const triggerBase = label
    ? "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-medium transition-all"
    : "p-1.5 rounded-lg transition-colors";

  const content = (
    <>
      <ExternalLink size={label ? 13 : 14} />
      {label && <span>{label}</span>}
    </>
  );

  if (live.length === 0) {
    return (
      <span
        title="Preview available once published"
        className={cn(
          triggerBase,
          label
            ? "border border-slate-200 bg-white text-slate-300 cursor-not-allowed"
            : "text-slate-300 cursor-not-allowed",
          className,
        )}
      >
        {content}
      </span>
    );
  }

  if (live.length === 1) {
    const { platform, url } = live[0];
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Preview on ${platform.name}`}
        aria-label={`Preview on ${platform.name}`}
        className={cn(
          triggerBase,
          label
            ? "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors",
          className,
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        title="Preview live"
        aria-label="Preview live"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          triggerBase,
          label
            ? cn(
                "border bg-white transition-all",
                open
                  ? "border-emerald-400 text-emerald-700 shadow-sm"
                  : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700",
              )
            : cn(
                "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors",
                open && "text-emerald-600 bg-emerald-50",
              ),
          className,
        )}
      >
        {content}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="preview-menu"
              id="preview-menu"
              role="menu"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ top: pos.top, right: pos.right }}
              className="fixed z-[80] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/5"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Preview live
              </p>
              {live.map(({ platform, url }) => {
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="group/item flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        platform.accent === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600",
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-700 group-hover/item:text-emerald-700">
                        {platform.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 truncate">{platform.domain}</span>
                    </span>
                    <ExternalLink size={12} className="ml-auto text-slate-300 group-hover/item:text-emerald-500" />
                  </a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
