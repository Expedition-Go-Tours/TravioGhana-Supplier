import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Package, Loader2, Check, AlertCircle, ChevronRight, Tag, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useSpecialOfferBuilderStore } from "@/features/special-offers/stores/specialOfferBuilderStore";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { fetchPublishedCatalogue, scheduleOptions } from "@/features/special-offers/utils/catalogue";

export default function Step1Products() {
  const { offer, addTarget, removeTarget, setTargetOption, errors } = useSpecialOfferBuilderStore();
  const [query, setQuery] = useState("");
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const loadCatalogue = useCallback(async () => {
    try {
      setTours(await fetchPublishedCatalogue());
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Failed to load your products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadCatalogue);
  }, [loadCatalogue]);

  const retryCatalogue = () => {
    setLoading(true);
    setLoadError(null);
    loadCatalogue();
  };

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredTours = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((tour) =>
      (tour.title || "").toLowerCase().includes(q) ||
      (tour.category || "").toLowerCase().includes(q)
    );
  }, [tours, query]);

  const addedIds = useMemo(() => new Set(offer.targets.map((t) => t.tourId)), [offer.targets]);
  const allAdded = tours.length > 0 && tours.every((tour) => addedIds.has(tour.id));
  const optionsByTour = useMemo(() => {
    const map = new Map();
    for (const tour of tours) {
      const options = scheduleOptions(tour);
      if (options.length > 0) map.set(tour.id, options);
    }
    return map;
  }, [tours]);

  return (
    <div className="space-y-6">
      {errors.targets && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{errors.targets}</p>
        </div>
      )}

      <div className="relative" ref={ref}>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Select a product or type to filter..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full px-4 py-3 pl-10 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
          />
          {loading && (
            <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-80 overflow-y-auto"
            >
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  Loading your products...
                </div>
              )}

              {!loading && loadError && (
                <div className="py-8 px-4 text-center">
                  <AlertCircle size={28} className="mx-auto text-red-300 mb-2" />
                  <p className="text-sm text-slate-600 mb-3">{loadError}</p>
                  <button
                    type="button"
                    onClick={retryCatalogue}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <RefreshCw size={13} /> Retry
                  </button>
                </div>
              )}

              {!loading && !loadError && allAdded && (
                <div className="py-8 text-center">
                  <Check size={32} className="mx-auto text-emerald-300 mb-2" />
                  <p className="text-sm text-slate-500">All your published products are already in this offer</p>
                </div>
              )}

              {!loading && !loadError && !allAdded && tours.length === 0 && (
                <div className="py-8 text-center">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">You don't have any published products yet</p>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">Draft and rejected products can't receive offers</p>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Go to Products <ChevronRight size={13} />
                  </Link>
                </div>
              )}

              {!loading && !loadError && !allAdded && tours.length > 0 && filteredTours.length === 0 && (
                <div className="py-8 text-center">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No products match "{query.trim()}"</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try a different name</p>
                </div>
              )}

              {!loading && !loadError && !allAdded && filteredTours.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Your published products
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {filteredTours.length} of {tours.length}
                    </span>
                  </div>
                  {filteredTours.map((tour) => {
                    const alreadyAdded = addedIds.has(tour.id);
                    const price = tour.schedulesAndPricing?.pricingSchedules?.schedules?.[0]?.prices?.[0]?.retailPrice;
                    const hasOffer = Array.isArray(tour.specialOffers) && tour.specialOffers.some((o) => o?.isActive);
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => {
                          if (!alreadyAdded) {
                            addTarget({ tourId: tour.id, tourTitle: tour.title, tourPhotos: tour.photos || [], tourOptionKey: null, tourOptionLabel: null });
                          }
                          setQuery("");
                          setOpen(false);
                        }}
                        disabled={alreadyAdded}
                        className={cn(
                          "w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-slate-50 last:border-b-0 transition-colors text-left",
                          alreadyAdded
                            ? "bg-emerald-50/50 opacity-60 cursor-not-allowed"
                            : "hover:bg-emerald-50"
                        )}
                      >
                        <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {tour.photos?.[0] ? (
                            <OptimizedImage src={tour.photos[0]} alt="" width={44} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={18} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-700 truncate">{tour.title}</p>
                            {hasOffer && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 shrink-0">
                                <Tag size={10} /> Has offer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">{tour.category || "Tour"}</span>
                            {price && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs font-medium text-slate-500">${price}</span>
                              </>
                            )}
                            {tour.status && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className={cn(
                                  "text-[10px] font-medium uppercase tracking-wider",
                                  tour.status === "ACTIVE" ? "text-emerald-600" : "text-slate-400"
                                )}>
                                  {tour.status}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Check size={14} /> Added
                          </span>
                        ) : (
                          <ChevronRight size={16} className="text-slate-300" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {offer.targets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Selected Products <span className="text-slate-400 font-normal">({offer.targets.length})</span>
              </p>
            </div>
            <div className="space-y-2.5">
              {offer.targets.map((target, index) => (
                <motion.div
                  key={`${target.tourId}-${target.tourOptionKey || "all"}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3.5 p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 overflow-hidden shrink-0">
                    {target.tourPhotos?.[0] ? (
                      <OptimizedImage src={target.tourPhotos[0]} alt="" width={40} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{target.tourTitle || "Tour"}</p>
                    {optionsByTour.has(target.tourId) ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setTargetOption(target.tourId, null, null)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors",
                            !target.tourOptionKey
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                          )}
                        >
                          Whole product
                        </button>
                        {optionsByTour.get(target.tourId).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setTargetOption(target.tourId, opt.key, opt.label)}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors",
                              target.tourOptionKey === opt.key
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      target.tourOptionLabel && (
                        <p className="text-xs text-emerald-600 mt-0.5">Option: {target.tourOptionLabel}</p>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTarget(index)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    title="Remove"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {offer.targets.length === 0 && !errors.targets && (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Package size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No products selected yet</p>
          <p className="text-xs text-slate-400 mt-1">Select products from the dropdown above to apply this offer to</p>
        </div>
      )}
    </div>
  );
}