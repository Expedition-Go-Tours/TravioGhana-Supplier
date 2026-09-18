import { motion } from 'framer-motion'
import { PartyPopper, Mail, Clock, ArrowRight } from 'lucide-react'

export default function SubmitSuccessOverlay({ productName, onBackToProducts }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-lg w-full text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
          <PartyPopper size={30} className="text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Congratulations! 🎉</h1>
        <p className="text-slate-600 mt-3 leading-relaxed">
          Your product{productName ? <>, <strong className="text-slate-800">&ldquo;{productName}&rdquo;</strong>,</> : ' '}
          has been submitted successfully.
        </p>

        <div className="mt-6 text-left space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="flex gap-3">
            <Clock size={18} className="shrink-0 text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Our team will now review your product before it is published on the platform.
              Due to the volume of submissions we receive, product reviews may take
              <strong className="text-slate-800"> 2–3 working days</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <Mail size={18} className="shrink-0 text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              In the meantime, please keep an eye on your email. If we need any additional
              information or changes from you, we&rsquo;ll contact you.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToProducts}
          className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Back to Products
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  )
}
