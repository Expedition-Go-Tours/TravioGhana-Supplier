import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysCard from "../StaysCard";
import StaysButton from "../StaysButton";
import StaysEmptyState from "../StaysEmptyState";
import StaysSeg from "../StaysSeg";
import { StaysField, StaysInput } from "../StaysForm";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { bulkAvailability } from "../../api";
import { shiftISODays, todayISO } from "../../utils/dates";

/**
 * Open/close rooms — the range action the single-cell calendar cannot express.
 * Closing a date range creates the closed inventory rows; reopening removes
 * rows that carried nothing but the closed flag.
 */
export default function OpenCloseSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const rooms = useMemo(() => property?.rooms || [], [property]);

  const [action, setAction] = useState("close");
  const [selection, setSelection] = useState(null);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(shiftISODays(todayISO(), 7));
  const [result, setResult] = useState(null);

  const roomIds = useMemo(() => {
    const chosen = selection ?? rooms.map((room) => room.id);
    return chosen.filter((id) => rooms.some((room) => room.id === id));
  }, [selection, rooms]);

  const allSelected = rooms.length > 0 && roomIds.length === rooms.length;

  const toggleRoom = (roomId) => {
    if (roomIds.includes(roomId)) {
      setSelection(roomIds.filter((id) => id !== roomId));
    } else {
      setSelection([...roomIds, roomId]);
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      bulkAvailability(property.id, {
        action,
        roomIds,
        from,
        to,
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
      queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
      toast.success(
        `${action === "close" ? "Closed" : "Opened"} ${data.affected} room-night${data.affected === 1 ? "" : "s"}`,
      );
    },
    onError: (error) => toast.error(error?.message || "Could not update availability"),
  });

  const validation = useMemo(() => {
    if (!roomIds.length) return "Choose at least one room";
    if (!from || !to) return "Choose both dates";
    if (to < from) return "The end date cannot be before the start date";
    return null;
  }, [roomIds, from, to]);

  const submit = (event) => {
    event.preventDefault();
    if (validation) {
      toast.error(validation);
      return;
    }
    mutation.mutate();
  };

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <>
      <AvailabilityPropertyBar
        property={property}
        properties={properties}
        onSelect={(id) => {
          selectProperty(id);
          setSelection(null);
          setResult(null);
        }}
      />

      {!property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then manage its availability.
          </StaysEmptyState>
        </StaysCard>
      ) : rooms.length === 0 ? (
        <StaysCard>
          <StaysEmptyState title="No rooms yet">
            Add a room in the property builder before opening or closing dates.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <StaysCard>
          <form onSubmit={submit} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Open or close a date range</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Applies to every selected night, including both end dates.
                </p>
              </div>
              <StaysSeg
                variant="segmented"
                ariaLabel="Availability action"
                value={action}
                onChange={setAction}
                options={[
                  { value: "close", label: "Close rooms" },
                  { value: "open", label: "Open rooms" },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StaysField label="From">
                <StaysInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </StaysField>
              <StaysField label="To">
                <StaysInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </StaysField>
            </div>

            <fieldset>
              <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-slate-700">
                <span>Rooms</span>
                <button
                  type="button"
                  onClick={() => setSelection(allSelected ? [] : rooms.map((room) => room.id))}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {rooms.map((room) => (
                  <label
                    key={room.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={roomIds.includes(room.id)}
                      onChange={() => toggleRoom(room.id)}
                    />
                    <span className="min-w-0 truncate">{room.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-slate-400">
                      {room.count} {room.count === 1 ? "unit" : "units"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                {action === "close"
                  ? "These nights will be unsellable until reopened."
                  : "Closed nights will be sellable again; prices and limits are kept."}
              </p>
              <StaysButton type="submit" variant="primary" disabled={mutation.isPending || Boolean(validation)}>
                {mutation.isPending
                  ? "Saving…"
                  : action === "close"
                    ? "Close selected dates"
                    : "Open selected dates"}
              </StaysButton>
            </div>
          </form>

          {result && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
              <strong className="font-semibold">
                {result.action === "close" ? "Closed" : "Opened"} {result.affected} room-night
                {result.affected === 1 ? "" : "s"}
              </strong>
              <span className="ml-1 text-emerald-700">
                across {result.rooms} room{result.rooms === 1 ? "" : "s"} from {result.from} to {result.to}.
              </span>
            </div>
          )}
        </StaysCard>
      )}
    </>
  );
}
