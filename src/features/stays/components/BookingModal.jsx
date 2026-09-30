import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import StaysRow from "./StaysRow";
import { StaysField, StaysSelect } from "./StaysForm";
import { BOOKING_STATUSES } from "../utils/status";
import { formatMoney } from "../utils/money";
import { formatShortArrow } from "../utils/dates";
import { useState } from "react";

/**
 * Reservation detail — the prototype's booking modal: guest, stay, property,
 * total and payment rows plus a status switcher. Mounted fresh per open
 * (parent supplies `key`), so the select resets with the row it opened on.
 */
export default function BookingModal({ open, booking, currency = "GHS", onClose, onUpdateStatus }) {
  const [status, setStatus] = useState(booking?.status || "New");
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(booking.id, status);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ["Property", booking.propertyName || "—"],
    ["Room", booking.room],
    ["Stay", formatShortArrow(booking.from, booking.to)],
    ["Guests", booking.guests],
    ["Booking total", formatMoney(booking.amount, currency)],
    ["Payment", "Collected by TravioGhana"],
  ];

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Reservation ${booking.id}`}
      description={`${booking.guest} · ${booking.room}`}
      footer={
        <>
          <StaysButton onClick={onClose}>Close</StaysButton>
          <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Updating…" : "Update status"}
          </StaysButton>
        </>
      }
    >
      {rows.map(([label, value]) => (
        <StaysRow key={label}>
          <strong className="text-[14px]">{label}</strong>
          <span className="text-right text-[14px]">{value}</span>
        </StaysRow>
      ))}
      <div className="mt-[17px]">
        <StaysField label="Booking status">
          <StaysSelect options={BOOKING_STATUSES} value={status} onChange={(event) => setStatus(event.target.value)} />
        </StaysField>
      </div>
    </StaysModal>
  );
}
