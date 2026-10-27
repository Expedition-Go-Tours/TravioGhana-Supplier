import { useEffect, useState } from "react";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import StaysButton from "./StaysButton";
import { StaysField, StaysInput, StaysSelect } from "./StaysForm";
import { formatMoney } from "../utils/money";
import { defaultPlanForRoom } from "../utils/ratePlans";
import { roomPeople } from "../utils/rooms";

/**
 * Room types / bookable units.
 *
 * The API publishes a property only when it has at least one room type and
 * every room has a rate plan. The builder never collected that inventory, so
 * a fully completed property could not be published. This section closes the
 * gap: it edits `property.rooms` and keeps a default rate plan in sync for
 * each room, exactly the shape the Rates and Availability pages already read.
 */

const BATHROOM_OPTIONS = ["Private", "Shared"];
const MEAL_OPTIONS = ["Room only", "Breakfast included", "Half board", "Full board"];

function makeRoomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `room-${crypto.randomUUID()}`;
  }
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankForm({ suggestedName, defaultGuests, defaultPrice }) {
  const price = Number(defaultPrice) > 0 ? Number(defaultPrice) : 29;
  return {
    name: suggestedName || "Standard Room",
    kind: "Standard Room",
    count: 1,
    guests: Number(defaultGuests) > 0 ? Number(defaultGuests) : 2,
    price,
    // Blank means "same as the nightly price", so changing the nightly price
    // can never leave a stale weekend default behind.
    weekend: "",
    beds: "",
    size: "",
    bathroom: "Private",
    meal: "Room only",
  };
}

function formFromRoom(room) {
  return {
    name: room.name || "",
    kind: room.kind || "Standard Room",
    count: room.count ?? 1,
    guests: roomPeople(room) || 2,
    price: room.price ?? 0,
    weekend: room.weekend ?? "",
    beds: room.beds || "",
    size: room.size || "",
    bathroom: room.bathroom || "Private",
    meal: room.meal || "Room only",
  };
}

export default function RoomTypesSection({
  rooms = [],
  ratePlans = [],
  currency = "GHS",
  suggestedName = "Standard Room",
  defaultGuests = 2,
  defaultPrice = 29,
  onChange,
}) {
  const [editing, setEditing] = useState(null); // "new" | room id | null
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  // Properties created before this editor existed, or rooms added elsewhere,
  // may have no rate plan. Repair that once so publishing is never blocked by
  // inventory the supplier cannot see.
  useEffect(() => {
    const missing = rooms.filter(
      (room) => !ratePlans.some((plan) => plan.roomId === room.id),
    );
    if (missing.length === 0) return;
    onChange?.({
      ratePlans: [...ratePlans, ...missing.map((room) => defaultPlanForRoom(room))],
    });
  }, [rooms, ratePlans, onChange]);

  const openAdd = () => {
    setEditing("new");
    setForm(blankForm({ suggestedName, defaultGuests, defaultPrice }));
    setErrors({});
  };

  const openEdit = (room) => {
    setEditing(room.id);
    setForm(formFromRoom(room));
    setErrors({});
  };

  const closeForm = () => {
    setEditing(null);
    setForm(null);
    setErrors({});
  };

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const saveRoom = () => {
    const nextErrors = {};
    if (!String(form.name || "").trim()) nextErrors.name = "Name this room type";
    if (!(Number(form.count) >= 1)) nextErrors.count = "At least one unit is required";
    if (!(Number(form.guests) >= 1)) nextErrors.guests = "At least one guest is required";
    if (!(Number(form.price) > 0)) nextErrors.price = "Set a nightly price above zero";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const existing = editing === "new" ? null : rooms.find((room) => room.id === editing);
    const room = {
      ...existing,
      id: existing?.id || makeRoomId(),
      kind: String(form.kind || "").trim() || "Standard Room",
      name: String(form.name).trim(),
      count: Number(form.count),
      adults: Number(form.guests),
      children: 0,
      beds: String(form.beds || "").trim(),
      size: Number(form.size) || 0,
      price: Number(form.price),
      weekend: Number(form.weekend) || Number(form.price),
      bathroom: form.bathroom,
      bathroomAmenities: existing?.bathroomAmenities || [],
      amenities: existing?.amenities || [],
      meal: form.meal,
      minStay: existing?.minStay || 1,
    };

    const nextRooms = existing
      ? rooms.map((row) => (row.id === room.id ? room : row))
      : [...rooms, room];

    const hasPlanForRoom = ratePlans.some((plan) => plan.roomId === room.id);
    const defaultPlanId = `plan-${room.id}`;
    let nextPlans = ratePlans.map((plan) => (
      plan.id === defaultPlanId
        ? {
            ...plan,
            roomId: room.id,
            price: room.price,
            weekend: room.weekend,
            meal: room.meal,
            baseGuests: roomPeople(room) || 2,
          }
        : plan
    ));
    if (!hasPlanForRoom) {
      nextPlans = [...nextPlans, defaultPlanForRoom(room)];
    }

    onChange?.({ rooms: nextRooms, ratePlans: nextPlans });
    closeForm();
  };

  const removeRoom = (room) => {
    onChange?.({
      rooms: rooms.filter((row) => row.id !== room.id),
      ratePlans: ratePlans.filter((plan) => plan.roomId !== room.id),
    });
    if (editing === room.id) closeForm();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-slate-800 md:text-lg">Room types</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
            Guests book a room type, not the whole property. Add at least one so your
            property can be published; a standard rate plan is created automatically.
          </p>
        </div>
        {!editing && (
          <StaysButton size="small" onClick={openAdd}>
            <PlusCircle size={16} aria-hidden="true" />
            Add room type
          </StaysButton>
        )}
      </div>

      {rooms.length === 0 && !editing ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">No room types yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add the first bookable room or unit. You can change its details any time.
          </p>
          <StaysButton variant="primary" className="mt-4" onClick={openAdd}>
            Add your first room type
          </StaysButton>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rooms.map((room) => {
            const planCount = ratePlans.filter((plan) => plan.roomId === room.id).length;
            return (
              <div
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 md:text-base">
                    {room.name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {`${room.kind || "Standard Room"} · ${room.count} ${room.count === 1 ? "unit" : "units"} · sleeps ${roomPeople(room) || 1} · ${formatMoney(room.price, currency)} / night`}
                  </p>
                  <p className={`mt-1 text-xs ${planCount > 0 ? "text-slate-400" : "text-amber-600"}`}>
                    {planCount > 0
                      ? `${planCount} ${planCount === 1 ? "rate plan" : "rate plans"}`
                      : "No rate plan yet — one will be created automatically"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StaysButton size="small" aria-label={`Edit ${room.name}`} onClick={() => openEdit(room)}>
                    <Pencil size={15} aria-hidden="true" />
                    Edit
                  </StaysButton>
                  <button
                    type="button"
                    aria-label={`Remove ${room.name}`}
                    onClick={() => removeRoom(room)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && form && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-800">
            {editing === "new" ? "Add a room type" : "Edit room type"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StaysField label="Room type name" error={errors.name} wide>
              <StaysInput
                value={form.name}
                onChange={setField("name")}
                placeholder="Deluxe King Room"
              />
            </StaysField>

            <StaysField label="Room category" hint="Shown alongside the room type in the calendar.">
              <StaysInput
                value={form.kind}
                onChange={setField("kind")}
                placeholder="Deluxe Room"
              />
            </StaysField>

            <StaysField label="Number of units" error={errors.count}>
              <StaysInput
                type="number"
                min="1"
                step="1"
                value={form.count}
                onChange={setField("count")}
              />
            </StaysField>

            <StaysField label="Max guests" error={errors.guests}>
              <StaysInput
                type="number"
                min="1"
                step="1"
                value={form.guests}
                onChange={setField("guests")}
              />
            </StaysField>

            <StaysField label={`Nightly price (${currency})`} error={errors.price}>
              <StaysInput
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={setField("price")}
              />
            </StaysField>

            <StaysField
              label={`Weekend price (${currency})`}
              hint="Leave blank to use the nightly price."
            >
              <StaysInput
                type="number"
                min="0"
                step="1"
                value={form.weekend}
                onChange={setField("weekend")}
              />
            </StaysField>

            <StaysField label="Beds" hint="Optional — e.g. 1 king bed.">
              <StaysInput
                value={form.beds}
                onChange={setField("beds")}
                placeholder="1 king bed"
              />
            </StaysField>

            <StaysField label="Room size" hint="Optional, in square metres.">
              <StaysInput
                type="number"
                min="0"
                step="1"
                value={form.size}
                onChange={setField("size")}
              />
            </StaysField>

            <StaysField label="Bathroom">
              <StaysSelect
                options={BATHROOM_OPTIONS}
                value={form.bathroom}
                onChange={setField("bathroom")}
              />
            </StaysField>

            <StaysField label="Meal plan">
              <StaysSelect
                options={MEAL_OPTIONS}
                value={form.meal}
                onChange={setField("meal")}
              />
            </StaysField>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <StaysButton onClick={closeForm}>Cancel</StaysButton>
            <StaysButton variant="primary" onClick={saveRoom}>
              {editing === "new" ? "Add room type" : "Save room type"}
            </StaysButton>
          </div>
        </div>
      )}
    </section>
  );
}
