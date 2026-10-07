import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Building2, CalendarRange, Percent, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useStaysOfferBuilderStore,
  STAYS_OFFER_STEPS,
} from "../stores/staysOfferBuilderStore";
import {
  OFFER_STATUS_CONFIG,
  computeOfferStatus,
  statusIfActivated,
} from "../utils/offerStatus";
import { getOffer, getProperty, saveOffer, STAYS_KEYS } from "../api";
import Step1Properties from "../components/offers/Step1Properties";
import Step2Details from "../components/offers/Step2Details";
import Step3Discount from "../components/offers/Step3Discount";

const STEP_COMPONENTS = [Step1Properties, Step2Details, Step3Discount];

/**
 * The Stays offer builder — the Stays mirror of the Experiences
 * `SpecialOfferBuilderPage`: a three-step wizard (Properties → Offer Details
 * → Discount) with the progress rail, step card and Publish footer.
 */
export default function StaysOfferBuilderPage() {
  const { id, step } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const {
    currentStep,
    setStep,
    offer,
    editingId,
    isSaving,
    nextStep,
    prevStep,
    validateStep,
    setSaving,
    markSaved,
    reset,
    loadOffer,
    hasHydrated,
    addTarget,
  } = useStaysOfferBuilderStore();
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [offerError, setOfferError] = useState(null);

  const foundIndex = STAYS_OFFER_STEPS.findIndex((entry) => entry.id === step);
  const stepIndex = foundIndex !== -1 ? foundIndex : 0;

  // Keep the URL step in sync with the store only when the URL actually
  // changes (back/forward or a deep link), so nextStep() cannot flicker.
  const lastUrlStepRef = useRef(step);
  useEffect(() => {
    if (step === lastUrlStepRef.current) return;
    lastUrlStepRef.current = step;
    if (step && stepIndex !== currentStep) setStep(stepIndex);
  }, [step, stepIndex, currentStep, setStep]);

  useEffect(() => {
    const currentStepId = STAYS_OFFER_STEPS[currentStep]?.id;
    if (currentStepId && currentStepId !== step) {
      navigate(`/stays/special-offers/build/${id || "new"}/${currentStepId}`, { replace: true });
    }
  }, [currentStep, step, id, navigate]);

  // Load an existing offer when editing.
  useEffect(() => {
    if (!id || id === "new" || !hasHydrated) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingOffer(true);
      setOfferError(null);
      getOffer(id)
        .then((loaded) => {
          if (!cancelled) loadOffer(loaded);
        })
        .catch((error) => {
          if (!cancelled) setOfferError(error?.message || "Failed to load offer");
        })
        .finally(() => {
          if (!cancelled) setLoadingOffer(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [id, hasHydrated, loadOffer]);

  // Fresh draft for a new offer, plus the Properties-page deep link.
  const resetHandledRef = useRef(false);
  useEffect(() => {
    if ((id && id !== "new") || !hasHydrated || resetHandledRef.current) return;
    resetHandledRef.current = true;
    reset();
    const propertyId = searchParams.get("property");
    if (propertyId) {
      getProperty(propertyId)
        .then((property) =>
          addTarget({
            propertyId: property.id,
            propertyName: property.name,
            roomId: null,
            roomLabel: null,
          }),
        )
        .catch(() => {});
    }
  }, [id, hasHydrated, reset, addTarget, searchParams]);

  if (loadingOffer) {
    return (
      <div className="max-w-3xl flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (offerError) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-10 text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">Could not load offer</p>
          <p className="text-xs text-slate-500 mb-5">{offerError}</p>
          <button
            onClick={() => navigate("/stays/special-offers")}
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
    if (!valid) {
      toast.error("Please fix the highlighted errors");
      return;
    }
    nextStep();
  };

  const handleBack = () => {
    const isEditing = editingId && editingId !== "new";
    if (currentStep === 0) {
      navigate(isEditing ? `/stays/special-offers/build/${editingId}` : "/stays/special-offers");
      return;
    }
    prevStep();
  };

  const handleSubmit = async () => {
    const allValid = STAYS_OFFER_STEPS.every((_, index) => validateStep(index));
    if (!allValid) {
      toast.error("Please complete all required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: offer.name,
        offerType: offer.offerType,
        discountType: offer.discountType,
        discountPercentage: offer.discountType === "PERCENTAGE" ? offer.discountPercentage : 0,
        fixedDiscountValue:
          offer.discountType === "FIXED_AMOUNT" ? offer.fixedDiscountValue : null,
        startDate: offer.startDate ? new Date(offer.startDate).toISOString() : null,
        endDate: offer.endDate ? new Date(offer.endDate).toISOString() : null,
        isActive: offer.isActive,
        capacityType: offer.capacityType,
        maxSpots: offer.capacityType === "CAPPED" ? offer.maxSpots : null,
        timeSlotMode: offer.timeSlotMode,
        specificWeekdays: offer.specificWeekdays,
        earlyBirdAdvanceDays:
          offer.offerType === "EARLY_BIRD" ? offer.earlyBirdAdvanceDays : null,
        lastMinuteWindowHours:
          offer.offerType === "LAST_MINUTE" ? offer.lastMinuteWindowHours : null,
        promoCode: offer.promoCode || null,
        minQuantity: offer.minQuantity || null,
        minSpendAmount: offer.minSpendAmount || null,
        maxRedemptionsPerCustomer: offer.maxRedemptionsPerCustomer || null,
        stackable: offer.stackable,
        targets: offer.targets.map((target) => ({
          propertyId: target.propertyId,
          propertyName: target.propertyName,
          roomId: target.roomId || null,
          roomLabel: target.roomLabel || null,
        })),
      };

      if (editingId) {
        await saveOffer({ id: editingId, ...payload });
        if (!offer.isActive && statusIfActivated(payload) === "active") {
          toast.success("Offer saved — it's still switched off. Turn Status on to publish it.");
        } else {
          toast.success("Offer updated successfully!");
        }
      } else {
        await saveOffer(payload);
        toast.success("Offer created successfully!");
      }
      markSaved();
      queryClient.invalidateQueries({ queryKey: ["stays", "offers"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      navigate("/stays/special-offers");
    } catch (error) {
      toast.error(error?.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate("/stays/special-offers")}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
          aria-label="Back to offers"
        >
          <ArrowLeft size={17} className="text-slate-500" />
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-800">
              {editingId ? "Edit Offer" : "Create Offer"}
            </h1>
            <BuilderStatusPill />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {stepIndex + 1} of {STAYS_OFFER_STEPS.length} —{" "}
            {STAYS_OFFER_STEPS[stepIndex]?.label}
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="mb-7">
        <WizardProgressBar />
      </div>

      {/* Step content card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="bg-white rounded-xl border border-emerald-100/60 shadow-sm overflow-hidden">
            <div className="px-5 md:px-7 py-4 border-b border-emerald-100/60">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <StepIcon index={currentStep} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    {STAYS_OFFER_STEPS[currentStep]?.label}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {STAYS_OFFER_STEPS[currentStep]?.description}
                  </p>
                </div>
                <span className="ml-auto text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Step {currentStep + 1}/{STAYS_OFFER_STEPS.length}
                </span>
              </div>
            </div>

            <div className="px-5 md:px-7 py-5 md:py-6">
              {CurrentStepComponent && <CurrentStepComponent />}
            </div>

            <div className="px-5 md:px-7 py-4 border-t border-emerald-100/60 bg-slate-50/50">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleBack}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
                    currentStep === 0
                      ? "text-slate-400 hover:text-slate-600"
                      : "text-slate-600 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200",
                  )}
                >
                  <ArrowLeft size={15} />
                  {currentStep === 0 ? "Cancel" : "Previous"}
                </button>

                {currentStep < STAYS_OFFER_STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-all"
                  >
                    Next Step
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
  const icons = [Building2, CalendarRange, Percent];
  const Icon = icons[index] || Building2;
  return <Icon size={16} className="text-emerald-600" />;
}

/** Live status while editing, so a switched-off offer is visible on every step. */
function BuilderStatusPill() {
  const editingId = useStaysOfferBuilderStore((state) => state.editingId);
  const offer = useStaysOfferBuilderStore((state) => state.offer);
  if (!editingId) return null;

  const cfg = OFFER_STATUS_CONFIG[computeOfferStatus(offer)] || OFFER_STATUS_CONFIG.inactive;
  return (
    <span
      data-testid="builder-status-badge"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        cfg.bg,
        cfg.text,
        cfg.border,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function WizardProgressBar() {
  const { steps, currentStep, completedSteps } = useStaysOfferBuilderStore();

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-5 md:px-8 py-6">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center ${isLast ? "shrink-0" : "flex-1 min-w-0"}`}
            >
              <div className="flex items-center w-full">
                <motion.button
                  type="button"
                  onClick={() => useStaysOfferBuilderStore.getState().goToStep(index)}
                  className={cn(
                    "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0",
                    isCompleted && "bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
                    isCurrent &&
                      "bg-white border-2 border-emerald-600 text-emerald-600 ring-4 ring-emerald-100 shadow-sm",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500",
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
                        initial={{ width: "0%" }}
                        animate={{ width: isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <span
                  className={cn(
                    "block text-[11px] font-semibold whitespace-nowrap transition-colors",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-slate-900",
                    !isCompleted && !isCurrent && "text-slate-400",
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    "block text-[10px] mt-0.5 transition-colors",
                    isCurrent ? "text-emerald-600 font-medium" : "text-slate-400",
                  )}
                >
                  {isCurrent ? "In progress" : isCompleted ? "Completed" : "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
