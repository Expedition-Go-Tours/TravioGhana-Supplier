import { Calendar, Check, ListChecks, Users } from "lucide-react";
import { toast } from "sonner";
import StaysButton from "../components/StaysButton";

/**
 * STEP 16 — the closing screen: "That's it!" with the three reassurance
 * questions, the two certifications, and the Open for bookings / I'm not
 * ready actions. The reference's blue accents are the stays emerald.
 *
 * The certifications map onto the existing `agreement` flags, so the builder's
 * final validation and the mock submit keep working. The step owns its own
 * chrome (no back arrow — navigation stays in the sidebar).
 */

const FAQS = [
  {
    icon: Calendar,
    question: "Can I decide when I get bookings?",
    answer:
      "Yes. The best way to do this is to keep your calendar up-to-date. Close any dates you don't want a booking on. If you have bookings on other sites, close these dates as well.",
  },
  {
    icon: ListChecks,
    question: "Are bookings confirmed straight away?",
    answer: "Yes. They're confirmed as soon as a guest makes a booking.",
  },
  {
    icon: Users,
    question: "Can I choose who stays at my place?",
    answer:
      "No. If a date is open in your calendar, all guests using our site can book it.",
  },
];

function CertificationRow({ checked, onToggle, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border-2 text-white transition-colors ${
          checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 md:text-base">
        {children}
      </span>
    </label>
  );
}

export default function Step16Review({
  property,
  patch,
  onSubmit,
  onExit,
  submitting = false,
}) {
  const agreement = property.agreement || {};
  const certifyBusiness = Boolean(agreement.certifyBusiness);
  const certifyTerms = Boolean(agreement.certifyTerms);
  const canSubmit = certifyBusiness && certifyTerms && !submitting;

  const setCert = (key, value) => patch({ agreement: { ...agreement, [key]: value } });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        That&apos;s it! You&apos;ve done everything you need to before your first guest stays.
      </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-8">
        <p className="text-sm text-slate-600 md:text-base">
          Some important information before you list your property on TravioGhana
        </p>

        <div className="mt-6 space-y-6">
          {FAQS.map(({ icon: Icon, question, answer }) => (
            <div key={question} className="flex items-start gap-4">
              <Icon
                size={28}
                strokeWidth={1.6}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-800"
              />
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 md:text-lg">{question}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">
                  {answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <CertificationRow
            checked={certifyBusiness}
            onToggle={() => setCert("certifyBusiness", !certifyBusiness)}
          >
            I certify that this is a legitimate accommodation business with all necessary licenses
            and permits, which can be shown upon first request. TravioGhana reserves the right to
            verify and investigate any details provided in this registration.
          </CertificationRow>

          <CertificationRow
            checked={certifyTerms}
            onToggle={() => setCert("certifyTerms", !certifyTerms)}
          >
            I have read, accepted, and agreed to the{" "}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                toast("General Delivery Terms are coming soon");
              }}
              className="font-medium text-slate-800 underline underline-offset-2 hover:text-emerald-700"
            >
              General Delivery Terms
            </button>
            .
          </CertificationRow>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <StaysButton
          variant="primary"
          className="h-14 w-full text-base"
          disabled={!canSubmit}
          onClick={() => onSubmit?.()}
        >
          {submitting ? "Opening…" : "Open for bookings"}
        </StaysButton>
        <button
          type="button"
          onClick={() => onExit?.()}
          className="mx-auto block text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 md:text-base"
        >
          I&apos;m not ready
        </button>
      </div>
    </div>
  );
}
