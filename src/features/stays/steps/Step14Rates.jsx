import { useState } from "react";
import { CheckCircle2, ChevronLeft, Info, Users } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysInput, StaysSelect } from "../components/StaysForm";
import { formatMoney } from "../utils/money";

/**
 * STEP 14 — Rate plans, Booking's "Rate plans" page: the suggestion intro
 * then the four recommended plans (Standard, Child prices for families,
 * Non-refundable, Weekly) as summary cards with Edit toggles that reveal the
 * fields driving each summary. The reference's blue accents are the stays
 * emerald. The step owns its reference footer (back arrow + Continue), which
 * saves the draft before advancing.
 */

const CANCELLATION_OPTIONS = [
  "Free up to 1 day before arrival",
  "Free up to 7 days before arrival",
  "Free up to 30 days before arrival",
];

const DEFAULT_SETTINGS = {
  standard: {
    cancellation: "Free up to 1 day before arrival",
    twoGuests: 29,
    oneGuest: 26.1,
  },
  child: { free: true, maxAge: 17 },
  nonRefundable: { discount: 10 },
  weekly: { discount: 15, minNights: 7 },
};

function PlanCard({ title, editing, onToggleEdit, children, editor }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-900 md:text-lg">
          <span className="min-w-0">{title}</span>
          <Info size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
        </h3>
        <button
          type="button"
          onClick={onToggleEdit}
          className="shrink-0 rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div className="px-5 pb-4 md:px-6 md:pb-5">{children}</div>
      {editing && (
        <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 px-5 py-4 md:px-6">
          {editor}
        </div>
      )}
    </section>
  );
}

function PlanBullet({ children }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-800 md:text-base">
      <CheckCircle2
        size={20}
        strokeWidth={1.6}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-slate-700"
      />
      <span>{children}</span>
    </li>
  );
}

function Hint({ children }) {
  return <p className="text-sm leading-relaxed text-emerald-700 md:text-base">{children}</p>;
}

export default function Step14Rates({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const settings = property.ratePlanSettings || {};
  const standard = { ...DEFAULT_SETTINGS.standard, ...settings.standard };
  const child = { ...DEFAULT_SETTINGS.child, ...settings.child };
  const nonRefundable = { ...DEFAULT_SETTINGS.nonRefundable, ...settings.nonRefundable };
  const weekly = { ...DEFAULT_SETTINGS.weekly, ...settings.weekly };

  const [editing, setEditing] = useState(null);

  const save = (changes) =>
    patch({
      ratePlanSettings: { standard, child, nonRefundable, weekly, ...changes },
    });

  const freeUntil = standard.cancellation.replace("Free up to ", "");
  const toggleEdit = (key) => setEditing((current) => (current === key ? null : key));

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
        Rate plans
      </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-6">
        <p className="text-sm leading-relaxed text-slate-700 md:text-base">
          To attract a wider range of guests, we suggest setting up multiple rate plans. The
          recommended prices and policies for each plan are based on data from properties like
          yours, but they can be edited now or after you complete registration.
        </p>
      </div>

      {/* Standard rate plan */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 md:text-xl">Standard rate plan</h2>

      <div className="mt-4 space-y-4">
        <PlanCard
          title="Cancellation policy"
          editing={editing === "standard-cancellation"}
          onToggleEdit={() => toggleEdit("standard-cancellation")}
          editor={
            <StaysSelect
              aria-label="Cancellation policy"
              options={CANCELLATION_OPTIONS}
              value={standard.cancellation}
              onChange={(event) =>
                save({ standard: { ...standard, cancellation: event.target.value } })
              }
            />
          }
        >
          <Hint>
            You&apos;re 91% more likely to get bookings with the pre-selected cancellation policy
            settings than with a 30-day cancellation policy
          </Hint>
          <ul className="mt-4 space-y-3">
            <PlanBullet>Guests can cancel their bookings for free up to {freeUntil}</PlanBullet>
            <PlanBullet>
              Guests who cancel within 24 hours will have their cancellation fee waived
            </PlanBullet>
          </ul>
        </PlanCard>

        <PlanCard
          title="Price per group size"
          editing={editing === "standard-occupancy"}
          onToggleEdit={() => toggleEdit("standard-occupancy")}
          editor={
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Price for 2 guests
                </label>
                <StaysInput
                  inputMode="decimal"
                  value={String(standard.twoGuests)}
                  onChange={(event) =>
                    save({ standard: { ...standard, twoGuests: Number(event.target.value) || 0 } })
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Price for 1 guest
                </label>
                <StaysInput
                  inputMode="decimal"
                  value={String(standard.oneGuest)}
                  onChange={(event) =>
                    save({ standard: { ...standard, oneGuest: Number(event.target.value) || 0 } })
                  }
                />
              </div>
            </div>
          }
        >
          <Hint>
            You&apos;re 12% more likely to get bookings if you set lower prices for smaller groups
            of guests
          </Hint>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-900 md:text-base">
              <span>Occupancy</span>
              <span>Guests pay</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-800 md:text-base">
                <span className="flex items-center gap-2">
                  <Users size={16} aria-hidden="true" className="text-slate-500" />× 2
                </span>
                <span>{formatMoney(standard.twoGuests)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-800 md:text-base">
                <span className="flex items-center gap-2">
                  <Users size={16} aria-hidden="true" className="text-slate-500" />× 1
                </span>
                <span>{formatMoney(standard.oneGuest)}</span>
              </div>
            </div>
          </div>
        </PlanCard>
      </div>

      {/* Child prices */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 md:text-xl">Child prices for families</h2>
      <div className="mt-4">
        <PlanCard
          title="Prices and age group"
          editing={editing === "child"}
          onToggleEdit={() => toggleEdit("child")}
          editor={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800 md:text-base">
                <input
                  type="checkbox"
                  checked={child.free}
                  onChange={(event) => save({ child: { ...child, free: event.target.checked } })}
                  className="h-4 w-4 accent-emerald-600"
                />
                Children stay for free
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Children age up to
                </label>
                <StaysInput
                  inputMode="numeric"
                  value={String(child.maxAge)}
                  onChange={(event) =>
                    save({ child: { ...child, maxAge: Number(event.target.value) || 0 } })
                  }
                />
              </div>
            </div>
          }
        >
          <Hint>
            Setting competitive children rates can lead to a 15% increase in family bookings
          </Hint>
          <p className="mt-3 text-sm font-bold text-emerald-700 md:text-base">
            A special badge will highlight your property.
          </p>
          <ul className="mt-4">
            <PlanBullet>
              {child.free
                ? `Children stay for free (up to ${child.maxAge} years old)`
                : "Children pay the standard rate"}
            </PlanBullet>
          </ul>
        </PlanCard>
      </div>

      {/* Non-refundable */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 md:text-xl">Non-refundable rate plan</h2>
      <div className="mt-4">
        <PlanCard
          title="Price and cancellation policy"
          editing={editing === "non-refundable"}
          onToggleEdit={() => toggleEdit("non-refundable")}
          editor={
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">
                Discount vs the standard rate (%)
              </label>
              <StaysInput
                inputMode="numeric"
                value={String(nonRefundable.discount)}
                onChange={(event) =>
                  save({
                    nonRefundable: { ...nonRefundable, discount: Number(event.target.value) || 0 },
                  })
                }
              />
            </div>
          }
        >
          <ul className="space-y-3">
            <PlanBullet>
              Guests will pay {nonRefundable.discount}% less than the standard rate for a
              non-refundable rate
            </PlanBullet>
            <PlanBullet>Guests cannot cancel their bookings for free at any time</PlanBullet>
          </ul>
        </PlanCard>
      </div>

      {/* Weekly */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 md:text-xl">Weekly rate plan</h2>
      <div className="mt-4">
        <PlanCard
          title="Price and cancellation policy"
          editing={editing === "weekly"}
          onToggleEdit={() => toggleEdit("weekly")}
          editor={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Weekly discount (%)
                </label>
                <StaysInput
                  inputMode="numeric"
                  value={String(weekly.discount)}
                  onChange={(event) =>
                    save({ weekly: { ...weekly, discount: Number(event.target.value) || 0 } })
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  Minimum nights
                </label>
                <StaysInput
                  inputMode="numeric"
                  value={String(weekly.minNights)}
                  onChange={(event) =>
                    save({ weekly: { ...weekly, minNights: Number(event.target.value) || 0 } })
                  }
                />
              </div>
            </div>
          }
        >
          <Hint>
            You&apos;re 16% more likely to get bookings with the {weekly.discount}% pre-selected
            weekly rate than with none
          </Hint>
          <ul className="mt-4 space-y-3">
            <PlanBullet>
              Guests will pay {weekly.discount}% less than the standard rate when they book for at
              least {weekly.minNights} nights
            </PlanBullet>
            <PlanBullet>
              Guests can cancel their bookings for free up to {freeUntil} (based on the standard
              rate cancellation policy)
            </PlanBullet>
          </ul>
        </PlanCard>
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
