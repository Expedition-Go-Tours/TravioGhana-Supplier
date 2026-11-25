import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysCard from "../StaysCard";
import StaysButton from "../StaysButton";
import StaysEmptyState from "../StaysEmptyState";
import { StaysField, StaysInput } from "../StaysForm";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { copyAvailability } from "../../api";
import { shiftISODays, todayISO } from "../../utils/dates";

const FIELD_OPTIONS = [
  { value: "price", label: "Nightly price" },
  { value: "count", label: "Rooms available" },
  { value: "minStay", label: "Minimum stay" },
  { value: "closed", label: "Closed nights" },
];

/** Copy one date range's per-night values onto a future range. */
export default function CopyRatesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const rooms = useMemo(() => property?.rooms || [], [property]);

  const [selection, setSelection] = useState(null);
  const [sourceFrom, setSourceFrom] = useState(todayISO());
  const [sourceTo, setSourceTo] = useState(shiftISODays(todayISO(), 6));
  const [targetStart, setTargetStart] = useState(shiftISODays(todayISO(), 7));
  const [fields, setFields] = useState(["price", "count"]);
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState(null);

  const roomIds = useMemo(() => {
    const chosen = selection ?? rooms.map((room) => room.id);
    return chosen.filter((id) => rooms.some((room) => room.id === id));
  }, [selection, rooms]);

  const allSelected = rooms.length > 0 && roomIds.length === rooms.length;

  const toggleRoom = (roomId) => {
    setPreview(null);
    if (roomIds.includes(roomId)) {
      setSelection(roomIds.filter((id) => id !== roomId));
    } else {
      setSelection([...roomIds, roomId]);
    }
  };

  const toggleField = (field) => {
    setPreview(null);
    setFields((current) =>
      current.includes(field)
        ? current.filter((value) => value !== field)
        : [...current, field],
    );
  };

  const mutation = useMutation({
    mutationFn: (dryRun) =>
      copyAvailability(property.id, {
        roomIds,
        sourceFrom,
        sourceTo,
        targetStart,
        fields,
        overwrite,
        dryRun,
      }),
    onSuccess: (data, dryRun) => {
      if (dryRun) {
        setPreview(data);
        toast.success(`${data.wouldCopy} night${data.wouldCopy === 1 ? "" : "s"} ready to copy`);
        return;
      }
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
      queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
      toast.success(`Copied ${data.copied} night${data.copied === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error(error?.message || "Could not copy rates"),
  });

  const validation = useMemo(() => {
    if (!roomIds.length) return "Choose at least one room";
    if (!fields.length) return "Choose at least one value to copy";
    if (!sourceFrom || !sourceTo || !targetStart) return "Choose all three dates";
    if (sourceTo < sourceFrom) return "The source end date cannot be before its start date";
    return null;
  }, [roomIds, fields, sourceFrom, sourceTo, targetStart]);

  const submit = (dryRun) => {
    if (validation) {
      toast.error(validation);
      return;
    }
    mutation.mutate(dryRun);
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
          setPreview(null);
        }}
      />

      {!property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then copy its rates.
          </StaysEmptyState>
        </StaysCard>
      ) : rooms.length === 0 ? (
        <StaysCard>
          <StaysEmptyState title="No rooms yet">
            Add a room in the property builder before copying rates.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <StaysCard>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-800">Copy rates to future dates</h2>
              <p className="mt-1 text-sm text-slate-500">
                The source range is copied night-for-night, starting on the target date.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StaysField label="Source from">
                <StaysInput type="date" value={sourceFrom} onChange={(event) => { setSourceFrom(event.target.value); setPreview(null); }} />
              </StaysField>
              <StaysField label="Source to">
                <StaysInput type="date" value={sourceTo} onChange={(event) => { setSourceTo(event.target.value); setPreview(null); }} />
              </StaysField>
              <StaysField label="Copy to start">
                <StaysInput type="date" value={targetStart} onChange={(event) => { setTargetStart(event.target.value); setPreview(null); }} />
              </StaysField>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-slate-700">
                <span>Rooms</span>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setSelection(allSelected ? [] : rooms.map((room) => room.id));
                  }}
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
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-slate-700">Values to copy</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {FIELD_OPTIONS.map((field) => (
                  <label
                    key={field.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={fields.includes(field.value)}
                      onChange={() => toggleField(field.value)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-emerald-600"
                checked={overwrite}
                onChange={(event) => {
                  setOverwrite(event.target.checked);
                  setPreview(null);
                }}
              />
              <span>
                Overwrite values already set on the target dates
                <span className="mt-0.5 block text-xs text-slate-500">
                  Leave off to fill only the target nights that have no value yet.
                </span>
              </span>
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <StaysButton
                onClick={() => submit(true)}
                disabled={mutation.isPending || Boolean(validation)}
              >
                {mutation.isPending && mutation.variables === true ? "Checking…" : "Preview"}
              </StaysButton>
              <StaysButton
                variant="primary"
                onClick={() => submit(false)}
                disabled={mutation.isPending || Boolean(validation) || !preview?.wouldCopy}
              >
                {mutation.isPending && mutation.variables === false ? "Copying…" : "Copy rates"}
              </StaysButton>
            </div>
          </StaysCard>

          <StaysCard>
            <h3 className="text-sm font-semibold text-slate-800">Preview</h3>
            {!preview ? (
              <p className="mt-2 text-sm text-slate-500">
                Run Preview to see how many nights would be copied and which dates already hold values.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-lg font-bold text-emerald-700">{preview.wouldCopy}</p>
                    <p className="text-xs text-emerald-700">Nights to copy</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-lg font-bold text-slate-700">{preview.wouldSkip}</p>
                    <p className="text-xs text-slate-500">Already set</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {preview.source.from} → {preview.source.to} copies to {preview.target.from} → {preview.target.to}.
                </p>
                {preview.preview?.length > 0 && (
                  <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                    {preview.preview.slice(0, 12).map((row) => (
                      <li
                        key={`${row.roomId}-${row.date}`}
                        className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5"
                      >
                        <span className="font-medium text-slate-700">{row.date}</span>
                        <span className="truncate text-slate-500">
                          {Object.entries(row.fields)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </StaysCard>
        </div>
      )}
    </>
  );
}
