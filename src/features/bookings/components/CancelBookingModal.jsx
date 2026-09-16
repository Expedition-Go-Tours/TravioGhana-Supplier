import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, CalendarX2 } from "lucide-react";

const CANCELLATION_REASONS = [
  "Weather conditions",
  "Not enough travelers",
  "Operational issue",
  "Supplier scheduling conflict",
  "Customer requested",
  "Other",
];

export default function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading = false,
}) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const cancelRef = useRef(null);

  // Reset the form when the modal opens (adjust-state-during-render pattern —
  // the linter-approved way to sync state to a prop change without an effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setReason("");
    setCustomReason("");
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    onConfirm?.(finalReason || null);
  };

  const tourTitle = booking?.tour?.title || "this booking";
  const isPaid = booking?.paymentStatus === "SUCCEEDED";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Cancel booking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Cancel Booking
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  This will cancel the booking for &ldquo;{tourTitle}&rdquo;
                </p>
              </div>
            </div>

            {/* Refund notice */}
            {isPaid && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200/60">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <span className="font-semibold">Refund notice:</span> The
                  customer will receive a refund according to the cancellation
                  policy. This may affect your payout.
                </p>
              </div>
            )}

            {/* Cancellation rate warning */}
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200/60">
              <div className="flex items-start gap-2">
                <CalendarX2
                  size={14}
                  className="text-blue-600 shrink-0 mt-0.5"
                />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Supplier-caused cancellations count toward your cancellation
                  rate. Keep your rate below 2% for excellent performance.{" "}
                  <a
                    href="/cancellation-rate"
                    className="underline font-medium hover:text-blue-900"
                  >
                    View your rate
                  </a>
                </p>
              </div>
            </div>

            {/* Reason selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for cancellation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CANCELLATION_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                      reason === r
                        ? "bg-[#044b3b] text-white border-[#044b3b]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === "Other" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  className="mt-3 w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] transition-all"
                  autoFocus
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                ref={cancelRef}
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                Cancel booking
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
