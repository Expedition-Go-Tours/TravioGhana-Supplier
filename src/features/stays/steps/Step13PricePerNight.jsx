import { useState } from "react";
import { Check, ChevronLeft, Info, Lightbulb, ThumbsDown, ThumbsUp, X } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysField, StaysSelect } from "../components/StaysForm";
import { formatMoney } from "../utils/money";

/**
 * STEP 13 — Price per night, Booking's "Price per night" page: the
 * competitive-range guidance, the nightly price input with the commission
 * breakdown and earnings, and the 20% launch promotion, next to the two
 * dismissible tips cards. The reference's blue accents are the stays emerald.
 * The step owns its reference footer (back arrow + Continue), which saves the
 * draft before advancing.
 */

const COMMISSION_RATE = 0.15;
const DISCOUNT_RATE = 0.2;
const COMPARABLE_RANGE = { min: 120, median: 402, max: 673 };
const CURRENCIES = ["GHS", "USD", "EUR", "GBP"];
const COMMISSION_POINTS = [
  "24/7 help in your language",
  "Save time with automatically confirmed bookings",
  "We promote your place on Google",
];

function TipCard({ icon: Icon, title, dismissLabel, onDismiss, children }) {
  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 md:p-7">
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

export default function Step13PricePerNight({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const [helpful, setHelpful] = useState(null);
  const [priceTipsOpen, setPriceTipsOpen] = useState(true);
  const [promoTipsOpen, setPromoTipsOpen] = useState(true);

  const priceValue = property.pricePerNight ?? "29.00";
  const price = Number(priceValue) || 0;
  const currency = property.currency || "GHS";
  const earnings = price * (1 - COMMISSION_RATE);
  const discounted = price * (1 - DISCOUNT_RATE);
  const promotion = property.promotion ?? true;

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
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        Price per night
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Competitive range */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <p className="text-base text-slate-800 md:text-lg">
              <strong className="font-bold">
                Make your price competitive to increase your chances of getting more bookings.
              </strong>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
              This is the price range for properties similar to yours.{" "}
              <button
                type="button"
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                Learn more
              </button>
            </p>

            <div className="mt-7">
              <div className="mx-auto w-fit rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
                Median: {formatMoney(COMPARABLE_RANGE.median, currency)}
              </div>
              <input
                type="range"
                aria-label="Price range for similar properties"
                min={COMPARABLE_RANGE.min}
                max={COMPARABLE_RANGE.max}
                step="1"
                value={Math.min(Math.max(price || COMPARABLE_RANGE.median, COMPARABLE_RANGE.min), COMPARABLE_RANGE.max)}
                onChange={(event) => patch({ pricePerNight: Number(event.target.value).toFixed(2) })}
                className="mt-3 w-full accent-emerald-600"
              />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white">
                  {formatMoney(COMPARABLE_RANGE.min, currency)}
                </span>
                <span className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white">
                  {formatMoney(COMPARABLE_RANGE.max, currency)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:text-base">
              Did this help you decide on a price?
              <button
                type="button"
                aria-label="Yes, this helped"
                aria-pressed={helpful === "yes"}
                onClick={() => setHelpful("yes")}
                className={`rounded-lg p-1.5 transition-colors hover:bg-slate-100 ${
                  helpful === "yes" ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                <ThumbsUp size={18} />
              </button>
              <button
                type="button"
                aria-label="No, this did not help"
                aria-pressed={helpful === "no"}
                onClick={() => setHelpful("no")}
                className={`rounded-lg p-1.5 transition-colors hover:bg-slate-100 ${
                  helpful === "no" ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                <ThumbsDown size={18} />
              </button>
            </div>
          </section>

          {/* Price input & commission */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              How much do you want to charge per night?
            </h2>

            <div className="mt-5 max-w-xs">
              <StaysField label="Currency you receive payments in">
                <StaysSelect
                  options={CURRENCIES}
                  value={currency}
                  onChange={(event) => patch({ currency: event.target.value })}
                />
              </StaysField>
            </div>

            <div className="mt-5">
              <label
                htmlFor="price-per-night"
                className="text-sm font-medium text-slate-800 md:text-base"
              >
                Price guests pay
              </label>
              <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20">
                <span className="pl-3 text-sm text-slate-500">{currency}</span>
                <input
                  id="price-per-night"
                  inputMode="decimal"
                  value={priceValue}
                  onChange={(event) => patch({ pricePerNight: event.target.value })}
                  className="h-11 w-full border-0 bg-transparent px-3 text-base text-slate-900 outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 md:text-sm">
                Including taxes, commission and charges
              </p>
            </div>

            <div className="mt-6">
              <p className="text-base text-slate-800 md:text-lg">
                <span className="font-semibold">15.00%</span> TravioGhana commission
              </p>
              <ul className="mt-3 space-y-2 pl-10">
                {COMMISSION_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700 md:text-base">
                    <Check
                      size={16}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-emerald-700"
                    />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-slate-200 pt-4 text-base text-slate-800 md:text-lg">
                <span className="font-semibold">{formatMoney(earnings, currency)}</span> Your earnings
                (including taxes)
              </div>
            </div>
          </section>

          {/* Launch promotion */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <label className="flex cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
              <input
                type="checkbox"
                checked={promotion}
                onChange={(event) => patch({ promotion: event.target.checked })}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border-2 text-white transition-colors ${
                  promotion ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                }`}
              >
                {promotion && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="text-base font-bold text-slate-900 md:text-lg">
                Get guests&apos; attention with a 20% discount
              </span>
            </label>

            <p className="mt-3 pl-9 text-sm leading-relaxed text-slate-700 md:text-base">
              Give 20% off on your first 3 bookings or 90 days, whichever comes first.{" "}
              <button
                type="button"
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                Learn more
              </button>
            </p>

            <div className="mt-4 border-t border-slate-200 pt-4 pl-9 text-base md:text-lg">
              <span className="text-slate-400 line-through">{formatMoney(price, currency)}</span>{" "}
              <span className="font-bold text-emerald-700">
                {formatMoney(discounted, currency)} per night
              </span>
            </div>
          </section>
        </div>

        {/* Tips column */}
        <div className="space-y-5 lg:col-span-1">
          {priceTipsOpen && (
            <TipCard
              icon={Lightbulb}
              title="What if I'm not sure about my price?"
              dismissLabel="Dismiss price tips"
              onDismiss={() => setPriceTipsOpen(false)}
            >
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                Don&apos;t worry, you can always change it later. You can even set weekend, midweek
                and seasonal prices, giving you more control over what you earn.
              </p>
            </TipCard>
          )}

          {promoTipsOpen && (
            <TipCard
              icon={Info}
              title="Rules for setting up a promotion"
              dismissLabel="Dismiss promotion tips"
              onDismiss={() => setPromoTipsOpen(false)}
            >
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                Make sure you&apos;re giving a genuine discount. When you set up a promotion on
                TravioGhana, it must represent a genuine discount for your guests, in accordance
                with consumer protection regulations.
              </p>
              <button
                type="button"
                className="mt-3 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800 md:text-base"
              >
                Learn more
              </button>
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
          disabled={saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
