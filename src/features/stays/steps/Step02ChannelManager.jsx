import { ChevronLeft, Info } from "lucide-react";
import StaysButton from "../components/StaysButton";

/**
 * STEP 2 — Channel manager. Booking's "Connect to a channel manager" page:
 * the large page heading, then the question and explanation in a bordered
 * card with the two answers as divider-separated rows. Choosing "Yes" reveals
 * the amber notice from the reference; it only records the answer — the
 * connection details come after registration.
 *
 * The step owns its reference footer (back arrow + Continue). Continue flushes
 * the draft first, so the answer is saved before the builder advances.
 *
 * "No" is the default, matching the reference and a draft's
 * `channelManager.connected: false`.
 */
function OptionRow({ label, checked, onSelect, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-4 px-5 py-6 transition-colors hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-emerald-500/30 md:px-8 md:py-7">
      <input type="radio" name="channelManager" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
          checked ? "border-emerald-600" : "border-slate-400"
        }`}
      >
        {checked && <span className="h-3 w-3 rounded-full bg-emerald-600" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base text-slate-800 md:text-lg">{label}</span>
        {checked && children}
      </span>
    </label>
  );
}

/** The amber note that appears under the "Yes" answer. */
function ConnectLaterNotice() {
  return (
    <span className="mt-4 flex items-start gap-3 rounded-xl border border-orange-400/70 bg-orange-50/60 px-4 py-3.5">
      <Info size={18} className="mt-0.5 shrink-0 text-slate-700" aria-hidden="true" />
      <span className="text-sm leading-relaxed text-slate-700 md:text-base">
        Select &lsquo;Yes&rsquo; only if you are already using a channel manager. You&apos;ll be
        able to connect your channel manager after your registration is complete &ndash; please
        continue to the next step.
      </span>
    </span>
  );
}

export default function Step02ChannelManager({ property, patch, onBack, onNext, onSave, saving = false }) {
  const connected = property.channelManager?.connected ?? false;
  const choose = (value) =>
    patch({ channelManager: { ...(property.channelManager || {}), connected: value } });

  const handleContinue = async () => {
    if (saving) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the standard
      // builder footer does.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        Connect to a channel manager
      </h1>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white md:mt-10">
        <div className="border-b border-slate-200 px-5 py-6 md:px-8 md:py-7">
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">
            Do you want to connect this listing to your channel manager?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
            A channel manager is a third-party tool that lets you manage rates and availability
            across different sites you might list your place on, including TravioGhana. If
            you&apos;re already using a channel manager, you can select &lsquo;Yes&rsquo; to
            connect it to your listing.
          </p>
        </div>

        <div
          className="divide-y divide-slate-200"
          role="radiogroup"
          aria-label="Do you want to connect this listing to your channel manager?"
        >
          <OptionRow
            label="Yes, I will connect this listing to my channel manager"
            checked={connected === true}
            onSelect={() => choose(true)}
          >
            <ConnectLaterNotice />
          </OptionRow>
          <OptionRow
            label="No, I won't be using a channel manager at this time"
            checked={connected === false}
            onSelect={() => choose(false)}
          />
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
          disabled={saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
