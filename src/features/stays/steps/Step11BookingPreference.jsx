import { Check, ChevronLeft, Info } from "lucide-react";
import StaysButton from "../components/StaysButton";

/**
 * STEP 11 — How you receive bookings, Booking's "How you receive bookings"
 * page: the safety assurance checklist, then the instant-vs-request choice
 * with the "Recommended" tag on instant bookings. The reference's blue
 * accents are the stays emerald. The step owns its reference footer (back
 * arrow + Continue), which saves the draft before advancing.
 */

const SAFETY_POINTS = [
  "Set house rules guest must agree to before they stay",
  "Request damage deposits for extra security",
  "Report guest misconduct if something goes wrong",
  "Receive protection against liability claims from guests and neighbours up to US$1,000,000 for every reservation",
];

const OPTIONS = [
  { value: "instant", label: "All guests can book instantly", recommended: true },
  { value: "request", label: "All guests will need to request to book" },
];

export default function Step11BookingPreference({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const preference = property.bookingPreference || "instant";
  const propertyType = property.type || "Property";
  const question = `How can guests book your ${propertyType.toLowerCase()}?`;

  const handleContinue = async () => {
    if (saving) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the builder.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        How you receive bookings
      </h1>

      <div className="mt-8 space-y-5 md:mt-10">
        {/* Safety assurance */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-bold text-slate-900 md:text-lg">
            We&apos;re here to ensure you can receive bookings safely:
          </h2>
          <ul className="mt-4 space-y-3">
            {SAFETY_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check
                  size={18}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-emerald-700"
                />
                <span className="text-base text-slate-800">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Booking preference */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-bold text-slate-900 md:text-lg">{question}</h2>
          <div className="mt-3" role="radiogroup" aria-label={question}>
            {OPTIONS.map((option) => {
              const checked = preference === option.value;
              return (
                <label
                  key={option.value}
                  className="flex w-fit cursor-pointer items-center gap-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30"
                >
                  <input
                    type="radio"
                    name="bookingPreference"
                    checked={checked}
                    onChange={() => patch({ bookingPreference: option.value })}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                      checked ? "border-emerald-600" : "border-slate-400"
                    }`}
                  >
                    {checked && <span className="h-3 w-3 rounded-full bg-emerald-600" />}
                  </span>
                  <span className="text-base text-slate-800 md:text-lg">
                    {option.label}
                    {option.recommended && (
                      <span className="ml-2 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Recommended
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Requiring requests explains the enquiry/request flow and warns. */}
        {preference === "request" && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
              <div className="flex items-start gap-3">
                <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-base text-slate-800">
                    Guests searching for a stay more than 48 hours in the future will be able to
                    find your property and select one of two options:
                  </p>
                  <ol className="mt-4 list-decimal space-y-3 pl-6 text-base text-slate-800">
                    <li>
                      <strong className="font-bold">Enquiries</strong> do not include an upfront
                      commitment to pay. You have 24 hours to respond. If you pre-approve their
                      dates, the guest has 24 hours to finish booking their stay.
                    </li>
                    <li>
                      <strong className="font-bold">Requests</strong> include a commitment to pay,
                      blocking the dates on your calendar. You have 24 hours to accept or decline.
                      As soon as you accept, the booking is confirmed. If you decline, the dates
                      are immediately unblocked.
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-orange-400/80 bg-orange-50/60 p-5 md:p-7">
              <h3 className="text-base font-bold text-slate-900 md:text-lg">
                Are you sure you want to require your guests to request to book?
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-800">
                Properties that require &ldquo;request to book&rdquo; have fewer confirmed bookings
                and a longer time until their first booking. They also require more operational
                workload, as you&apos;ll need to respond to each enquiry.
              </p>
            </div>
          </>
        )}
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
