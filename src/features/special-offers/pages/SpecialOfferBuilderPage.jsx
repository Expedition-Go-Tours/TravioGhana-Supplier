import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Check, Package, CalendarRange, Percent } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSpecialOfferBuilderStore, STEPS } from "@/features/special-offers/stores/specialOfferBuilderStore";
import { createSpecialOffer, updateSpecialOffer, getSpecialOffer } from "@/features/special-offers/api";
import { getMyProduct } from "@/features/products/api";
import Step1Products from "@/features/special-offers/components/Step1Products";
import Step2Details from "@/features/special-offers/components/Step2Details";
import Step3Discount from "@/features/special-offers/components/Step3Discount";

const STEP_COMPONENTS = [Step1Products, Step2Details, Step3Discount];

export default function SpecialOfferBuilderPage() {
  const { id, step } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentStep, setStep, offer, editingId, isSaving,
    nextStep, prevStep, validateStep, setSaving, markSaved, reset, loadOffer, hasHydrated, addTarget,
  } = useSpecialOfferBuilderStore();
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productError, setProductError] = useState(null);

  const foundIndex = STEPS.findIndex((s) => s.id === step);
  const stepIndex = foundIndex !== -1 ? foundIndex : 0;

  // Sync the store from the URL ONLY when the URL step actually changes
  // (browser back/forward, direct links). Guarding against same-render
  // changes stops the wizard from flickering: `nextStep()` moves the store
  // first, and without this guard the still-stale URL would yank it back
  // before the navigation lands (1 → 0 → 1 flashing).
  const lastUrlStepRef = useRef(step);
  useEffect(() => {
    if (step === lastUrlStepRef.current) return;
    lastUrlStepRef.current = step;
    if (step && stepIndex !== currentStep) setStep(stepIndex);
  }, [step, stepIndex, currentStep, setStep]);

  useEffect(() => {
    const currentStepId = STEPS[currentStep]?.id;
    if (currentStepId && currentStepId !== step) {
      navigate(`/special-offers/build/${id || "new"}/${currentStepId}`, { replace: true });
    }
  }, [currentStep, step, id, navigate]);

  useEffect(() => {
    if (!id || id === "new" || !hasHydrated) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingProduct(true);
      setProductError(null);
      getSpecialOffer(id)
        .then((res) => {
          if (cancelled) return;
          const offer = res.data?.data?.offer;
          if (!offer) { setProductError("Offer not found"); return; }
          loadOffer(offer);
        })
        .catch((err) => {
          if (cancelled) return;
          setProductError(err.response?.data?.message || err.message || "Failed to load offer");
        })
        .finally(() => { if (!cancelled) setLoadingProduct(false); });
    });
    return () => { cancelled = true; };
  }, [id, hasHydrated, loadOffer]);

  // Reset store when creating a new offer
  const resetHandledRef = useRef(false);
  useEffect(() => {
    if ((!id || id === "new") && hasHydrated && !resetHandledRef.current) {
      resetHandledRef.current = true;
      reset();
      const productId = searchParams.get("productId");
      if (productId) {
        // Enrich the deep-linked product with title/photos so the selected
        // chip never renders as a bare "Tour".
        getMyProduct(productId)
          .then((res) => {
            const tour = res.data?.data?.tour;
            addTarget({
              tourId: productId,
              tourTitle: tour?.title || "",
              tourPhotos: tour?.photos || [],
              tourOptionKey: null,
              tourOptionLabel: null,
            });
          })
          .catch(() => {
            addTarget({ tourId: productId, tourTitle: "", tourPhotos: [], tourOptionKey: null, tourOptionLabel: null });
          });
      }
    }
  }, [id, hasHydrated, reset, addTarget, searchParams]);

  if (loadingProduct) {
    return (
      <div className="p-5 md:p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="p-5 md:p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-10 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Could not load offer</p>
          <p className="text-xs text-slate-500 mb-5">{productError}</p>
          <button
            onClick={() => navigate("/special-offers")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Offers
          </button>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEP_COMPONENTS[currentStep];

  const handleNext = () => {
    const valid = validateStep(currentStep);
    if (!valid) { toast.error("Please fix the highlighted errors"); return; }
    nextStep();
  };

  const handleBack = () => {
    const isEditing = editingId && editingId !== "new";
    if (currentStep === 0) {
      navigate(isEditing ? `/special-offers/build/${editingId}` : "/special-offers");
      return;
    }
    prevStep();
  };

  const handleSubmit = async () => {
    const allValid = STEPS.every((_, i) => validateStep(i));
    if (!allValid) { toast.error("Please complete all required fields"); return; }
    setSaving(true);
    try {
      const payload = {
        name: offer.name,
        offerType: offer.offerType,
        discountType: offer.discountType,
        discountPercentage: offer.discountType === "PERCENTAGE" ? offer.discountPercentage : 0,
        fixedDiscountValue: offer.discountType === "FIXED_AMOUNT" ? offer.fixedDiscountValue : null,
        startDate: offer.startDate ? new Date(offer.startDate).toISOString() : null,
        endDate: offer.endDate ? new Date(offer.endDate).toISOString() : null,
        isActive: offer.isActive,
        capacityType: offer.capacityType,
        maxSpots: offer.capacityType === "CAPPED" ? offer.maxSpots : null,
        timeSlotMode: offer.timeSlotMode,
        specificWeekdays: offer.specificWeekdays,
        earlyBirdAdvanceDays: offer.offerType === "EARLY_BIRD" ? offer.earlyBirdAdvanceDays : null,
        lastMinuteWindowHours: offer.offerType === "LAST_MINUTE" ? offer.lastMinuteWindowHours : null,
        promoCode: offer.promoCode || null,
        minQuantity: offer.minQuantity || null,
        minSpendAmount: offer.minSpendAmount || null,
        maxRedemptionsPerCustomer: offer.maxRedemptionsPerCustomer || null,
        stackable: offer.stackable,
        targets: offer.targets.map((t) => ({
          tourId: t.tourId,
          tourOptionKey: t.tourOptionKey || null,
          tourOptionLabel: t.tourOptionLabel || null,
        })),
      };

      if (editingId) {
        await updateSpecialOffer(editingId, payload);
        toast.success("Offer updated successfully!");
      } else {
        await createSpecialOffer(payload);
        toast.success("Offer created successfully!");
      }
      markSaved();
      navigate("/special-offers");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate("/special-offers")}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <ArrowLeft size={17} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {editingId ? "Edit Offer" : "Create Offer"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex]?.label}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-7">
        <WizardProgressBar />
      </div>

      {/* Step Content Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="bg-white rounded-xl border border-emerald-100/60 shadow-sm overflow-hidden">
            {/* Step Title */}
            <div className="px-5 md:px-7 py-4 border-b border-emerald-100/60">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <StepIcon index={currentStep} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{STEPS[currentStep]?.label}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{STEPS[currentStep]?.description}</p>
                </div>
                <span className="ml-auto text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Step {currentStep + 1}/{STEPS.length}
                </span>
              </div>
            </div>

            {/* Step Body */}
            <div className="px-5 md:px-7 py-5 md:py-6">
              {CurrentStepComponent && <CurrentStepComponent />}
            </div>

            {/* Footer */}
            <div className="px-5 md:px-7 py-4 border-t border-emerald-100/60 bg-slate-50/50">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleBack}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
                    currentStep === 0
                      ? "text-slate-400 hover:text-slate-600"
                      : "text-slate-600 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200"
                  )}
                >
                  <ArrowLeft size={15} />
                  {currentStep === 0 ? "Cancel" : "Previous"}
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-all"
                  >
                    Next Step
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving && <Loader2 size={15} className="animate-spin" />}
                    {editingId ? "Update Offer" : "Publish Offer"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepIcon({ index }) {
  const icons = [Package, CalendarRange, Percent];
  const Icon = icons[index] || Package;
  return <Icon size={16} className="text-emerald-600" />;
}

function WizardProgressBar() {
  const { steps, currentStep, completedSteps } = useSpecialOfferBuilderStore();

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-5 md:px-8 py-6">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className={`flex flex-col items-center ${isLast ? 'shrink-0' : 'flex-1 min-w-0'}`}>
              <div className="flex items-center w-full">
                <motion.button
                  type="button"
                  onClick={() => useSpecialOfferBuilderStore.getState().goToStep(index)}
                  className={cn(
                    "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0",
                    isCompleted && "bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
                    isCurrent && "bg-white border-2 border-emerald-600 text-emerald-600 ring-4 ring-emerald-100 shadow-sm",
                    !isCompleted && !isCurrent && "bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCompleted ? (
                    <Check size={17} strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-bold">{step.number}</span>
                  )}
                </motion.button>
                {!isLast && (
                  <div className="flex-1 h-[3px] mx-4 self-center mb-7">
                    <div className="relative h-full rounded-full overflow-hidden bg-slate-100">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-emerald-500"
                        initial={{ width: '0%' }}
                        animate={{ width: isCompleted ? '100%' : '0%' }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <span className={cn(
                  "block text-[11px] font-semibold whitespace-nowrap transition-colors",
                  isCompleted && "text-emerald-600",
                  isCurrent && "text-slate-900",
                  !isCompleted && !isCurrent && "text-slate-400"
                )}>
                  {step.label}
                </span>
                <span className={cn(
                  "block text-[10px] mt-0.5 transition-colors",
                  isCurrent ? "text-emerald-600 font-medium" : "text-slate-400"
                )}>
                  {isCurrent ? 'In progress' : isCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
