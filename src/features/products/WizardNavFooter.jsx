import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { validateStep } from './stepValidation'
import { useProductBuilderStore } from './productBuilderStore'
import { builderSignature } from './useAutoSave'
import { scrollToField, getFieldLabel } from './fieldLabels'
import { GYG_STEPS } from './gygSteps'

export default function WizardNavFooter({ currentStep, totalSteps, onBack, onNext, onSave, onSubmitForReview, saving, submitting, isEditing }) {
  const formData = useProductBuilderStore()
  const setStepErrors = useProductBuilderStore((s) => s.setStepErrors)
  const clearStepErrors = useProductBuilderStore((s) => s.clearStepErrors)
  const completeStep = useProductBuilderStore((s) => s.completeStep)
  const goToStep = useProductBuilderStore((s) => s.goToStep)
  const stepErrors = useProductBuilderStore((s) => s.stepErrors)
  const isSaving = useProductBuilderStore((s) => s.isSaving)
  const lastSaved = useProductBuilderStore((s) => s.lastSaved)
  const autosaveError = useProductBuilderStore((s) => s.autosaveError)
  const [savedText, setSavedText] = useState('')

  useEffect(() => {
    if (lastSaved && !isSaving) {
      const hide = setTimeout(() => setSavedText(''), 2500)
      const show = setTimeout(() => setSavedText('Draft saved'), 0)
      return () => { clearTimeout(hide); clearTimeout(show) }
    }
  }, [lastSaved, isSaving])

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  const isPendingReview = formData.draftStatus === 'PENDING_APPROVAL'

  // Gate "Submit for Review" when the builder content is identical to the last
  // submitted snapshot — no signed-off changes exist to queue a review for.
  const submissionMeta = formData.submissionMeta?.[formData.savedProductId] || null
  const currentSignature = builderSignature(formData)
  const noChangesToSubmit = Boolean(
    onSubmitForReview
      && !isPendingReview
      && submissionMeta?.signature
      && currentSignature
      && currentSignature === submissionMeta.signature
  )

  const displayErrors = stepErrors[currentStep] || {}
  const hasDisplayErrors = Object.keys(displayErrors).length > 0
  const errorEntries = Object.entries(displayErrors)

  async function handleSaveAndContinue(e) {
    e.preventDefault()
    if (isPendingReview) return
    const errors = validateStep(currentStep, formData)
    if (Object.keys(errors).length > 0) {
      setStepErrors(currentStep, errors)
      return
    }
    clearStepErrors(currentStep)
    const gygStep = GYG_STEPS[currentStep - 1]
    if (gygStep?.stepId) completeStep(gygStep.stepId)
    onNext()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isPendingReview) return
    const errors = validateStep(currentStep, formData)
    if (Object.keys(errors).length > 0) {
      setStepErrors(currentStep, errors)
      return
    }
    clearStepErrors(currentStep)
    for (let i = 1; i < totalSteps; i++) {
      if (i === currentStep) continue
      const stepErr = validateStep(i, formData)
      if (Object.keys(stepErr).length > 0) {
        setStepErrors(i, stepErr)
        goToStep(i - 1)
        return
      }
    }
    try {
      await onSave?.()
      completeStep(GYG_STEPS[currentStep - 1]?.stepId)
    } catch {
      // Error already handled by the global interceptor + handleSave catch
    }
  }

  async function handleSubmitForReview(e) {
    e.preventDefault()
    if (isPendingReview || noChangesToSubmit || submitting) return
    const errors = validateStep(currentStep, formData)
    if (Object.keys(errors).length > 0) {
      setStepErrors(currentStep, errors)
      return
    }
    clearStepErrors(currentStep)
    for (let i = 1; i < totalSteps; i++) {
      if (i === currentStep) continue
      const stepErr = validateStep(i, formData)
      if (Object.keys(stepErr).length > 0) {
        setStepErrors(i, stepErr)
        goToStep(i - 1)
        return
      }
    }
    try {
      await onSubmitForReview?.()
      completeStep(GYG_STEPS[currentStep - 1]?.stepId)
    } catch {
      // Error already handled upstream
    }
  }

  const handleFinalClick = onSubmitForReview ? handleSubmitForReview : handleSubmit

  return (
    <div className="flex items-start justify-between px-8 py-4 border-t border-slate-200 bg-slate-50/80">
      <div className="flex items-center gap-3 pt-1">
        {!isFirstStep && (
          <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors" onClick={onBack} type="button">
            Back
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        {saving && (
          <span className="flex items-center gap-1.5 text-[13px] text-emerald-600 font-semibold">
            <Loader2 size={14} className="animate-spin" />
            Saving...
          </span>
        )}
        {!saving && hasDisplayErrors && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg max-w-[500px]">
            <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <p className="text-sm text-slate-700">
              Check the following sections before continuing:{' '}
              {errorEntries.map(([fieldKey], i) => (
                <span key={fieldKey}>
                  <button
                    type="button"
                    onClick={() => scrollToField(fieldKey)}
                    className="text-sm text-slate-700 underline decoration-slate-400 hover:decoration-slate-600 underline-offset-2 transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium"
                  >
                    {getFieldLabel(fieldKey)}
                  </button>
                  {i < errorEntries.length - 1 && <span className="text-slate-500">, </span>}
                </span>
              ))}
            </p>
          </div>
        )}
        {!saving && !hasDisplayErrors && autosaveError && (
          <span className="text-xs text-red-600 font-semibold max-w-[420px] text-center">{autosaveError}</span>
        )}
        {isPendingReview && (
          <span className="text-xs text-amber-700 font-semibold max-w-[420px] text-center">
            This product is locked while pending review — withdraw it above to make changes.
          </span>
        )}
        {!isPendingReview && noChangesToSubmit && (
          <span className="text-xs text-slate-500 font-semibold max-w-[420px] text-center">
            No changes to submit — the current content was already submitted for review.
          </span>
        )}
        {!saving && !hasDisplayErrors && !autosaveError && savedText && (
          <span className="text-xs text-emerald-600 font-semibold animate-[fadeIn_0.2s_ease]">{savedText}</span>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        {!isLastStep ? (
          <button
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveAndContinue}
            disabled={saving || submitting || isPendingReview}
            type="button"
          >
            {isPendingReview ? 'Locked' : saving || submitting ? 'Saving...' : 'Save & Continue'}
          </button>
        ) : (
          <button
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSubmitForReview ? handleFinalClick : handleSubmit}
            disabled={saving || submitting || isPendingReview || (onSubmitForReview ? noChangesToSubmit : false)}
            type="button"
          >
            {submitting
              ? 'Submitting...'
              : saving
                ? (onSubmitForReview ? 'Submitting...' : 'Saving...')
                : isPendingReview
                  ? 'Locked'
                  : onSubmitForReview
                    ? 'Submit for Review'
                    : isEditing
                      ? 'Update'
                      : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
