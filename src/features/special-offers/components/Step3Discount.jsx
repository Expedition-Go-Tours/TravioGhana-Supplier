import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Infinity as InfinityIcon, Target, ChevronRight, DollarSign, Percent } from "lucide-react";
import { useSpecialOfferBuilderStore } from "@/features/special-offers/stores/specialOfferBuilderStore";
import { cn } from "@/lib/utils";
import { fetchPublishedCatalogue, startPriceOf } from "@/features/special-offers/utils/catalogue";

export default function Step3Discount() {
  const { offer, updateOffer, errors } = useSpecialOfferBuilderStore();
  const [catalogue, setCatalogue] = useState([]);
  const [browseError, setBrowseError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchPublishedCatalogue()
      .then((tours) => { if (mounted) setCatalogue(tours); })
      .catch(() => { if (mounted) setBrowseError(true); });
    return () => { mounted = false; };
  }, []);

  const isPercentage = offer.discountType === "PERCENTAGE";
  const discount = offer.discountPercentage || 0;
  const fixedAmount = offer.fixedDiscountValue || 0;

  // Real price preview: the cheapest retail price of the first selected
  // product (tier-aware, so a "5+ guests" tier quotes its true price),
  // falling back to a $150 sample when pricing is unavailable so the builder
  // still shows a live preview of the math.
  const firstTarget = offer.targets?.[0];
  const examplePrice = useMemo(() => {
    if (!firstTarget) return null;
    const tour = catalogue.find((t) => t.id === firstTarget.tourId);
    return tour ? startPriceOf(tour)?.price ?? null : null;
  }, [catalogue, firstTarget]);
  const examplePer = useMemo(() => {
    if (!firstTarget) return "person";
    const tour = catalogue.find((t) => t.id === firstTarget.tourId);
    return startPriceOf(tour)?.per || "person";
  }, [catalogue, firstTarget]);
  const priceKnown = examplePrice != null;
  const finalPrice = isPercentage
    ? Math.round((priceKnown ? examplePrice : 150) * (1 - discount / 100) * 100) / 100
    : Math.max(0, (priceKnown ? examplePrice : 150) - fixedAmount);

  const customerSaves = isPercentage
    ? `${discount}%`
    : `$${fixedAmount.toFixed(2)}`;

  const handleSlider = (e) => updateOffer({ discountPercentage: parseInt(e.target.value) });
  const handlePercentInput = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 100) updateOffer({ discountPercentage: val });
  };
  const handleFixedInput = (e) => {
    const val = parseFloat(e.target.value);
    updateOffer({ fixedDiscountValue: isNaN(val) || val < 0 ? null : val });
  };

  return (
    <div className="space-y-10">
      {isPercentage ? (
        <>
          {/* Percentage Ring */}
          <div className="flex flex-col items-center">
            <label className="text-sm font-semibold text-slate-700 mb-6">Discount Percentage</label>

            <div className="relative mb-6">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="64" cy="64" r="56"
                  fill="none"
                  stroke="url(#discountGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - discount / 100)}`}
                  className="transition-all duration-500 ease-out"
                />
                <defs>
                  <linearGradient id="discountGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800 tracking-tight">{discount}</span>
                <span className="text-sm font-medium text-emerald-600 -mt-1">percent</span>
              </div>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={handleSlider}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-emerald-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1.5 px-0.5">
                  <span>0%</span>
                  <span className={cn("font-medium", discount >= 50 ? "text-emerald-600" : "text-transparent")}>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount || ""}
                    onChange={handlePercentInput}
                    className={cn(
                      "w-20 px-3 py-2.5 border rounded-xl text-lg font-semibold text-center transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300",
                      errors.discountPercentage
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-white"
                    )}
                  />
                  <span className="text-lg font-semibold text-slate-500">%</span>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Customer saves</p>
                  <p className="text-lg font-bold text-emerald-600">{customerSaves}</p>
                </div>
              </div>
              {errors.discountPercentage && (
                <p className="text-sm text-red-500 text-center">{errors.discountPercentage}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Fixed Amount Input */}
          <div className="flex flex-col items-center">
            <label className="text-sm font-semibold text-slate-700 mb-6">Fixed Discount Amount</label>

            <div className="relative mb-6">
              <svg className="w-32 h-32" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="64" cy="64" r="56"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * 0.25}`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800 tracking-tight">
                  ${fixedAmount || 0}
                </span>
                <span className="text-sm font-medium text-emerald-600 -mt-1">off</span>
              </div>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-semibold text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={fixedAmount || ""}
                    onChange={handleFixedInput}
                    className={cn(
                      "w-28 px-3 py-2.5 border rounded-xl text-lg font-semibold text-center transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300",
                      errors.fixedDiscountValue
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-white"
                    )}
                  />
                </div>
                <ChevronRight size={20} className="text-slate-300" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Customer saves</p>
                  <p className="text-lg font-bold text-emerald-600">{customerSaves}</p>
                </div>
              </div>
              {errors.fixedDiscountValue && (
                <p className="text-sm text-red-500 text-center">{errors.fixedDiscountValue}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Price Preview */}
      <div className="bg-linear-to-r from-emerald-50 to-emerald-100/60 rounded-xl border border-emerald-200 p-5">
        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1.5">Price Preview</p>
        {firstTarget && (
          <p className="text-xs text-slate-500 mb-3 truncate">{firstTarget.tourTitle || "Selected product"}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 line-through">${(priceKnown ? examplePrice : 150).toFixed(2)}</p>
            <p className="text-2xl font-bold text-emerald-700">${finalPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <span className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 text-white text-sm font-bold rounded-lg",
              isPercentage ? "bg-emerald-600" : "bg-blue-600"
            )}>
              {isPercentage ? <Percent size={14} /> : <DollarSign size={14} />}
              -{customerSaves}
            </span>
            <p className="text-xs text-slate-400 mt-1">{examplePer === "group" ? "per group" : "per person"}</p>
          </div>
        </div>
        {!priceKnown && (
          <p className="text-xs text-amber-600 mt-3">
            {browseError
              ? "Couldn't load product pricing — showing a sample price (use the price check on checkout for exact numbers)."
              : "Product pricing isn't available yet — showing a sample price. Update your product's pricing to see the real discounted total."}
          </p>
        )}
      </div>

      {/* Capacity */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-4 block">Capacity</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => updateOffer({ capacityType: "UNLIMITED", maxSpots: null })}
            className={cn(
              "relative text-left p-5 rounded-xl border-2 transition-all",
              offer.capacityType === "UNLIMITED"
                ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            {offer.capacityType === "UNLIMITED" && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <InfinityIcon size={24} className={cn("mb-3", offer.capacityType === "UNLIMITED" ? "text-emerald-600" : "text-slate-400")} />
            <p className={cn("text-sm font-semibold", offer.capacityType === "UNLIMITED" ? "text-emerald-800" : "text-slate-800")}>
              Unlimited
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              No limit on how many bookings can use this offer
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateOffer({ capacityType: "CAPPED" })}
            className={cn(
              "relative text-left p-5 rounded-xl border-2 transition-all",
              offer.capacityType === "CAPPED"
                ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            {offer.capacityType === "CAPPED" && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <Target size={24} className={cn("mb-3", offer.capacityType === "CAPPED" ? "text-emerald-600" : "text-slate-400")} />
            <p className={cn("text-sm font-semibold", offer.capacityType === "CAPPED" ? "text-emerald-800" : "text-slate-800")}>
              Capped
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Limit the number of bookings that can use this offer
            </p>
          </button>
        </div>
      </div>

      {/* Max Spots */}
      <AnimatePresence>
        {offer.capacityType === "CAPPED" && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <label className="block text-sm font-semibold text-amber-800 mb-1.5">Maximum Spots</label>
              <p className="text-xs text-amber-600 mb-3">
                Once this limit is reached, the offer will stop being applied to new bookings.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={offer.maxSpots ?? ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateOffer({ maxSpots: isNaN(val) ? null : val });
                  }}
                  className={cn(
                    "w-full max-w-xs px-4 py-2.5 border rounded-xl text-sm transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300",
                    errors.maxSpots
                      ? "border-red-300 bg-red-50"
                      : "border-amber-300 bg-white"
                  )}
                />
                <span className="text-sm text-amber-700 font-medium">bookings</span>
              </div>
              {errors.maxSpots && (
                <p className="mt-2 text-sm text-red-500">{errors.maxSpots}</p>
              )}
              {offer.maxSpots && offer.maxSpots > 0 && (
                <p className="mt-3 text-xs text-amber-600">
                  Offer will auto-deactivate after <strong>{offer.maxSpots} bookings</strong> use this discount.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
