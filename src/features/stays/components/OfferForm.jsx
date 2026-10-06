import { useState } from "react";
import { toast } from "sonner";
import StaysCard from "./StaysCard";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import { todayISO } from "../utils/dates";

const OFFER_KINDS = ["Weekend deal", "Early booking", "Last-minute", "Long stay", "Launch deal"];

/**
 * Create/edit a property offer — the Special Offers page's inline form, spread
 * across the page instead of a modal: an "Offer details" section, a "Discount
 * & schedule" section and a live preview line, with the fields on a responsive
 * 1 → 2 → 3 (→ 4) column grid.
 *
 * Mounted fresh per open (the parent supplies a `key`); validation mirrors the
 * prototype: a name, a 1–90% discount and an end date that does not precede
 * the start. Errors show inline under the field.
 */
export default function OfferForm({ offer, properties = [], defaultPropertyId, onClose, onSave }) {
  const isEdit = Boolean(offer?.id);
  const [form, setForm] = useState(() => ({
    name: offer?.name || "Weekend escape",
    propertyId: offer?.propertyId || defaultPropertyId || properties[0]?.id || "",
    kind: offer?.kind || "Weekend deal",
    discount: offer?.discount || 10,
    from: offer?.from || todayISO(),
    to: offer?.to || "",
    limit: offer?.limit || "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The properties query can resolve after the form mounts (especially when
  // the form opens straight from the deep link): fall back to the first
  // property so Save never sends an empty property.
  const propertyId = form.propertyId || properties[0]?.id || "";

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const discount = Number(form.discount);
    const nextErrors = {};
    if (!name) nextErrors.name = "Enter an offer name";
    if (!propertyId) nextErrors.propertyId = "Choose a property";
    if (!Number.isFinite(discount) || discount < 1 || discount > 90) {
      nextErrors.discount = "Enter a discount from 1–90%";
    }
    if (form.from && form.to && form.to < form.from) {
      nextErrors.to = "End date must be after start date";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await onSave({
        ...(offer?.id ? { id: offer.id } : {}),
        ...form,
        propertyId,
        name,
        discount,
        limit: Number(form.limit) || 0,
      });
      toast.success("Offer saved");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaysCard className="mb-[18px] scroll-mt-4" data-offer-form>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-800">
          {isEdit ? "Edit offer" : "Create an offer"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Discounts appear on the property&apos;s listing while the offer is live.
        </p>
      </div>

      <div className="mt-5 space-y-6">
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Offer details
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StaysField label="Offer name" error={errors.name}>
              <StaysInput
                value={form.name}
                onChange={set("name")}
                placeholder="Weekend escape"
              />
            </StaysField>
            <StaysField label="Property" error={errors.propertyId}>
              <StaysSelect
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.name,
                }))}
                value={propertyId}
                onChange={set("propertyId")}
                placeholder="Select a property"
              />
            </StaysField>
            <StaysField label="Offer type">
              <StaysSelect options={OFFER_KINDS} value={form.kind} onChange={set("kind")} />
            </StaysField>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Discount &amp; schedule
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StaysField label="Discount (%)" error={errors.discount}>
              <StaysInput
                type="number"
                min="1"
                max="90"
                value={form.discount}
                onChange={set("discount")}
              />
            </StaysField>
            <StaysField label="Start date">
              <StaysInput type="date" value={form.from} onChange={set("from")} />
            </StaysField>
            <StaysField label="End date" error={errors.to}>
              <StaysInput type="date" value={form.to} onChange={set("to")} />
            </StaysField>
            <StaysField label="Booking limit (optional)">
              <StaysInput
                type="number"
                min="0"
                value={form.limit}
                onChange={set("limit")}
                placeholder="Unlimited"
              />
            </StaysField>
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Guests see:{" "}
        <strong className="font-semibold text-emerald-600">
          {Number(form.discount) || 0}% OFF
        </strong>
        {" · "}
        {form.name.trim() || "Offer name"}
        {" · "}
        {form.from || "Open"} – {form.to || "Open"}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <StaysButton className="w-full sm:w-auto" onClick={onClose} disabled={saving}>
          Cancel
        </StaysButton>
        <StaysButton
          variant="primary"
          className="w-full sm:w-auto"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "Save offer" : "Create offer"}
        </StaysButton>
      </div>
    </StaysCard>
  );
}
