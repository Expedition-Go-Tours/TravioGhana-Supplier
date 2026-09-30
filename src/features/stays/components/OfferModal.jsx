import { useState } from "react";
import { toast } from "sonner";
import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import { todayISO } from "../utils/dates";

const OFFER_KINDS = ["Weekend deal", "Early booking", "Last-minute", "Long stay", "Launch deal"];

/**
 * Create/edit a property offer. Mounted fresh per open (parent supplies a
 * `key`); validation mirrors the prototype: a name, a 1–90% discount and an
 * end date that does not precede the start.
 */
export default function OfferModal({ open, offer, properties = [], defaultPropertyId, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: offer?.name || "Weekend escape",
    propertyId: offer?.propertyId || defaultPropertyId || properties[0]?.id || "",
    kind: offer?.kind || "Weekend deal",
    discount: offer?.discount || 10,
    from: offer?.from || todayISO(),
    to: offer?.to || "",
    limit: offer?.limit || "",
  }));
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSave = async () => {
    const name = form.name.trim();
    const discount = Number(form.discount);
    if (!name || discount < 1 || discount > 90) {
      toast.error("Enter an offer and a discount from 1–90%");
      return;
    }
    if (form.from && form.to && form.to < form.from) {
      toast.error("End date must be after start date");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...(offer?.id ? { id: offer.id } : {}), ...form, name, discount, limit: Number(form.limit) || 0 });
      toast.success("Offer saved");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`${offer?.id ? "Edit" : "Create"} an offer`}
      description="Discounts appear on the property's listing while the offer is live."
      footer={
        <>
          <StaysButton onClick={onClose}>Cancel</StaysButton>
          <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : offer?.id ? "Save offer" : "Create offer"}
          </StaysButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="Offer name">
          <StaysInput value={form.name} onChange={set("name")} />
        </StaysField>
        <StaysField label="Property">
          <StaysSelect value={form.propertyId} onChange={set("propertyId")}>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </StaysSelect>
        </StaysField>
        <StaysField label="Offer type">
          <StaysSelect options={OFFER_KINDS} value={form.kind} onChange={set("kind")} />
        </StaysField>
        <StaysField label="Discount (%)">
          <StaysInput type="number" min="1" max="90" value={form.discount} onChange={set("discount")} />
        </StaysField>
        <StaysField label="Start date">
          <StaysInput type="date" value={form.from} onChange={set("from")} />
        </StaysField>
        <StaysField label="End date">
          <StaysInput type="date" value={form.to} onChange={set("to")} />
        </StaysField>
        <StaysField label="Booking limit (optional)">
          <StaysInput type="number" min="0" value={form.limit} onChange={set("limit")} placeholder="Unlimited" />
        </StaysField>
      </div>
    </StaysModal>
  );
}
