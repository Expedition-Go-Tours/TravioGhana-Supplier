import { useState } from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Step17CancellationPolicy() {
  const cancellationType = useProductBuilderStore((s) => s.cancellationType)
  const supplierCanCancelBadWeather = useProductBuilderStore((s) => s.supplierCanCancelBadWeather)
  const supplierCanCancelNotEnoughTravelers = useProductBuilderStore((s) => s.supplierCanCancelNotEnoughTravelers)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(10)

  const [showBanner, setShowBanner] = useState(true)
  const [showWeatherBanner, setShowWeatherBanner] = useState(true)

  const anySupplierCancelChecked = supplierCanCancelBadWeather || supplierCanCancelNotEnoughTravelers

  function handleCancelTypeChange(value) {
    setField('cancellationType', value)
    if (value === 'all_sales_final') {
      setField('supplierCanCancelBadWeather', false)
      setField('supplierCanCancelNotEnoughTravelers', false)
    }
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Your cancellation policy</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Select your cancellation policy.{' '}
          <a href="#" className="text-blue-600 hover:underline font-medium">Learn more</a>
        </p>
      </div>

      {showBanner && (
        <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <Info size={18} className="text-teal-600 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-800 flex-1">
            Most travelers prefer the flexibility of a <strong>standard cancellation policy</strong>. Your product is also more likely to obtain an <strong>Excellent quality</strong> status.
          </p>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-0.5 text-teal-400 hover:text-teal-600 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <div data-field="cancellationType" className="space-y-3">
        <label
          className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
            cancellationType === 'standard'
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full border-2 grid place-items-center transition-colors duration-150 ${
                  cancellationType === 'standard' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                }`}
              >
                {cancellationType === 'standard' && <CheckIcon />}
              </div>
              <input
                type="radio"
                name="cancellationType"
                value="standard"
                checked={cancellationType === 'standard'}
                onChange={() => handleCancelTypeChange('standard')}
                className="sr-only"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">Standard</span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">RECOMMENDED</span>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                To receive a full refund, travelers may cancel up to 24 hours before the experience start time in the local timezone. No refunds will be given after that time period.
              </p>
            </div>
          </div>
        </label>

        <label
          className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
            cancellationType === 'all_sales_final'
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full border-2 grid place-items-center transition-colors duration-150 ${
                  cancellationType === 'all_sales_final' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                }`}
              >
                {cancellationType === 'all_sales_final' && <CheckIcon />}
              </div>
              <input
                type="radio"
                name="cancellationType"
                value="all_sales_final"
                checked={cancellationType === 'all_sales_final'}
                onChange={() => handleCancelTypeChange('all_sales_final')}
                className="sr-only"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800">All sales final</span>
              <p className="text-[13px] text-slate-500 leading-relaxed mt-1">
                Travelers will not receive any refund regardless of cancellation status.
              </p>
            </div>
          </div>
        </label>
        {errors.cancellationType && <span className="text-[13px] text-red-600 font-medium block">{errors.cancellationType[0]}</span>}
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-4">
        <div>
          <span className="text-sm font-semibold text-slate-800">Add to your policy (optional)</span>
          <p className="text-[13px] text-slate-500 mt-0.5">
            You may reserve the right to cancel a customer's booking for a full refund in case of:
          </p>
        </div>

        {anySupplierCancelChecked && showWeatherBanner && (
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 flex-1">
              Frequent cancellations can impact traveler trust, lower your <strong>Product Quality Level</strong>, and reduce future bookings. Only use this option in extreme circumstances.
            </p>
            <button
              type="button"
              onClick={() => setShowWeatherBanner(false)}
              className="p-0.5 text-orange-400 hover:text-orange-600 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div data-field="supplierCanCancelBadWeather">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={supplierCanCancelBadWeather}
                onChange={(e) => setField('supplierCanCancelBadWeather', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-[18px] h-[18px] rounded border-2 border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 transition-all duration-150 grid place-items-center">
                {supplierCanCancelBadWeather && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Bad weather</span>
          </label>
          {errors.supplierCanCancelBadWeather && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.supplierCanCancelBadWeather[0]}</span>}
        </div>

        <div data-field="supplierCanCancelNotEnoughTravelers">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={supplierCanCancelNotEnoughTravelers}
                onChange={(e) => setField('supplierCanCancelNotEnoughTravelers', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-[18px] h-[18px] rounded border-2 border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 transition-all duration-150 grid place-items-center">
                {supplierCanCancelNotEnoughTravelers && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Not enough travelers</span>
          </label>
          {errors.supplierCanCancelNotEnoughTravelers && <span className="text-[13px] text-red-600 font-medium mt-1">{errors.supplierCanCancelNotEnoughTravelers[0]}</span>}
        </div>
      </div>
    </div>
  )
}
