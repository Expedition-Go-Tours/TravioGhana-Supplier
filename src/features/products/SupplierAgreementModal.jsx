import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldCheck, Loader2, Check } from 'lucide-react'

const AGREEMENT_TERMS = [
  'I confirm that all information provided for this product is accurate and complete.',
  'I agree to take legal responsibility for fulfilling all bookings made through TravioGhana for this product.',
  'I agree to protect the privacy and personal information of all clients who use this platform and to handle client information securely and responsibly.',
  'I confirm that all images, resources, and other materials submitted with this product belong to me or that I have obtained the necessary rights and permissions to use and reproduce them.',
  'I understand that TravioGhana will not be held liable for any copyright infringement or other intellectual property violations arising from materials submitted by me.',
  'I understand that the information I collected will be used for booking coordination, service delivery, and other purposes directly related to operating the platform.',
  'I also agree that my tours, activities, and experiences may be shared, promoted, distributed, and sold through the Expedition-Go Tours network, its affiliated platforms, distribution channels, and authorised third-party partners for the purpose of increasing visibility and generating bookings.',
  'I acknowledge that any breach of the above terms may result in the suspension or termination of my supplier account, the removal of my listed products, and a claim for any losses, damages, or costs incurred by TravioGhana, including reasonable legal and administrative costs. TravioGhana reserves the right to pursue legal action where applicable.',
]

export default function SupplierAgreementModal({
  isOpen,
  productName,
  isUpdate = false,
  onConfirm,
  onClose,
  isLoading = false,
}) {
  const [agreed, setAgreed] = useState(false)

  const handleClose = () => {
    setAgreed(false)
    onClose?.()
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        setAgreed(false)
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, isLoading, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isLoading && handleClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Supplier Agreement"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck size={20} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Supplier Agreement</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Please review and accept the following before submitting
                  {isUpdate ? ' your update' : ''}
                  {productName ? <> {isUpdate ? 'to' : ''} <strong className="text-slate-700">&ldquo;{productName}&rdquo;</strong></> : isUpdate ? '' : ' your product'}.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              <p className="text-sm text-slate-600 mb-3">
                The supplier must tick the checkbox to confirm the following:
              </p>
              <ol className="space-y-3">
                {AGREEMENT_TERMS.map((term, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center text-[11px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span>{term}</span>
                  </li>
                ))}
              </ol>

              <label className="mt-5 flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:border-slate-300 transition-colors">
                <span className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span className="grid place-items-center w-5 h-5 rounded-md border-2 border-slate-300 bg-white transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600">
                    {agreed && <Check size={13} className="text-white" strokeWidth={3} />}
                  </span>
                </span>
                <span className="text-sm font-medium text-slate-700">
                  I have read and agree to all of the above terms.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!agreed || isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? 'Submitting...' : isUpdate ? 'Submit Update' : 'Submit Product'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
