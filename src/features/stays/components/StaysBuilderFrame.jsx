import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SHELL_GUTTER } from "@/components/layout/shell";
import PropertyBuilderSidebar from "./PropertyBuilderSidebar";
import { STAYS_BUILDER_STEPS, STAYS_BUILDER_STEP_COUNT } from "../config/staysSteps";

/**
 * The builder chrome for the category chains that run before a draft exists —
 * the four-card chooser, the booking-type question, the sub-type lists and the
 * how-many screens. It mirrors the property builder's takeover (top bar,
 * wizard sidebar, mobile step drawer) so the questions read as step 1 of the
 * builder ("Category & property type"), while the sidebar itself stays inert
 * until there is a draft to navigate.
 *
 * The four-card chooser renders with this frame too: it is step one of the
 * property builder.
 */
export default function StaysBuilderFrame({
  currentIndex,
  completedCount,
  children,
}) {
  const navigate = useNavigate();
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
  const stepMeta = STAYS_BUILDER_STEPS[currentIndex] || STAYS_BUILDER_STEPS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 overflow-hidden bg-white"
    >
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white py-2.5 sm:py-3 ${SHELL_GUTTER}`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/stays/properties")}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
              type="button"
              aria-label="Close and return to properties"
            >
              <X size={20} />
            </button>
            <button
              onClick={() => setMobileStepsOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              type="button"
              aria-label="Open property steps"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="hidden h-6 w-0.5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-300 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">
                Create New Property
              </h1>
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                Step {currentIndex + 1} of {STAYS_BUILDER_STEP_COUNT}:{" "}
                {stepMeta.label}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile step drawer */}
        <AnimatePresence>
          {mobileStepsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/25 lg:hidden"
                onClick={() => setMobileStepsOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col bg-slate-50 lg:hidden"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">Property steps</span>
                  <button
                    onClick={() => setMobileStepsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                    type="button"
                    aria-label="Close property steps"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden bg-white">
                  <PropertyBuilderSidebar
                    currentIndex={currentIndex}
                    completedCount={completedCount}
                    onSelectStep={() => setMobileStepsOpen(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sidebar + content */}
        <div className={`flex min-h-0 flex-1 gap-0 ${SHELL_GUTTER} py-3 sm:py-4 lg:py-5`}>
          <div className="hidden shrink-0 lg:flex">
            <PropertyBuilderSidebar
              currentIndex={currentIndex}
              completedCount={completedCount}
              onSelectStep={() => {}}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:ml-6">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
