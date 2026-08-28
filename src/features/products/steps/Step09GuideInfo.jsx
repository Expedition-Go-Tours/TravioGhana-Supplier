import { HelpCircle, Info } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'

const GUIDE_TYPE_OPTIONS = [
  {
    value: 'self-guided',
    label: 'Self-Guided',
    description: 'The activity does not include a guide or similar; travellers will navigate the activity or attraction independently.',
  },
  {
    value: 'tour-guide',
    label: 'Tour guide',
    description: 'Leads a group of customers through a tour and explains things about the destination or attraction.',
    badge: 'Customizable language',
  },
  {
    value: 'host',
    label: 'Host or greeter',
    description: "Provides an introduction, purchases a ticket, or waits in line with customers, but doesn't provide a full tour of the attraction.",
  },
  {
    value: 'instructor',
    label: 'Instructor',
    description: 'Shows customers how to use equipment or teaches them how to do something.',
  },
  {
    value: 'driver',
    label: 'Driver',
    description: "Drives the customer somewhere but doesn't explain anything along the way.",
  },
]

export default function Step09GuideInfo() {
  const guideType = useProductBuilderStore((s) => s.guideType)
  const guideMaterials = useProductBuilderStore((s) => s.guideMaterials)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(8)

  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-slate-900">Who will guide the customers?</h2>
          <HelpCircle className="w-5 h-5 text-slate-400" />
        </div>

        <div className="space-y-1">
          {GUIDE_TYPE_OPTIONS.map((opt) => {
            const isSelected = guideType === opt.value
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="guideType"
                  data-field="guideType"
                  checked={isSelected}
                  onChange={() => setField('guideType', opt.value)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                    {opt.badge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        <Info className="w-3 h-3" />
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
              </label>
            )
          })}
        </div>
        {errors.guideType && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.guideType[0]}</span>}
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-2" data-field="guideMaterials">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Guide materials</h3>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Select additional materials provided to customers as part of the guiding experience.
        </p>
        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={guideMaterials?.audioGuide ?? false}
                onChange={(e) =>
                  setField('guideMaterials', {
                    ...guideMaterials,
                    audioGuide: e.target.checked,
                  })
                }
                className="peer sr-only"
              />
              <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 transition-all duration-150 grid place-items-center">
                {guideMaterials?.audioGuide && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-slate-700">Audio guides and headphones</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={guideMaterials?.infoBooklet ?? false}
                onChange={(e) =>
                  setField('guideMaterials', {
                    ...guideMaterials,
                    infoBooklet: e.target.checked,
                  })
                }
                className="peer sr-only"
              />
              <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 transition-all duration-150 grid place-items-center">
                {guideMaterials?.infoBooklet && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-slate-700">Information booklets</span>
          </label>
        </div>
        {errors.guideMaterials && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.guideMaterials[0]}</span>}
      </div>
    </div>
  )
}
