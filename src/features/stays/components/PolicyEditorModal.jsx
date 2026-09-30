import { useState } from "react";
import { toast } from "sonner";
import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect, StaysTextarea } from "./StaysForm";
import { POLICY_FIELDS } from "../config/policies";

/**
 * Policy section editor — one modal per section, mounted fresh per open.
 * Validation mirrors the prototype: ages stay in range and fees are never
 * negative, with the same toast messages.
 */
export default function PolicyEditorModal({ open, section, property, onClose, onSave }) {
  const fields = POLICY_FIELDS[section] || [];
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const field of fields) {
      initial[field.key] = property?.[field.key] ?? "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSave = async () => {
    const minAge = Number(form.minAge || 0);
    const childAdultAge = Number(form.childAdultAge || 0);
    const validAge = (value, max) => !value || (Number.isInteger(value) && value >= 0 && value <= max);
    if (!validAge(minAge, 100) || !validAge(childAdultAge, 21)) {
      toast.error("Check the age values");
      return;
    }
    for (const key of ["petFee", "extraBedFee", "damageDeposit", "cleaningFee"]) {
      if (Number(form[key]) < 0) {
        toast.error("Fees cannot be negative");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success("Property policies saved");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the policies");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Edit ${section}`}
      description={`Changes update ${property?.name} and its listing details.`}
      footer={
        <>
          <StaysButton onClick={onClose}>Cancel</StaysButton>
          <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save policies"}
          </StaysButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <StaysField key={field.key} label={field.label} wide={field.wide}>
            {field.type === "select" ? (
              <StaysSelect
                options={field.options}
                value={form[field.key] || field.fallback || field.options[0]}
                onChange={set(field.key)}
              />
            ) : field.type === "textarea" ? (
              <StaysTextarea rows={4} value={form[field.key]} onChange={set(field.key)} />
            ) : (
              <StaysInput type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"} value={form[field.key]} onChange={set(field.key)} />
            )}
          </StaysField>
        ))}
      </div>
    </StaysModal>
  );
}
