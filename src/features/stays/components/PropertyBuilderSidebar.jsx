import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Flag,
  Camera,
  Settings,
  CalendarDays,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { STAYS_SECTIONS, STAYS_BUILDER_STEPS } from "../config/staysSteps";

/**
 * The property builder's wizard sidebar — the Stays mirror of the product
 * builder's WizardSidebar: section headings with icons, numbered circles that
 * become emerald checks, an active left-border row, and steps beyond your
 * furthest progress dimmed. The header shows overall completion.
 */

const SECTION_ICONS = {
  "basic-information": Flag,
  photos: Camera,
  "property-setup": Settings,
  "pricing-calendar": CalendarDays,
  "review-submit": Eye,
};

export default function PropertyBuilderSidebar({ currentIndex, completedCount, onSelectStep }) {
  const navRef = useRef(null);
  const activeRef = useRef(null);
  const currentSectionId = STAYS_BUILDER_STEPS[currentIndex]?.sectionId;

  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = new Set();
    if (currentSectionId) initial.add(currentSectionId);
    return initial;
  });

  useEffect(() => {
    if (!currentSectionId) return;
    let cancelled = false;
    // Deferred so the state update runs outside the effect's sync body.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setExpandedSections((previous) => {
        if (previous.has(currentSectionId)) return previous;
        const next = new Set(previous);
        next.add(currentSectionId);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [currentSectionId]);

  useEffect(() => {
    if (!activeRef.current || !navRef.current) return;
    const nav = navRef.current;
    const element = activeRef.current;
    const navRect = nav.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (elementRect.top < navRect.top || elementRect.bottom > navRect.bottom) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const totalSteps = STAYS_BUILDER_STEPS.length;
  const progress = Math.round((Math.min(completedCount, totalSteps) / totalSteps) * 100);
  // Any step up to the furthest progress is reachable; the rest are dimmed.
  const maxAccessibleIndex = Math.max(completedCount, currentIndex);

  const toggleSection = (id) =>
    setExpandedSections((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="w-[300px] shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden h-full flex flex-col">
      <div className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-[18px]">
        <span className="mb-2.5 block text-sm font-bold">Property Builder</span>
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-500">
          {Math.min(completedCount, totalSteps)} of {totalSteps} complete
        </span>
      </div>

      <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-none px-5 py-2">
        {STAYS_SECTIONS.map((section) => {
          const SectionIcon = SECTION_ICONS[section.id];
          const steps = STAYS_BUILDER_STEPS.map((step, index) => ({ ...step, index })).filter(
            (step) => step.sectionId === section.id,
          );
          const isExpanded = expandedSections.has(section.id);

          return (
            <div key={section.id} className="border-b border-slate-200 last:border-b-0">
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-slate-700 ${
                  section.collapsible ? "text-slate-500" : "pointer-events-none text-slate-400"
                }`}
                onClick={() => section.collapsible && toggleSection(section.id)}
              >
                {SectionIcon && <SectionIcon size={14} className="shrink-0" />}
                <span className="flex-1 text-left">{section.label}</span>
                {section.collapsible && (
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                  />
                )}
              </button>

              {(!section.collapsible || isExpanded) && (
                <div>
                  {steps.map((step) => {
                    const isActive = currentIndex === step.index;
                    const isComplete = step.index < completedCount;
                    const isLocked = step.index > maxAccessibleIndex;

                    return (
                      <button
                        key={step.stepId}
                        ref={isActive ? activeRef : null}
                        type="button"
                        onClick={() => !isLocked && onSelectStep(step.index)}
                        className={`flex w-full items-center gap-2.5 border-0 border-l-2 border-transparent bg-transparent px-5 py-2 text-left text-sm text-slate-700 transition-all duration-150 ${
                          isLocked ? "cursor-default opacity-40" : "cursor-pointer hover:bg-slate-50/80"
                        } ${
                          isActive
                            ? "border-l-emerald-600 bg-emerald-50 font-semibold text-emerald-700"
                            : ""
                        } ${isComplete ? "text-emerald-800" : ""}`}
                      >
                        <span className="relative grid h-5 w-5 shrink-0 place-items-center">
                          {isComplete ? (
                            <CheckCircle2 size={18} className="text-emerald-600" />
                          ) : (
                            <span
                              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                                step.id >= 10 ? "text-[9px]" : ""
                              } ${isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}
                            >
                              {step.id}
                            </span>
                          )}
                        </span>
                        <span className="leading-tight">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
