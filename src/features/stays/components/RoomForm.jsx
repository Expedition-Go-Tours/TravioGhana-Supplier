import { useState } from "react";
import { toast } from "sonner";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import { BATHROOM_AMENITIES, BATHROOM_TYPES, ROOM_AMENITIES, ROOM_KINDS } from "../config/constants";
import { roomPeople } from "../utils/rooms";

/**
 * Add/edit a room type — the field set, defaults and validation, rendered
 * inline (no modal). Used by the builder's Rooms & units step and the
 * standalone Rooms & units page; the parent provides the card, heading and
 * scroll-into-view, and awaits `onSave` before closing.
 *
 * Capacity is a single "Number of people" field. It is stored in the API's
 * existing shape (`adults` = headcount, `children` = 0), and legacy rooms with
 * a split are summed for the initial value.
 *
 * Validation mirrors the prototype's `saveRoom`: a name, at least one unit, a
 * headcount and a nightly price are required.
 */
const EMPTY_ROOM = {
  kind: "Deluxe Room",
  name: "",
  count: 1,
  people: 2,
  beds: "1 king bed",
  size: "",
  price: "",
  weekend: "",
  bathroom: "Private",
  bathroomAmenities: [],
  amenities: [],
};

/** Checkbox tiles for the room's bathroom and room amenities. */
function AmenityGrid({ options, selected, onToggle, label }) {
  return (
    <div
      className="grid grid-cols-1 gap-[9px] sm:grid-cols-2 lg:grid-cols-3"
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-[10px] py-[10px] text-[13px] transition-colors ${
              checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option)}
              className="h-4 w-4 accent-emerald-600"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

export default function RoomForm({ room, onCancel, onSave }) {
  // Mount-fresh state: the parent remounts per open (`key`), so cancel
  // discards edits without a reset effect.
  const [form, setForm] = useState(() =>
    room
      ? {
          ...EMPTY_ROOM,
          ...room,
          people: roomPeople(room) || 2,
          size: room.size ?? "",
          price: room.price ?? "",
          weekend: room.weekend ?? "",
        }
      : EMPTY_ROOM,
  );
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  /** Checkbox list bound to one array field on the form. */
  const toggleAmenity = (key) => (value) =>
    setForm((current) => {
      const selected = current[key] || [];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });

  const handleSave = async () => {
    const name = form.name.trim();
    const count = Number(form.count);
    const price = Number(form.price);
    const people = Number(form.people);
    if (!name || count < 1 || price < 1 || people < 1) {
      toast.error("Add a name, unit count, number of people and nightly price");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(room?.id ? { id: room.id } : {}),
        kind: form.kind,
        name,
        count,
        adults: people,
        children: 0,
        beds: form.beds,
        size: Number(form.size) || 0,
        price,
        weekend: Number(form.weekend) || price,
        bathroom: form.bathroom,
        bathroomAmenities: form.bathroomAmenities || [],
        amenities: form.amenities || [],
        meal: room?.meal || "Room only",
      });
      toast.success("Room saved");
      onCancel();
    } catch (error) {
      toast.error(error?.message || "Could not save the room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
        <StaysField label="Number of people *">
          <StaysInput type="number" min="1" value={form.people} onChange={set("people")} />
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

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-slate-800">Bathroom details</div>
        <AmenityGrid
          options={BATHROOM_AMENITIES}
          selected={form.bathroomAmenities || []}
          onToggle={toggleAmenity("bathroomAmenities")}
          label="Bathroom amenities"
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-slate-800">Room amenities</div>
        <AmenityGrid
          options={ROOM_AMENITIES}
          selected={form.amenities || []}
          onToggle={toggleAmenity("amenities")}
          label="Room amenities"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <StaysButton onClick={onCancel}>Cancel</StaysButton>
        <StaysButton variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save room"}
        </StaysButton>
      </div>
    </>
  );
}
