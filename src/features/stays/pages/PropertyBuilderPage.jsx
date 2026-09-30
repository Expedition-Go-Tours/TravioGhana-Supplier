import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { SHELL_GUTTER } from "@/components/layout/shell";
import StaysPill from "../components/StaysPill";
import StaysModal from "../components/StaysModal";
import StaysButton from "../components/StaysButton";
import RoomModal from "../components/RoomModal";
import RatePlanModal from "../components/RatePlanModal";
import PropertyBuilderSidebar from "../components/PropertyBuilderSidebar";
import PropertyBuilderFooter from "../components/PropertyBuilderFooter";
import {
  getStaysStepIndex,
  STAYS_BUILDER_STEPS,
  STAYS_BUILDER_STEP_COUNT,
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
import Step01Name from "../steps/Step01Name";
import Step02Basics from "../steps/Step02Basics";
import Step03Location from "../steps/Step03Location";
import Step04Facilities from "../steps/Step04Facilities";
import Step05Rooms from "../steps/Step05Rooms";
import Step06Rates from "../steps/Step06Rates";
import Step07Availability from "../steps/Step07Availability";
import Step08Policies from "../steps/Step08Policies";
import Step09Photos from "../steps/Step09Photos";
import Step10Review from "../steps/Step10Review";

const STEP_COMPONENTS = [
  Step01Name,
  Step02Basics,
  Step03Location,
  Step04Facilities,
  Step05Rooms,
  Step06Rates,
  Step07Availability,
  Step08Policies,
  Step09Photos,
  Step10Review,
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

  const [roomModal, setRoomModal] = useState(null); // { room?, openKey }
  const [planModal, setPlanModal] = useState(null); // { room, plan?, openKey }
  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
  const [stepError, setStepError] = useState("");
  const [stepDirection, setStepDirection] = useState(1);
  const [createdHere, setCreatedHere] = useState(false);
  const contentRef = useRef(null);
  // Guards against React StrictMode's double effect invocation, which used to
  // create two "Untitled property" drafts every time the builder opened.
  const createStartedRef = useRef(false);

  // ── Draft bootstrapping ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => createProperty(),
    onSuccess: (created) => {
      setCreatedHere(true);
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      navigate(
        `/stays/properties/build/${created.id}?section=getting-started&step=name`,
        { replace: true },
      );
    },
    onError: () => toast.error("Could not start a new property"),
  });

  useEffect(() => {
    if (id || createStartedRef.current) return;
    createStartedRef.current = true;
    createMutation.mutate();
  }, [id, createMutation]);

  const { data: property, isLoading } = useQuery({
    queryKey: STAYS_KEYS.property(id),
    queryFn: () => getProperty(id),
    enabled: Boolean(id),
  });

  const { draft, patch, flush, isSaving, lastSavedAt } = useStaysDraft(property);

  // ── Step cursor (URL slugs, resuming at the draft's furthest step) ─────
  const querySection = searchParams.get("section");
  const queryStep = searchParams.get("step");
  const hasStepParams = Boolean(querySection && queryStep);
  const stepIndex = hasStepParams
    ? getStaysStepIndex(querySection, queryStep)
    : Math.min(draft?.step || 0, STAYS_BUILDER_STEP_COUNT - 1);
  const stepMeta = STAYS_BUILDER_STEPS[stepIndex];
  const completedCount = Math.min(draft?.step || 0, STAYS_BUILDER_STEP_COUNT);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  const goToStep = (index, direction = 1) => {
    const meta = STAYS_BUILDER_STEPS[index];
    if (!meta) return;
    setStepDirection(direction);
    setStepError("");
    setSearchParams({ section: meta.sectionId, step: meta.stepId }, { replace: true });
  };

  // ── Validation — the rules the builder always had, per step ────────────
  const validateStepAt = (index, value) => {
    switch (index) {
      case 0:
        return !value.name || value.name === "Untitled property"
          ? "Add a property name to continue"
          : "";
      case 2:
        return !value.city || !value.address ? "Add a city and street address" : "";
      case 4:
        return !value.rooms?.length ? "Add at least one room or unit" : "";
      case 5:
        return (value.rooms || []).some(
          (room) => !(value.ratePlans || []).some((plan) => plan.roomId === room.id),
        )
          ? "Add a rate plan for each room"
          : "";
      case 6:
        return !value.start ? "Choose the first bookable date" : "";
      default:
        return "";
    }
  };

  const handleNext = () => {
    const error = validateStepAt(stepIndex, draft);
    if (error) {
      setStepError(error);
      toast.error(error);
      return;
    }
    patch({ step: Math.max(draft.step || 0, stepIndex + 1) });
    goToStep(Math.min(stepIndex + 1, STAYS_BUILDER_STEP_COUNT - 1), 1);
  };

  const handleBack = () => goToStep(Math.max(0, stepIndex - 1), -1);

  const handleSelectStep = (index) => {
    if (index > Math.max(completedCount, stepIndex)) return;
    goToStep(index, index > stepIndex ? 1 : -1);
  };

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
      const error = validateStepAt(index, draft);
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
  if (!draft || isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <RefreshCw className="animate-spin text-slate-400" size={20} />
      </div>
    );
  }

  const StepBody = STEP_COMPONENTS[stepIndex];

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

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:ml-6">
            <div ref={contentRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
              <h2 className="mb-1 text-lg font-bold tracking-tight sm:mb-1.5 sm:text-xl">{stepMeta.label}</h2>
              <p className="mb-4 text-sm text-slate-500 sm:mb-6">{stepMeta.hint}</p>
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
                  >
                    <StepBody
                      property={draft}
                      patch={patch}
                      onAddRoom={() => setRoomModal({ openKey: Date.now() })}
                      onEditRoom={(room) => setRoomModal({ room, openKey: Date.now() })}
                      onAddPlan={(room) => setPlanModal({ room, openKey: Date.now() })}
                      onEditPlan={(room, plan) => setPlanModal({ room, plan, openKey: Date.now() })}
                      onAddPhotos={(dataUrls) => addPhotosMutation.mutateAsync(dataUrls)}
                      onRemovePhoto={(index) => removePhotoMutation.mutateAsync(index)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <PropertyBuilderFooter
              stepNumber={stepIndex + 1}
              totalSteps={STAYS_BUILDER_STEP_COUNT}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
              error={stepError}
              saving={isSaving}
              submitting={submitMutation.isPending}
              lastSavedAt={lastSavedAt}
            />
          </div>
        </div>
      </div>

      <RoomModal
        key={roomModal?.openKey}
        open={Boolean(roomModal)}
        room={roomModal?.room}
        onClose={() => setRoomModal(null)}
        onSave={(room) => saveRoomMutation.mutateAsync(room)}
      />

      <RatePlanModal
        key={planModal?.openKey}
        open={Boolean(planModal)}
        room={planModal?.room}
        plan={planModal?.plan}
        onClose={() => setPlanModal(null)}
        onSave={(plan) => savePlanMutation.mutateAsync(plan)}
        onDelete={(plan) => deletePlanMutation.mutateAsync(plan)}
      />

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
