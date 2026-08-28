import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { TITLE_MAX_CHARS, REFERENCE_CODE_MAX_CHARS, limitMessage } from '@/features/products/productFormSchema'

export default function Step03Title() {
  const title = useProductBuilderStore((s) => s.title)
  const referenceCode = useProductBuilderStore((s) => s.referenceCode)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(2)

  const titleAtLimit = title.length >= TITLE_MAX_CHARS
  const refCodeAtLimit = referenceCode.length >= REFERENCE_CODE_MAX_CHARS

  return (
    <div className="max-w-[720px]">
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Product title *</label>
        <input
          data-field="title"
          className={`w-full min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
            titleAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          type="text"
          value={title}
          onChange={(e) => setField('title', e.target.value)}
          maxLength={TITLE_MAX_CHARS}
          aria-invalid={!!errors.title || titleAtLimit}
          placeholder="e.g. Paris: Eiffel Tower Priority Access Tour"
        />
        {errors.title ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.title[0]}</span>
        ) : titleAtLimit ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{limitMessage(TITLE_MAX_CHARS)}</span>
        ) : null}
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Describe the experience. Keep it clear and specific, avoid prices and promotional wording.
          </p>
          <span className={`text-[13px] tabular-nums shrink-0 ${titleAtLimit ? 'text-red-600 font-medium' : title.length > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {title.length} / {TITLE_MAX_CHARS}
          </span>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Product reference code</label>
        <input
          data-field="referenceCode"
          className={`w-full min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
            refCodeAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          type="text"
          value={referenceCode}
          onChange={(e) => setField('referenceCode', e.target.value)}
          maxLength={REFERENCE_CODE_MAX_CHARS}
          aria-invalid={!!errors.referenceCode || refCodeAtLimit}
          placeholder="Internal code (optional)"
        />
        {errors.referenceCode ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.referenceCode[0]}</span>
        ) : refCodeAtLimit ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{limitMessage(REFERENCE_CODE_MAX_CHARS)}</span>
        ) : null}
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <p className="text-[13px] text-slate-500 leading-relaxed">
            An internal code to help you identify this product. Not shown to customers.
          </p>
          <span className={`text-[13px] tabular-nums shrink-0 ${refCodeAtLimit ? 'text-red-600 font-medium' : referenceCode.length > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {referenceCode.length} / {REFERENCE_CODE_MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  )
}
