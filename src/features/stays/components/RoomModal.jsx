import { useState } from "react";
import { toast } from "sonner";
import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import { BATHROOM_TYPES, ROOM_KINDS } from "../config/constants";

/**
 * Add/edit a room type — the prototype's `.modal` for rooms. Field list and
 * defaults match the prototype; validation mirrors its `saveRoom`:
 * name, at least one unit and a nightly price are required.
 */
const EMPTY_ROOM = {
  kind: "Deluxe Room",
  name: "",
  count: 1,
  adults: 2,
  children: 0,
  beds: "1 king bed",
  size: "",
  price: "",
  weekend: "",
  bathroom: "Private",
};

export default function RoomModal({ open, room, onClose, onSave }) {
  // State is initialised once per mount and the parent remounts this modal per
  // open (`key`), so closing discards edits without a reset effect.
  const [form, setForm] = useState(() =>
    room ? { ...EMPTY_ROOM, ...room, size: room.size ?? "", price: room.price ?? "", weekend: room.weekend ?? "" } : EMPTY_ROOM,
  );
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSave = async () => {
    const name = form.name.trim();
    const count = Number(form.count);
    const price = Number(form.price);
    if (!name || count < 1 || price < 1) {
      toast.error("Add a name, unit count and nightly price");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(room?.id ? { id: room.id } : {}),
        kind: form.kind,
        name,
        count,
        adults: Number(form.adults) || 0,
        children: Number(form.children) || 0,
        beds: form.beds,
        size: Number(form.size) || 0,
        price,
        weekend: Number(form.weekend) || price,
        bathroom: form.bathroom,
        meal: room?.meal || "Room only",
      });
      toast.success("Room saved");
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={room ? "Edit room or unit" : "Add room or unit"}
      description="Create a bookable room type with its own inventory."
      footer={
        <>
          <StaysButton onClick={onClose}>Cancel</StaysButton>
          <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save room"}
          </StaysButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="Unit type">
          <StaysSelect options={ROOM_KINDS} value={form.kind} onChange={set("kind")} />
        </StaysField>
        <StaysField label="Room name *">
          <StaysInput value={form.name} onChange={set("name")} placeholder="Deluxe King Room" />
        </StaysField>
        <StaysField label="Number of units *">
          <StaysInput type="number" min="1" value={form.count} onChange={set("count")} />
        </StaysField>
        <StaysField label="Max adults">
          <StaysInput type="number" min="0" value={form.adults} onChange={set("adults")} />
        </StaysField>
        <StaysField label="Max children">
          <StaysInput type="number" min="0" value={form.children} onChange={set("children")} />
        </StaysField>
        <StaysField label="Bed configuration">
          <StaysInput value={form.beds} onChange={set("beds")} />
        </StaysField>
        <StaysField label="Room size (m²)">
          <StaysInput type="number" min="0" value={form.size} onChange={set("size")} />
        </StaysField>
        <StaysField label="Weekday price (GHS) *">
          <StaysInput type="number" min="1" value={form.price} onChange={set("price")} />
        </StaysField>
        <StaysField label="Weekend price (GHS)">
          <StaysInput type="number" min="0" value={form.weekend} onChange={set("weekend")} placeholder="Same as weekday" />
        </StaysField>
        <StaysField label="Bathroom">
          <StaysSelect options={BATHROOM_TYPES} value={form.bathroom} onChange={set("bathroom")} />
        </StaysField>
      </div>
    </StaysModal>
  );
}
