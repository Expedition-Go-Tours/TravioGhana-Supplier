import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, ChevronLeft, Pencil, Trash2, Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SOCIAL_PLATFORMS,
  extractHandle,
  buildSocialUrl,
} from "./socialPlatforms";

const PANEL_WIDTH = 328;

/**
 * Social media links editor for the business profile.
 *
 * - Renders saved links as brand chips (edit + remove).
 * - "Add Social Media" opens an animated popover with two framer-motion screens:
 *     1. Pick a platform.
 *     2. Enter the handle with the platform URL prefix pre-filled, then Save.
 *
 * Controlled component: `value` maps storeKey -> full URL, `onChange` receives
 * the next map. All social links are persisted together via the parent's
 * "Save Business Profile" submit.
 */
export default function SocialMediaManager({ value = {}, onChange, onPersist, disabled }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("pick");
  const [selected, setSelected] = useState(null);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef(null);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const added = useMemo(
    () => SOCIAL_PLATFORMS.filter((p) => value[p.storeKey]),
    [value],
  );

  const computePos = () => {
    const el = anchorRef.current || triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelEl = panelRef.current;
    const panelH = panelEl ? panelEl.offsetHeight : 320;
    const margin = 12;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer opening below the button; flip above when there isn't room, then
    // clamp so the panel always stays fully inside the viewport.
    const below = rect.bottom + gap;
    const above = rect.top - gap - panelH;
    const placeBelow = below + panelH <= vh - margin;
    const top = placeBelow
      ? Math.max(margin, below)
      : Math.max(margin, Math.min(above, vh - panelH - margin));
    const left = Math.max(margin, Math.min(rect.left, vw - PANEL_WIDTH - margin));
    setPos({ top, left });
  };

  const close = () => {
    setOpen(false);
    setStep("pick");
    setSelected(null);
    setHandle("");
    anchorRef.current = null;
  };

  const openAdd = (platform, anchorEl) => {
    if (anchorEl) anchorRef.current = anchorEl;
    setSelected(platform);
    setHandle(extractHandle(platform, value[platform.storeKey] || ""));
    setStep("add");
    setOpen(true);
  };

  const commit = async () => {
    if (!selected || saving) return;
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) {
      toast.error(`Enter ${selected.hint || "your username"}`);
      return;
    }
    const next = { ...value, [selected.storeKey]: buildSocialUrl(selected, clean) };
    setSaving(true);
    try {
      if (onPersist) await onPersist(next);
      onChange(next);
      toast.success(`${selected.name} link added`);
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to save ${selected.name} link`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (platform) => {
    if (saving) return;
    const next = { ...value, [platform.storeKey]: "" };
    setSaving(true);
    try {
      if (onPersist) await onPersist(next);
      onChange(next);
      toast.success(`${platform.name} link removed`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to remove ${platform.name} link`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(computePos);
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      const menu = document.getElementById("social-links-menu");
      if (menu?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const onRepos = () => computePos();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onRepos, true);
    window.addEventListener("resize", onRepos);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onRepos, true);
      window.removeEventListener("resize", onRepos);
    };
  }, [open, step]);

  const fullUrlPreview = selected ? buildSocialUrl(selected, handle) : "";

  return (
    <>
      <div className="space-y-3">
        {added.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {added.map((platform) => {
              const Icon = platform.Icon;
              return (
                <span
                  key={platform.storeKey}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-2 pr-1.5"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ color: "#fff", backgroundColor: platform.color }}
                  >
                    <Icon width={12} height={12} />
                  </span>
                  <span className="text-xs font-medium text-slate-700 max-w-[140px] truncate">
                    {extractHandle(platform, value[platform.storeKey])}
                  </span>
                  <span className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => openAdd(platform, e.currentTarget)}
                      title={`Edit ${platform.name} link`}
                      aria-label={`Edit ${platform.name} link`}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(platform)}
                      title={`Remove ${platform.name} link`}
                      aria-label={`Remove ${platform.name} link`}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </span>
              );
            })}
          </div>
        )}

        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => { anchorRef.current = e.currentTarget; setStep("pick"); setOpen((v) => !v); }}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all disabled:opacity-50"
        >
          <Plus size={13} />
          Add Social Media
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="social-links-menu"
              ref={panelRef}
              id="social-links-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Add social media link"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
              className="fixed z-[80] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
            >
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                {step === "add" ? (
                  <button
                    type="button"
                    onClick={() => { setStep("pick"); setHandle(""); }}
                    title="Back to platforms"
                    aria-label="Back to platforms"
                    className="p-1 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Link2 size={13} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {step === "pick" ? "Add Social Media" : selected?.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {step === "pick" ? "Choose a platform" : "Add your profile link"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  title="Close"
                  aria-label="Close"
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Screens */}
              <div className="relative h-[248px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {step === "pick" ? (
                    <motion.div
                      key="pick"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute inset-0 grid grid-cols-2 content-start gap-1.5 overflow-y-auto p-3"
                    >
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const Icon = platform.Icon;
                        const isAdded = Boolean(value[platform.storeKey]);
                        return (
                          <button
                            key={platform.storeKey}
                            type="button"
                            onClick={() => openAdd(platform)}
                            disabled={isAdded}
                            className={cn(
                              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                              isAdded
                                ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                            )}
                          >
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ color: "#fff", backgroundColor: platform.color }}
                            >
                              <Icon width={13} height={13} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-700">{platform.name}</span>
                              <span className="block text-[10px] text-slate-400 truncate">
                                {isAdded ? "Added" : platform.prefix.replace(/^https?:\/\//, "")}
                              </span>
                            </span>
                            {isAdded && <Check size={13} className="text-emerald-500" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`add-${selected?.storeKey}`}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute inset-0 flex flex-col p-3"
                    >
                      {selected && (
                        <>
                          {/* Pre-filled URL input */}
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                            Profile URL
                          </label>
                          <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                            <span
                              className="flex items-center gap-1.5 bg-slate-50 border-r border-slate-200 px-2.5 text-[11px] text-slate-400 whitespace-nowrap"
                              style={{ color: selected.color }}
                            >
                              <selected.Icon width={12} height={12} />
                              <span className="text-slate-500">{selected.prefix.replace(/^https?:\/\//, "")}</span>
                            </span>
                            <input
                              autoFocus
                              value={handle}
                              onChange={(e) => setHandle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
                              placeholder={selected.hint || "your username"}
                              className="min-w-0 flex-1 px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none"
                              disabled={saving}
                            />
                          </div>

                          <p className="mt-2 text-[11px] text-slate-400">
                            {selected.hint || "your username"}
                          </p>

                          {/* Live preview */}
                          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Link preview</p>
                            <p className="text-xs font-medium text-slate-600 font-mono truncate">
                              {fullUrlPreview || "—"}
                            </p>
                          </div>

                          <div className="mt-auto pt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={close}
                              disabled={saving}
                              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={commit}
                              disabled={saving}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              {saving ? "Saving..." : "Save Link"}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
