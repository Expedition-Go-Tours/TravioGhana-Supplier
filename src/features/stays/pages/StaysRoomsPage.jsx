import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysButton from "../components/StaysButton";
import StaysCard from "../components/StaysCard";
import StaysPill from "../components/StaysPill";
import StaysRow from "../components/StaysRow";
import StaysEmptyState from "../components/StaysEmptyState";
import RoomForm from "../components/RoomForm";
import StaysPropertySelect from "../components/StaysPropertySelect";
import { usePropertyContext } from "../hooks/usePropertyContext";
import { STAYS_KEYS, saveRoom } from "../api";
import { formatMoneyPerNight } from "../utils/money";
import { peopleLabel } from "../utils/rooms";

/**
 * Rooms & units — the prototype's room cards per property. Adding a room also
 * creates its Standard rate plan (the API layer does that), so Rates &
 * availability always has something bookable.
 *
 * The add/edit form opens inline above the room cards (no modal).
 */
export default function StaysRoomsPage() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [editing, setEditing] = useState(null); // null | {} (new) | room
  const formRef = useRef(null);

  const saveMutation = useMutation({
    mutationFn: (room) => saveRoom(property.id, room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
    },
  });

  useEffect(() => {
    if (editing !== null) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  const isAdding = editing !== null && !editing.id;

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Rooms & units"
        subtitle={property ? `Room types at ${property.name}.` : "Add a property before adding rooms."}
        actions={
          <>
            <StaysPropertySelect
              properties={properties}
              value={property?.id}
              onChange={selectProperty}
              className="w-auto min-w-[200px] py-2 text-sm"
            />
            <StaysButton
              variant="primary"
              onClick={() => setEditing({})}
              disabled={!property || isAdding}
            >
              + Add room
            </StaysButton>
          </>
        }
      />

      {editing !== null && (
        <StaysCard ref={formRef} className="mb-5 border-2 border-emerald-200 bg-emerald-50/20">
          <div className="mb-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {editing.id ? "Edit room or unit" : "Add room or unit"}
            </h2>
            <p className="mb-0 mt-1 text-sm text-slate-500">
              Create a bookable room type with its own inventory.
            </p>
          </div>
          <RoomForm
            key={editing.id || "new"}
            room={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSave={(room) => saveMutation.mutateAsync(room)}
          />
        </StaysCard>
      )}

      {isLoading ? (
        <StaysCard className="min-h-[200px] animate-pulse bg-white/60" />
      ) : !property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add your first listing.
          </StaysEmptyState>
        </StaysCard>
      ) : property.rooms?.length ? (
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
          {property.rooms.map((room) => (
            <StaysCard key={room.id}>
              <StaysPill>{room.kind}</StaysPill>
              <h2 className="mb-1 mt-4 text-base font-semibold text-slate-800">{room.name}</h2>
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                {`${room.count} ${room.count === 1 ? "unit" : "units"} · ${peopleLabel(room)} · ${room.beds}`}
              </p>
              <StaysRow className="mt-3">
                <b className="text-[14px]">{formatMoneyPerNight(room.price)}</b>
                <StaysButton size="small" onClick={() => setEditing(room)}>
                  Edit
                </StaysButton>
              </StaysRow>
            </StaysCard>
          ))}
        </div>
      ) : (
        <StaysCard>
          <StaysEmptyState title="No rooms yet">
            Add a room or complete the property builder.
          </StaysEmptyState>
        </StaysCard>
      )}
    </StaysSurface>
  );
}
