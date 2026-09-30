import StaysButton from "../components/StaysButton";
import { formatMoney } from "../utils/money";
import { Footnote } from "./stepBits";

/**
 * STEP 4 — Rooms & units. Adding a room also creates its Standard rate plan
 * (API layer), and the item list matches the prototype's `.itemcard` rows.
 */
export default function Step04Rooms({ property, onAddRoom, onEditRoom }) {
  const rooms = property.rooms || [];

  return (
    <>
      <div className="flex flex-wrap gap-[9px]">
        <StaysButton variant="primary" onClick={onAddRoom}>
          + Add room or unit
        </StaysButton>
      </div>

      {rooms.map((room) => (
        <div
          key={room.id}
          className="my-3 flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <b className="text-sm font-medium text-slate-700">{room.name}</b>
            <small className="mt-1 block text-xs text-slate-500">
              {`${room.count} ${room.count === 1 ? "unit" : "units"} · ${room.adults} adults · ${room.beds} · ${formatMoney(room.price)}/night`}
            </small>
          </div>
          <StaysButton size="small" onClick={() => onEditRoom(room)}>
            Edit
          </StaysButton>
        </div>
      ))}

      {rooms.length === 0 && (
        <p className="mt-5 text-sm text-slate-500">Add at least one room or unit to continue.</p>
      )}

      <Footnote>
        Each room type has its own inventory, capacity and base nightly price. Rate plans refine what guests
        actually book.
      </Footnote>
    </>
  );
}
