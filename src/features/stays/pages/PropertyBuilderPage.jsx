import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { SHELL_GUTTER } from "@/components/layout/shell";
import StaysPill from "../components/StaysPill";
import StaysModal from "../components/StaysModal";
import StaysButton from "../components/StaysButton";
import PropertyBuilderSidebar from "../components/PropertyBuilderSidebar";
import PropertyBuilderFooter from "../components/PropertyBuilderFooter";
import {
  getStaysStepIndex,
  STAYS_BUILDER_STEPS,
  STAYS_BUILDER_STEP_COUNT,
  STAYS_FIRST_BUILDER_INDEX,
} from "../config/staysSteps";
import { useStaysDraft } from "../hooks/useStaysDraft";
import { statusTone } from "../utils/status";
import {
  addPropertyPhotos,
  createProperty,
  deleteRatePlan,
  getProperty,
  removePropertyPhoto,
  saveRatePlan,
  saveRoom,
  submitProperty,
  STAYS_KEYS,
} from "../api";
import Step01Location from "../steps/Step01Location";
import Step02ChannelManager from "../steps/Step02ChannelManager";
import Step03Photos from "../steps/Step03Photos";
import Step04Languages from "../steps/Step04Languages";
import Step05HouseRules from "../steps/Step05HouseRules";
import Step06Identity from "../steps/Step06Identity";
import Step07HostProfile from "../steps/Step07HostProfile";
import Step08PropertyDetails from "../steps/Step08PropertyDetails";
import Step09Amenities from "../steps/Step09Amenities";
import Step10Services from "../steps/Step10Services";
import Step11BookingPreference from "../steps/Step11BookingPreference";
import Step12Payments from "../steps/Step12Payments";
import Step13PricePerNight from "../steps/Step13PricePerNight";
import Step14Rates from "../steps/Step14Rates";
import Step15Availability from "../steps/Step15Availability";
import Step16Review from "../steps/Step16Review";

const STEP_COMPONENTS = [
  Step01Location,
  Step02ChannelManager,
  Step03Photos,
  Step04Languages,
  Step05HouseRules,
  Step06Identity,
  Step07HostProfile,
  Step08PropertyDetails,
  Step09Amenities,
  Step10Services,
  Step11BookingPreference,
  Step12Payments,
  Step13PricePerNight,
  Step14Rates,
  Step15Availability,
  Step16Review,
];

/**
 * The property builder — a full-screen takeover matching the product builder:
 * top bar (exit, mobile step drawer, title + status + step counter), the
 * wizard sidebar with sections and progress, an animated step body, and the
 * Back / status / Save & Continue footer.
 *
 * The step lives in `?section=&step=` slugs; without params the builder
 * resumes at the property's own furthest step. A brand-new property is
 * created on entry (so rooms and rate plans have an id) and starts at the
 * name step.
 */
export default function PropertyBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
  const [stepError, setStepError] = useState("");
  const [stepDirection, setStepDirection] = useState(1);
  const [createdHere, setCreatedHere] = useState(false);
  const contentRef = useRef(null);
  // Guards against React StrictMode's double effect invocation, which used to
  // create two "Untitled property" drafts every time the builder opened.
  const createStartedRef = useRef(false);
  // `/stays/properties/build` and `/stays/properties/build/new` both start a
  // fresh draft. Without the `new` alias the route treats it as an existing
  // property ID: the fetch 404s and the builder spins on its loading screen
  // forever. The products builder accepts the same alias.
  const isNew = !id || id === "new";

  // ── Draft bootstrapping ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => createProperty(),
    onSuccess: (created) => {
      setCreatedHere(true);
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      navigate(
        `/stays/properties/build/${created.id}?section=basic-information&step=location`,
        { replace: true },
      );
    },
    onError: () => toast.error("Could not start a new property"),
  });

  useEffect(() => {
    if (!isNew || createStartedRef.current) return;
    createStartedRef.current = true;
    createMutation.mutate();
  }, [isNew, createMutation]);

  const { data: property, isLoading, isError } = useQuery({
    queryKey: STAYS_KEYS.property(id),
    queryFn: () => getProperty(id),
    enabled: Boolean(id) && !isNew,
  });

  const { draft, patch, flush, isSaving, lastSavedAt } = useStaysDraft(property);

  // ── Step cursor (URL slugs, resuming at the draft's furthest step) ─────
  const querySection = searchParams.get("section");
  const queryStep = searchParams.get("step");
  const hasStepParams = Boolean(querySection && queryStep);
  // The category step is answered before the draft exists, so the builder
  // never sits on it: any index below the first builder step floors there.
  const stepIndex = Math.max(
    hasStepParams
      ? getStaysStepIndex(querySection, queryStep)
      : Math.min(draft?.step || 0, STAYS_BUILDER_STEP_COUNT - 1),
    STAYS_FIRST_BUILDER_INDEX,
  );
  const stepMeta = STAYS_BUILDER_STEPS[stepIndex];
  const completedCount = Math.min(draft?.step || 0, STAYS_BUILDER_STEP_COUNT);
  // Full-bleed steps own the content area (the location map) and hide the
  // builder footer; steps with their own heading/footer (the channel manager)
  // skip the standard chrome so the reference layout isn't doubled up.
  const isFullBleedStep = Boolean(stepMeta?.fullBleed);
  const showStepHeader = !isFullBleedStep && !stepMeta?.hideHeader;
  const showBuilderFooter = !isFullBleedStep && !stepMeta?.hideFooter;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  const goToStep = (index, direction = 1) => {
    const meta = STAYS_BUILDER_STEPS[index];
    if (!meta) return;
    setStepDirection(direction);
    setStepError("");
    const next = new URLSearchParams(searchParams);
    next.set("section", meta.sectionId);
    next.set("step", meta.stepId);
    setSearchParams(next, { replace: true });
  };

  // ── Validation — keyed by step slug so reordering steps is safe ───────
  const STEP_VALIDATORS = {
    location: (value) => {
      if (!value.city || !value.address) return "Add a city and street address";
      if (value.lat == null || value.lng == null) {
        return "Place your property's pin on the map to continue";
      }
      return "";
    },
    identity: (value) =>
      !value.name || value.name === "Untitled property"
        ? "Add a property name to continue"
        : "",
    availability: (value) => {
      if ((value.startMode || "asap") === "date" && !value.start) {
        return "Choose the first bookable date";
      }
      if (!value.longStays) return "Answer the 30+ night stays question";
      return "";
    },
    review: (value) =>
      !value.agreement?.certifyBusiness || !value.agreement?.certifyTerms
        ? "Accept the certifications before submitting"
        : "",
  };

  const validateStep = (index, value) => {
    const meta = STAYS_BUILDER_STEPS[index];
    const validator = meta ? STEP_VALIDATORS[meta.stepId] : null;
    return validator ? validator(value) : "";
  };

  const handleNext = () => {
    const error = validateStep(stepIndex, draft);
    if (error) {
      setStepError(error);
      toast.error(error);
      return;
    }
    patch({ step: Math.max(draft.step || 0, stepIndex + 1) });
    goToStep(Math.min(stepIndex + 1, STAYS_BUILDER_STEP_COUNT - 1), 1);
  };

  const handleBack = () => goToStep(Math.max(STAYS_FIRST_BUILDER_INDEX, stepIndex - 1), -1);

  const handleSelectStep = (index) => {
    const meta = STAYS_BUILDER_STEPS[index];
    if (!meta) return;
    // Step 1 lives in the pre-builder chain (the four cards and their
    // follow-ups), not inside the draft builder: clicking it reopens the
    // chain to edit this draft's category instead of creating a new draft.
    if (meta.preBuilder) {
      navigate(`/stays/properties/build?draft=${id}`);
      return;
    }
    if (index > Math.max(completedCount, stepIndex)) return;
    goToStep(index, index > stepIndex ? 1 : -1);
  };

  // Back on the first builder step (Location) reopens step 1 — the category
  // chain — for this draft, mirroring the sidebar's step-1 row.
  const handleFirstStepBack = () => handleSelectStep(STAYS_FIRST_BUILDER_INDEX - 1);

  const handleExit = async () => {
    try {
      await flush();
    } catch {
      toast.error("Could not save your changes");
    }
    navigate("/stays/properties");
  };

  const handleSubmit = () => {
    for (let index = 0; index < STAYS_BUILDER_STEP_COUNT; index += 1) {
      const error = validateStep(index, draft);
      if (error) {
        setStepError(error);
        toast.error(error);
        goToStep(index, index > stepIndex ? 1 : -1);
        return;
      }
    }
    submitMutation.mutate();
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      await flush();
      return submitProperty(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      setShowSuccess(true);
    },
    onError: () => toast.error("Could not submit the property"),
  });

  const saveRoomMutation = useMutation({
    mutationFn: (room) => saveRoom(draft.id, room),
    onSuccess: (updated) => {
      patch({ rooms: updated.rooms, ratePlans: updated.ratePlans });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: (plan) => saveRatePlan(draft.id, plan),
    onSuccess: (updated) => patch({ ratePlans: updated.ratePlans }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (plan) => deleteRatePlan(draft.id, plan.id),
    onSuccess: (updated) => patch({ ratePlans: updated.ratePlans }),
  });

  const addPhotosMutation = useMutation({
    mutationFn: (dataUrls) => addPropertyPhotos(draft.id, dataUrls),
    onSuccess: (photos) => patch({ photos }),
  });

  const removePhotoMutation = useMutation({
    mutationFn: (index) => removePropertyPhoto(draft.id, index),
    onSuccess: (photos) => patch({ photos }),
  });

  // ── Render ─────────────────────────────────────────────────────────────
  // A failed lookup or failed draft creation must never leave the builder on
  // its loading spinner forever (deleted draft, stale link, reset preview
  // dataset, or an offline create).
  if (isError || createMutation.isError) {
    const createFailed = createMutation.isError;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-600" size={36} />
            <h2 className="text-lg font-semibold text-red-800">
              {createFailed ? "Could not start a new property" : "Property not found"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-red-700">
              {createFailed
                ? "Something went wrong while creating the draft. Check your connection and try again."
                : "This draft is no longer available. It may have been removed, or the preview data was reset."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {createFailed && (
                <StaysButton
                  variant="primary"
                  onClick={() => {
                    createMutation.reset();
                    createMutation.mutate();
                  }}
                >
                  Try again
                </StaysButton>
              )}
              <StaysButton onClick={() => navigate("/stays/properties")}>
                Back to properties
              </StaysButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!draft || isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <RefreshCw className="animate-spin text-slate-400" size={20} />
      </div>
    );
  }

  // The category step is pre-builder, so the component list starts at the
  // first draft-builder step (Location) — offset the lookup accordingly.
  const StepBody = STEP_COMPONENTS[stepIndex - STAYS_FIRST_BUILDER_INDEX];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 overflow-hidden bg-white"
    >
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white py-2.5 sm:py-3 ${SHELL_GUTTER}`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={handleExit}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
              type="button"
              aria-label="Close and return to properties"
            >
              <X size={20} />
            </button>
            <button
              onClick={() => setMobileStepsOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              type="button"
              aria-label="Open property steps"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="hidden h-6 w-0.5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-300 sm:block" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">
                  {createdHere ? "Create New Property" : "Edit Property"}
                </h1>
                <StaysPill tone={statusTone(draft.status)}>{draft.status}</StaysPill>
              </div>
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                Step {stepIndex + 1} of {STAYS_BUILDER_STEP_COUNT}: {stepMeta.label}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile step drawer */}
        <AnimatePresence>
          {mobileStepsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/25 lg:hidden"
                onClick={() => setMobileStepsOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col bg-slate-50 lg:hidden"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">Property steps</span>
                  <button
                    onClick={() => setMobileStepsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                    type="button"
                    aria-label="Close property steps"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden bg-white">
                  <PropertyBuilderSidebar
                    currentIndex={stepIndex}
                    completedCount={completedCount}
                    onSelectStep={(index) => {
                      handleSelectStep(index);
                      setMobileStepsOpen(false);
                    }}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main area: sidebar + content */}
        <div className={`flex min-h-0 flex-1 gap-0 ${SHELL_GUTTER} py-3 sm:py-4 lg:py-5`}>
          <div className="hidden shrink-0 lg:flex">
            <PropertyBuilderSidebar
              currentIndex={stepIndex}
              completedCount={completedCount}
              onSelectStep={handleSelectStep}
            />
          </div>

          <div
            className={`flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-6 ${
              isFullBleedStep ? "" : "bg-white"
            }`}
          >
            <div
              ref={contentRef}
              className={
                isFullBleedStep
                  ? "min-h-0 flex-1 overflow-hidden"
                  : "flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8"
              }
            >
              {showStepHeader && (
                <>
                  <h2 className="mb-1 text-lg font-bold tracking-tight sm:mb-1.5 sm:text-xl">{stepMeta.label}</h2>
                  <p className="mb-4 text-sm text-slate-500 sm:mb-6">{stepMeta.hint}</p>
                </>
              )}
              <AnimatePresence mode="wait" custom={stepDirection}>
                {StepBody && (
                  <motion.div
                    key={stepIndex}
                    custom={stepDirection}
                    variants={{
                      initial: (direction) => ({ opacity: 0, x: direction * 24 }),
                      animate: { opacity: 1, x: 0 },
                      exit: (direction) => ({ opacity: 0, x: direction * -24 }),
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className={isFullBleedStep ? "h-full" : undefined}
                  >
                    <StepBody
                      property={draft}
                      patch={patch}
                      // First builder step: Back reopens the category chain
                      // instead of leaving the button off the screen.
                      onBack={
                        stepIndex > STAYS_FIRST_BUILDER_INDEX
                          ? handleBack
                          : handleFirstStepBack
                      }
                      onNext={handleNext}
                      onSave={() => flush()}
                      saving={isSaving}
                      onSubmit={handleSubmit}
                      submitting={submitMutation.isPending}
                      onExit={handleExit}
                      onSaveRoom={(room) => saveRoomMutation.mutateAsync(room)}
                      onSavePlan={(plan) => savePlanMutation.mutateAsync(plan)}
                      onDeletePlan={(plan) => deletePlanMutation.mutateAsync(plan)}
                      onAddPhotos={(dataUrls) => addPhotosMutation.mutateAsync(dataUrls)}
                      onRemovePhoto={(index) => removePhotoMutation.mutateAsync(index)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {showBuilderFooter && (
              <PropertyBuilderFooter
                // Builder-relative numbering: the footer only uses these to
                // hide Back on the first builder step and show Submit on the
                // last, so the pre-builder category step doesn't count.
                stepNumber={stepIndex - STAYS_FIRST_BUILDER_INDEX + 1}
                totalSteps={STAYS_BUILDER_STEP_COUNT - STAYS_FIRST_BUILDER_INDEX}
                onBack={handleBack}
                onNext={handleNext}
                onSubmit={handleSubmit}
                error={stepError}
                saving={isSaving}
                submitting={submitMutation.isPending}
                lastSavedAt={lastSavedAt}
              />
            )}
          </div>
        </div>
      </div>

      <StaysModal
        open={showSuccess}
        onOpenChange={(next) => !next && setShowSuccess(false)}
        title="Property submitted!"
        footer={
          <StaysButton
            variant="primary"
            onClick={() => {
              setShowSuccess(false);
              navigate("/stays/properties");
            }}
          >
            Open property dashboard
          </StaysButton>
        }
      >
        <p className="m-0 text-3xl leading-none">✦</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your property listing is now marked Under review. You can return to it any time from Properties.
        </p>
      </StaysModal>
    </motion.div>
  );
}
