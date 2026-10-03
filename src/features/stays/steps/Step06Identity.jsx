import { useState } from "react";
import { ChevronLeft, Lightbulb, ThumbsUp, X } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysField, StaysInput } from "../components/StaysForm";

/**
 * STEP 6 — Property name, Booking's "What's the name of your place?" page:
 * the large heading, the name field in a card, and two dismissible tips cards
 * (what to consider, why it matters). The step owns its reference footer
 * (back arrow + Continue); Continue stays disabled until a name is typed and
 * saves the draft before advancing.
 */
function TipCard({ icon: Icon, title, dismissLabel, onDismiss, children }) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
      <div className="flex items-start gap-3 md:gap-4">
        <Icon size={28} className="mt-0.5 shrink-0 text-slate-800" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 text-lg font-bold leading-snug text-slate-900 md:text-xl">
          {title}
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

export default function Step06Identity({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const [showChoosingTips, setShowChoosingTips] = useState(true);
  const [showWhyTips, setShowWhyTips] = useState(true);

  const name = property.name === "Untitled property" ? "" : property.name || "";
  const canContinue = name.trim().length > 0;

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the builder.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        What&apos;s the name of your place?
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:mt-10 lg:grid-cols-3">
        {/* Name card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7 lg:col-span-2">
          <StaysField label="Property name">
            <StaysInput
              value={name}
              onChange={(event) => patch({ name: event.target.value })}
              autoFocus
            />
          </StaysField>
        </div>

        {/* Tips column */}
        <div className="space-y-5 lg:col-span-1">
          {showChoosingTips && (
            <TipCard
              icon={ThumbsUp}
              title="What should I consider when choosing a name?"
              dismissLabel="Dismiss name tips"
              onDismiss={() => setShowChoosingTips(false)}
            >
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 md:text-base">
                <li>Keep it short and catchy</li>
                <li>Avoid abbreviations</li>
                <li>Stick to the facts</li>
              </ul>
            </TipCard>
          )}

          {showWhyTips && (
            <TipCard
              icon={Lightbulb}
              title="Why do I need to name my property?"
              dismissLabel="Dismiss naming help"
              onDismiss={() => setShowWhyTips(false)}
            >
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                This is the name that will appear as the title of your listing on our site. It
                should tell guests something specific about your place, where it is or what you
                offer. This will be visible to anyone visiting our site, so don&apos;t include your
                address in the name.
              </p>
            </TipCard>
          )}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3">
        <StaysButton
          aria-label="Back"
          onClick={() => onBack?.()}
          className="h-14 w-14 shrink-0 p-0"
        >
          <ChevronLeft size={20} />
        </StaysButton>
        <StaysButton
          variant="primary"
          className="h-14 flex-1 text-base"
          disabled={!canContinue || saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
