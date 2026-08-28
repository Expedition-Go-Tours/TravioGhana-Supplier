import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Flag, FileText, Image, Settings, CheckCircle2 } from 'lucide-react'
import { GYG_SECTIONS, GYG_STEPS } from './gygSteps'
import { useProductBuilderStore } from './productBuilderStore'
import { isStepComplete } from './stepValidation'

const SECTION_ICONS = {
  'getting-started': Flag,
  'product-content': FileText,
  media: Image,
  'option-setup': Settings,
}

export default function WizardSidebar({ currentStep, onSelectStep }) {
  const formData = useProductBuilderStore((s) => s.formData)
  const stepErrors = useProductBuilderStore((s) => s.stepErrors)
  const completedStepIds = useProductBuilderStore((s) => s.completedStepIds)
  const navRef = useRef(null)
  const activeRef = useRef(null)

  const currentSectionId = GYG_STEPS.find((s) => s.id === currentStep)?.sectionId

  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = new Set()
    if (currentSectionId) initial.add(currentSectionId)
    return initial
  })

  useEffect(() => {
    if (!currentSectionId) return
    let cancelled = false
    // Deferred so the state update runs outside the effect's sync body
    Promise.resolve().then(() => {
      if (cancelled || !currentSectionId) return
      setExpandedSections((prev) => {
        if (prev.has(currentSectionId)) return prev
        const next = new Set(prev)
        next.add(currentSectionId)
        return next
      })
    })
    return () => { cancelled = true }
  }, [currentSectionId])

  useEffect(() => {
    if (activeRef.current && navRef.current) {
      const nav = navRef.current
      const el = activeRef.current
      const navRect = nav.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      if (elRect.top < navRect.top || elRect.bottom > navRect.bottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentStep])

  const totalSteps = GYG_STEPS.length
  const completedCount = formData
    ? GYG_STEPS.filter((s) => isCompleted(s.id)).length
    : completedStepIds.length
  const progress = Math.round((completedCount / totalSteps) * 100)

  const maxAccessibleStep = useMemo(() => {
    let max = currentStep
    for (const step of GYG_STEPS) {
      if (step.id <= currentStep) continue
      const prev = GYG_STEPS[step.id - 2]
      if (prev && completedStepIds.includes(prev.stepId)) {
        max = step.id
      } else break
    }
    return max
  }, [completedStepIds, currentStep])

  function toggleSection(id) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isCompleted(stepId) {
    const step = GYG_STEPS.find((s) => s.id === stepId)
    if (!step) return false
    if (completedStepIds.includes(step.stepId)) return true
    if (!formData) return false
    return isStepComplete(step.id, formData)
  }

  function getStepsForSection(section) {
    return GYG_STEPS.filter((s) => s.sectionId === section.id)
  }

  return (
    <aside className="wizard-sidebar w-[300px] shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="wizard-sidebar-header shrink-0 pt-[18px] px-5 pb-4 border-b border-slate-200">
        <span className="block text-sm font-bold mb-2.5">Product Builder</span>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-500">{completedCount} of {totalSteps} complete</span>
      </div>

      <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-none px-5 py-2">
        {GYG_SECTIONS.map((section) => {
          const SecIcon = SECTION_ICONS[section.id]
          const steps = getStepsForSection(section)
          const isExpanded = expandedSections.has(section.id)

          return (
            <div key={section.id} className="border-b border-slate-200 last:border-b-0">
              <button
                className={`flex items-center gap-2 w-full px-5 py-3 bg-transparent border-0 cursor-pointer text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-slate-700 ${section.collapsible ? 'text-slate-500' : 'text-slate-400 pointer-events-none'}`}
                onClick={() => section.collapsible && toggleSection(section.id)}
                type="button"
              >
                {SecIcon && <SecIcon size={14} className="shrink-0" />}
                <span className="flex-1 text-left">{section.label}</span>
                {section.collapsible && (
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                  />
                )}
              </button>

              {(!section.collapsible || isExpanded) && (
                <div>
                    {steps.map((step) => {
                    const isActive = currentStep === step.id
                    const complete = isCompleted(step.id)
                    const hasError = stepErrors[step.id] && Object.keys(stepErrors[step.id]).length > 0
                    const isLocked = step.id > maxAccessibleStep

                    return (
                      <div key={step.id}>
                        <button
                          ref={isActive ? activeRef : null}
                          className={`flex items-center gap-2.5 w-full px-5 py-2 bg-transparent border-0 border-l-2 border-transparent text-left text-sm text-slate-700 transition-all duration-150 ${
                            isLocked ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-slate-50/80'
                          } ${
                            isActive ? 'border-l-emerald-600 bg-emerald-50 font-semibold text-emerald-700' : ''
                          } ${complete ? 'text-emerald-800' : ''} ${hasError && !isActive ? 'border-l-red-400 bg-red-50/40' : ''}`}
                          onClick={() => !isLocked && onSelectStep(step.id)}
                          type="button"
                        >
                          <span className="grid place-items-center w-5 h-5 shrink-0 relative">
                            {complete ? (
                              <CheckCircle2 size={18} className="text-emerald-600" />
                            ) : (
                              <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold ${step.id >= 10 ? 'text-[9px]' : ''} ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {step.id}
                              </span>
                            )}
                            {hasError && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                            )}
                          </span>
                          <span className="leading-tight">{step.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
