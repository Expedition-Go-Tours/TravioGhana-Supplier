import { useState } from "react";
import { ChevronLeft, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import StaysButton from "../components/StaysButton";
import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";

/**
 * STEP 15 — Availability, Booking's "Availability" page: the first bookable
 * date, the auto-open window, the calendar import and the 30+ night stays
 * question, next to two dismissible tips cards. The reference's blue accents
 * are the stays emerald. The step owns its reference footer (back arrow +
 * Continue); Continue stays disabled until the 30+ nights question is
 * answered and saves the draft before advancing.
 */

const CALENDAR_WINDOWS = ["90 days", "180 days", "365 days", "545 days"];
const CALENDAR_SOURCES = [
  { label: "Airbnb", href: "https://www.airbnb.com" },
  { label: "Agoda", href: "https://www.agoda.com" },
  { label: "Expedia", href: "https://www.expedia.com" },
  { label: "VRBO", href: "https://www.vrbo.com" },
];

function TipCard({ title, dismissLabel, onDismiss, children }) {
  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 md:p-7">
      <div className="flex items-start gap-3 md:gap-4">
        <Lightbulb size={28} className="mt-0.5 shrink-0 text-slate-800" aria-hidden="true" />
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

function RadioOption({ name, label, checked, onSelect, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
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

export default function Step15Availability({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const [calendarTipsOpen, setCalendarTipsOpen] = useState(true);
  const [changeTipsOpen, setChangeTipsOpen] = useState(true);

  const startMode = property.startMode || "asap";
  const calendarWindow = property.calendarWindow || "365 days";
  const calendarImport = property.calendarImport || { mode: "import", url: "" };
  const longStays = property.longStays ?? null;

  const canContinue =
    Boolean(longStays) && (startMode === "asap" || Boolean(property.start));

  const setImport = (changes) =>
    patch({ calendarImport: { ...calendarImport, ...changes } });

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
        Availability
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* First date */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              When is the first date that guests can check in?
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2" role="radiogroup" aria-label="When is the first date that guests can check in?">
              <label className="flex cursor-pointer items-center gap-3 py-1.5">
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "asap"}
                  onChange={() => patch({ startMode: "asap" })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    startMode === "asap" ? "border-emerald-600" : "border-slate-400"
                  }`}
                >
                  {startMode === "asap" && <span className="h-3 w-3 rounded-full bg-emerald-600" />}
                </span>
                <span className="text-base text-slate-800">As soon as possible</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 py-1.5">
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "date"}
                  onChange={() => patch({ startMode: "date" })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    startMode === "date" ? "border-emerald-600" : "border-slate-400"
                  }`}
                >
                  {startMode === "date" && <span className="h-3 w-3 rounded-full bg-emerald-600" />}
                </span>
                <span className="text-base text-slate-800">On a specific date</span>
              </label>
            </div>

            {startMode === "date" && (
              <div className="mt-4 max-w-xs">
                <StaysField label="First date guests can check in">
                  <StaysInput
                    type="date"
                    value={property.start || ""}
                    onChange={(event) => patch({ start: event.target.value })}
                  />
                </StaysField>
              </div>
            )}
          </section>

          {/* Calendar window */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              How far in advance do you want to keep your calendar bookable?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
              Set your calendar to automatically open new dates, so you don&apos;t have to manually
              add availability. You can always change or switch this off later.
            </p>
            <div className="mt-5 max-w-xs">
              <StaysField label="Show availability for up to:">
                <StaysSelect
                  options={CALENDAR_WINDOWS}
                  value={calendarWindow}
                  onChange={(event) => patch({ calendarWindow: event.target.value })}
                />
              </StaysField>
            </div>
          </section>

          {/* Calendar sync */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              Sync your availability with another website
            </h2>
            <p className="mt-1.5 text-sm text-emerald-700 md:text-base">
              Avoid double bookings and become bookable up to 80% faster by importing your
              availability calendar.
            </p>

            <div className="mt-3" role="radiogroup" aria-label="Sync your availability with another website">
              <RadioOption
                name="calendarImport"
                label="Import availability calendar"
                checked={calendarImport.mode === "import"}
                onSelect={() => setImport({ mode: "import" })}
              >
                <span className="mt-3 block rounded-xl border border-slate-200 p-4">
                  <label
                    htmlFor="calendar-url"
                    className="block text-sm font-medium text-slate-800 md:text-base"
                  >
                    Paste your calendar link here
                  </label>
                  <span className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="calendar-url"
                      type="url"
                      value={calendarImport.url || ""}
                      onChange={(event) => setImport({ url: event.target.value })}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 md:text-base"
                    />
                    <button
                      type="button"
                      disabled={!calendarImport.url?.trim()}
                      onClick={() => toast.success("Calendar import will run after registration")}
                      className="h-11 shrink-0 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 md:text-base"
                    >
                      Import
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => toast("Calendar link guides are on the right")}
                    className="mt-3 block text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                  >
                    Where to find calendar links
                  </button>
                </span>
              </RadioOption>

              <RadioOption
                name="calendarImport"
                label="Skip"
                checked={calendarImport.mode === "skip"}
                onSelect={() => setImport({ mode: "skip" })}
              />
            </div>
          </section>

          {/* Long stays */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              Do you want to allow 30+ night stays?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
              Allowing guests to stay for up to 90 nights can help you fill your calendar and tap
              into the trend of guests working remotely.
            </p>
            <h3 className="mt-5 text-base font-bold text-slate-900 md:text-lg">
              Will you accept reservations for stays over 30 nights?
            </h3>
            <div className="mt-3 flex items-center gap-6" role="radiogroup" aria-label="Will you accept reservations for stays over 30 nights?">
              {[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ].map(({ label, value }) => {
                const checked = longStays === value;
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30"
                  >
                    <input
                      type="radio"
                      name="longStays"
                      checked={checked}
                      onChange={() => patch({ longStays: value })}
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
                    <span className="text-base text-slate-800">{label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* Tips column */}
        <div className="space-y-5 lg:col-span-1">
          {calendarTipsOpen && (
            <TipCard
              title="Where to find calendar links"
              dismissLabel="Dismiss calendar tips"
              onDismiss={() => setCalendarTipsOpen(false)}
            >
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                To import your availability, select the website where your property is listed to
                find your calendar link.
              </p>
              <ul className="mt-3 space-y-2">
                {CALENDAR_SOURCES.map((source) => (
                  <li key={source.label}>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800 md:text-base"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </TipCard>
          )}

          {changeTipsOpen && (
            <TipCard
              title="What if I want to change my selection later on?"
              dismissLabel="Dismiss change tips"
              onDismiss={() => setChangeTipsOpen(false)}
            >
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                Your selection here isn&apos;t final. You can always change it by heading to the
                Policies section after you&apos;ve registered.
              </p>
              <button
                type="button"
                onClick={() => toast("More about 30+ night stays is coming soon")}
                className="mt-3 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800 md:text-base"
              >
                Read more about 30+ night stays
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
          disabled={!canContinue || saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
