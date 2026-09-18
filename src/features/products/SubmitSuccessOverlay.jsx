import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { PartyPopper, Mail, Clock, ArrowRight } from 'lucide-react'

const CONFETTI_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#3b82f6', '#ec4899']

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

export default function SubmitSuccessOverlay({ productName, onBackToProducts }) {
  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 75,
      angle: 270,
      startVelocity: 42,
      gravity: 0.9,
      ticks: 220,
      scalar: 0.9,
      origin: { x: 0.5, y: 0 },
      colors: CONFETTI_COLORS,
      zIndex: 200,
    })

    const timer = setTimeout(() => {
      confetti({
        particleCount: 55,
        spread: 60,
        angle: 300,
        startVelocity: 38,
        origin: { x: 0.15, y: 0.1 },
        colors: CONFETTI_COLORS,
        zIndex: 200,
      })
      confetti({
        particleCount: 55,
        spread: 60,
        angle: 240,
        startVelocity: 38,
        origin: { x: 0.85, y: 0.1 },
        colors: CONFETTI_COLORS,
        zIndex: 200,
      })
    }, 250)

    return () => {
      clearTimeout(timer)
      confetti.reset()
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-white p-4"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-lg w-full text-center"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.4, rotate: -25 },
            show: {
              opacity: 1,
              scale: 1,
              rotate: 0,
              transition: { type: 'spring', stiffness: 320, damping: 14 },
            },
          }}
          className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5"
        >
          <PartyPopper size={30} className="text-emerald-600" />
        </motion.div>

        <motion.h1 variants={item} className="text-2xl font-bold text-slate-900">
          Congratulations! 🎉
        </motion.h1>

        <motion.p variants={item} className="text-slate-600 mt-3 leading-relaxed">
          Your product{productName ? <>, <strong className="text-slate-800">&ldquo;{productName}&rdquo;</strong>,</> : ' '}
          has been submitted successfully.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-6 text-left space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
        >
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
        </motion.div>

        <motion.div variants={item}>
          <button
            type="button"
            onClick={onBackToProducts}
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Back to Products
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
