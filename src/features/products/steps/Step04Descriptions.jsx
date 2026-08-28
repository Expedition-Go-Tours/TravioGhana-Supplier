import { useState } from 'react'
import { HelpCircle, Plus, X, Info } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import {
  SHORT_DESCRIPTION_MAX_CHARS,
  FULL_DESCRIPTION_MAX_CHARS,
  HIGHLIGHT_MAX_CHARS,
  limitMessage,
} from '@/features/products/productFormSchema'

export default function Step04Descriptions() {
  const shortDescription = useProductBuilderStore((s) => s.shortDescription)
  const fullDescription = useProductBuilderStore((s) => s.fullDescription)
  const highlights = useProductBuilderStore((s) => s.highlights)
  const setField = useProductBuilderStore((s) => s.setField)
  const addHighlight = useProductBuilderStore((s) => s.addHighlight)
  const updateHighlight = useProductBuilderStore((s) => s.updateHighlight)
  const errors = useStepErrors(4)
  const [tipDismissed, setTipDismissed] = useState(false)

  const shortAtLimit = shortDescription.length >= SHORT_DESCRIPTION_MAX_CHARS
  const fullAtLimit = fullDescription.length >= FULL_DESCRIPTION_MAX_CHARS

  function addHighlightItem() {
    if (highlights.length < 5) {
      addHighlight('')
    }
  }

  return (
    <div className="max-w-[720px]">
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Short description *
          <span className="text-xs font-normal text-slate-400 ml-2">
            Give the customer a taste of what they&rsquo;ll do in 2 or 3 sentences. This will be the first thing customers read after the title, and will inspire them to continue.
          </span>
        </label>
        <textarea
          data-field="shortDescription"
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring resize-vertical ${
            shortAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          rows={3}
          value={shortDescription}
          onChange={(e) => setField('shortDescription', e.target.value)}
          maxLength={SHORT_DESCRIPTION_MAX_CHARS}
          aria-invalid={!!errors.shortDescription || shortAtLimit}
          placeholder="Describe the experience in 2-3 sentences. Shown on landing pages."
        />
        <div className="flex items-center justify-between mt-1">
          {errors.shortDescription ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{errors.shortDescription[0]}</span>
          ) : shortAtLimit ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{limitMessage(SHORT_DESCRIPTION_MAX_CHARS)}</span>
          ) : (
            <span />
          )}
          <span className={`text-[13px] tabular-nums shrink-0 ${shortAtLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{shortDescription.length} / {SHORT_DESCRIPTION_MAX_CHARS}</span>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">
          Full description *
          <span className="text-xs font-normal text-slate-400 ml-2">
            Provide all the details about what the customer will see and experience during the activity, in the correct order. Bring the activity to life and write at least 500 characters.
          </span>
        </label>
        <textarea
          data-field="fullDescription"
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring resize-vertical ${
            fullAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          rows={8}
          value={fullDescription}
          onChange={(e) => setField('fullDescription', e.target.value)}
          maxLength={FULL_DESCRIPTION_MAX_CHARS}
          aria-invalid={!!errors.fullDescription || fullAtLimit}
          placeholder="Detailed description of the activity. Use descriptive language and bring the experience to life."
        />
        <div className="flex items-center justify-between mt-1">
          {errors.fullDescription ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{errors.fullDescription[0]}</span>
          ) : fullAtLimit ? (
            <span aria-live="polite" className="text-[13px] text-red-600 font-medium flex items-center gap-1">{limitMessage(FULL_DESCRIPTION_MAX_CHARS)}</span>
          ) : (
            <span />
          )}
          <span className={`text-[13px] tabular-nums shrink-0 ${fullAtLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{fullDescription.length} / {FULL_DESCRIPTION_MAX_CHARS}</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base font-semibold text-slate-900">Highlights</h3>
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Write 3-5 sentences explaining what makes your activity special and stand out from the competition. Customers will use these to compare between different activities.
        </p>

        <div className="space-y-3">
          {highlights.map((item, i) => {
            const atLimit = item.length >= HIGHLIGHT_MAX_CHARS
            return (
              <div key={i}>
                <input
                  data-field="highlights"
                  className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
                    atLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
                  }`}
                  type="text"
                  value={item}
                  maxLength={HIGHLIGHT_MAX_CHARS}
                  onChange={(e) => updateHighlight(i, e.target.value)}
                  aria-invalid={atLimit}
                  placeholder="Describe a highlight of your activity..."
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs tabular-nums ${atLimit ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                    {item.length} / {HIGHLIGHT_MAX_CHARS}
                  </span>
                </div>
                {atLimit && (
                  <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    {limitMessage(HIGHLIGHT_MAX_CHARS)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {highlights.length < 5 && (
          <button
            type="button"
            onClick={addHighlightItem}
            className="flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another highlight
          </button>
        )}

        {errors.highlights && <span className="text-[13px] text-red-600 font-medium mt-2 flex items-center gap-1">{errors.highlights[0]}</span>}

        {!tipDismissed && (
          <div className="flex items-start gap-2.5 mt-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600 flex-1">
              Tip: Summarize the most memorable/emotional moments of the activity, and avoid logistical information.
            </p>
            <button
              type="button"
              onClick={() => setTipDismissed(true)}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
