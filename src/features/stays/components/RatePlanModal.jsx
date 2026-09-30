import { useState } from "react";
import { toast } from "sonner";
import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import {
  CANCELLATION_TERMS,
  LATE_CANCELLATION_CHARGES,
  MEAL_PLANS,
  NO_SHOW_CHARGES,
  PRICING_MODELS,
} from "../config/constants";
import { defaultPlanForRoom, planPrice } from "../utils/ratePlans";
import { formatMoney } from "../utils/money";

/**
 * Create/edit a rate plan — the prototype's wide modal, with its four
 * sections, conditional fields and validation. Fixed vs derived pricing swaps
 * the price inputs; the free-cancellation cutoff only appears for
 * "Free cancellation" plans, exactly like the prototype's `data-*-mode` CSS.
 */
function PlanSection({ title, children }) {
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="mb-4 mt-0 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function RatePlanModal({ open, room, plan, onClose, onSave, onDelete }) {
  // Mount-fresh state: the parent remounts per open (see `key` at the call
  // sites), so no reset effect is needed and cancel discards edits.
  const [form, setForm] = useState(() => (plan ? { ...plan } : room ? defaultPlanForRoom(room) : null));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(plan?.id);

  if (!form || !room) return null;

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setNumber = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value === "" ? "" : Number(value) }));
  };

  const handleSave = async () => {
    const name = String(form.name || "").trim();
    const minStay = Number(form.minStay);
    const maxStay = Number(form.maxStay);
    const price = Number(form.price);
    const advance = Number(form.maxAdvanceDays);
    const cutoff = Number(form.bookingCutoffHours);

    if (!name) return toast.error("Name the rate plan");
    if (form.pricingModel === "Fixed nightly rate" && price < 1) {
      return toast.error("Enter a nightly price");
    }
    if (!(minStay >= 1) || maxStay < minStay) return toast.error("Check minimum and maximum nights");
    if (cutoff < 0 || !(advance >= 1)) return toast.error("Check the booking window");

    setSaving(true);
    try {
      await onSave({
        ...form,
        name,
        price: Number(form.price) || 0,
        weekend: Number(form.weekend) || Number(form.price) || 0,
        adjustmentPct: Number(form.adjustmentPct) || 0,
        freeCancellationHours: Number(form.freeCancellationHours) || 0,
        bookingCutoffHours: cutoff,
        maxAdvanceDays: advance,
        minStay,
        maxStay,
        baseGuests: Number(form.baseGuests) || 0,
        singleGuestDiscount: Number(form.singleGuestDiscount) || 0,
        extraAdult: Number(form.extraAdult) || 0,
        extraChild: Number(form.extraChild) || 0,
        closedArrival: form.closedArrival === "Yes" || form.closedArrival === true,
        closedDeparture: form.closedDeparture === "Yes" || form.closedDeparture === true,
      });
      toast.success("Rate plan saved");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the rate plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(form);
      toast.success("Rate plan removed");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not remove the rate plan");
    }
  };

  const derived = form.pricingModel === "Derived from room base rate";

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      wide
      title={isEditing ? "Edit rate plan" : "Create rate plan"}
      description={`${room.name} · Configure the offer travellers can book.`}
      footer={
        <>
          {isEditing && (
            <StaysButton variant="danger" onClick={handleDelete} className="mr-auto">
              Delete plan
            </StaysButton>
          )}
          <StaysButton onClick={onClose}>Cancel</StaysButton>
          <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save rate plan"}
          </StaysButton>
        </>
      }
    >
      <PlanSection title="Rate and inclusions">
        <StaysField label="Rate plan name *">
          <StaysInput value={form.name} onChange={set("name")} />
        </StaysField>
        <StaysField label="Pricing method">
          <StaysSelect options={PRICING_MODELS} value={form.pricingModel} onChange={set("pricingModel")} />
        </StaysField>
        {!derived && (
          <>
            <StaysField label="Weekday nightly price (GHS)">
              <StaysInput type="number" min="0" value={form.price} onChange={setNumber("price")} />
            </StaysField>
            <StaysField label="Weekend nightly price (GHS)">
              <StaysInput type="number" min="0" value={form.weekend} onChange={setNumber("weekend")} />
            </StaysField>
          </>
        )}
        {derived && (
          <>
            <StaysField label="Adjustment from room base (%)">
              <StaysInput type="number" value={form.adjustmentPct} onChange={setNumber("adjustmentPct")} />
            </StaysField>
            <StaysField label="Resulting nightly price">
              <div className="flex min-h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                {formatMoney(planPrice({ ...form, price: form.price }, room))}
              </div>
            </StaysField>
          </>
        )}
        <StaysField label="Meals included">
          <StaysSelect options={MEAL_PLANS} value={form.meal} onChange={set("meal")} />
        </StaysField>
        <StaysField label="Taxes included in displayed rate?">
          <StaysSelect options={["Yes", "No"]} value={form.includesTaxes} onChange={set("includesTaxes")} />
        </StaysField>
      </PlanSection>

      <PlanSection title="Booking window and stay rules">
        <StaysField label="Minimum hours before check-in to book">
          <StaysInput type="number" min="0" value={form.bookingCutoffHours} onChange={setNumber("bookingCutoffHours")} />
        </StaysField>
        <StaysField label="Same-day booking cutoff time">
          <StaysInput type="time" value={form.latestBookingTime} onChange={set("latestBookingTime")} />
        </StaysField>
        <StaysField label="Maximum days before arrival to book">
          <StaysInput type="number" min="1" value={form.maxAdvanceDays} onChange={setNumber("maxAdvanceDays")} />
        </StaysField>
        <StaysField label="Minimum nights">
          <StaysInput type="number" min="1" value={form.minStay} onChange={setNumber("minStay")} />
        </StaysField>
        <StaysField label="Maximum nights">
          <StaysInput type="number" min="1" value={form.maxStay} onChange={setNumber("maxStay")} />
        </StaysField>
        <StaysField label="Close to arrival?">
          <StaysSelect
            options={["No", "Yes"]}
            value={form.closedArrival ? "Yes" : "No"}
            onChange={(event) => setForm((current) => ({ ...current, closedArrival: event.target.value }))}
          />
        </StaysField>
        <StaysField label="Close to departure?">
          <StaysSelect
            options={["No", "Yes"]}
            value={form.closedDeparture ? "Yes" : "No"}
            onChange={(event) => setForm((current) => ({ ...current, closedDeparture: event.target.value }))}
          />
        </StaysField>
      </PlanSection>

      <PlanSection title="Cancellation and no-show">
        <StaysField label="Cancellation terms">
          <StaysSelect options={CANCELLATION_TERMS} value={form.cancellation} onChange={set("cancellation")} />
        </StaysField>
        {form.cancellation === "Free cancellation" && (
          <StaysField label="Free cancellation cutoff (hours before check-in)">
            <StaysInput
              type="number"
              min="0"
              value={form.freeCancellationHours}
              onChange={setNumber("freeCancellationHours")}
            />
          </StaysField>
        )}
        <StaysField label="Late cancellation charge">
          <StaysSelect options={LATE_CANCELLATION_CHARGES} value={form.penalty} onChange={set("penalty")} />
        </StaysField>
        <StaysField label="No-show charge">
          <StaysSelect options={NO_SHOW_CHARGES} value={form.noShow} onChange={set("noShow")} />
        </StaysField>
      </PlanSection>

      <PlanSection title="Guest pricing">
        <StaysField label="Guests included in base rate">
          <StaysInput type="number" min="1" value={form.baseGuests} onChange={setNumber("baseGuests")} />
        </StaysField>
        <StaysField label="Single guest discount (GHS/night)">
          <StaysInput type="number" min="0" value={form.singleGuestDiscount} onChange={setNumber("singleGuestDiscount")} />
        </StaysField>
        <StaysField label="Extra adult (GHS/night)">
          <StaysInput type="number" min="0" value={form.extraAdult} onChange={setNumber("extraAdult")} />
        </StaysField>
        <StaysField label="Extra child (GHS/night)">
          <StaysInput type="number" min="0" value={form.extraChild} onChange={setNumber("extraChild")} />
        </StaysField>
      </PlanSection>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        TravioGhana collects guest payments. This rate plan defines what the guest books and the terms they see.
      </p>
    </StaysModal>
  );
}
