import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysCard from "../StaysCard";
import StaysButton from "../StaysButton";
import StaysEmptyState from "../StaysEmptyState";
import StaysModal from "../StaysModal";
import { StaysField, StaysInput } from "../StaysForm";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import {
  createRestrictionRule,
  deleteRestrictionRule,
  listRestrictionRules,
  STAYS_KEYS,
  updateRestrictionRule,
} from "../../api";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

function ruleChips(rule, rooms) {
  const chips = [];
  if (rule.startDate || rule.endDate) {
    chips.push(
      `${rule.startDate || "Any date"} → ${rule.endDate || "open-ended"}`,
    );
  } else {
    chips.push("Every date");
  }
  chips.push(
    rule.weekdays?.length
      ? rule.weekdays.map((day) => day.slice(0, 3)).join(", ")
      : "Every day",
  );
  chips.push(
    rule.roomIds?.length
      ? rule.roomIds
          .map((id) => rooms.find((room) => room.id === id)?.name || id)
          .join(", ")
      : "All rooms",
  );
  if (rule.minStay != null) chips.push(`Min ${rule.minStay} night${rule.minStay === 1 ? "" : "s"}`);
  if (rule.maxStay != null) chips.push(`Max ${rule.maxStay} night${rule.maxStay === 1 ? "" : "s"}`);
  if (rule.stopSell) chips.push("Stop sell");
  if (rule.closedToArrival) chips.push("Closed to arrival");
  if (rule.closedToDeparture) chips.push("Closed to departure");
  return chips;
}

function RuleForm({ rooms, initial, pending, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    startDate: initial?.startDate || "",
    endDate: initial?.endDate || "",
    weekdays: initial?.weekdays || [],
    roomIds: initial?.roomIds || [],
    minStay: initial?.minStay ?? "",
    maxStay: initial?.maxStay ?? "",
    stopSell: Boolean(initial?.stopSell),
    closedToArrival: Boolean(initial?.closedToArrival),
    closedToDeparture: Boolean(initial?.closedToDeparture),
    isActive: initial?.isActive ?? true,
  }));

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleArrayValue = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));

  const hasEffect =
    form.stopSell ||
    form.closedToArrival ||
    form.closedToDeparture ||
    form.minStay !== "" ||
    form.maxStay !== "";

  const error = (() => {
    if (!hasEffect) return "Add at least one restriction";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      return "The end date cannot be before the start date";
    }
    if (form.minStay !== "" && form.maxStay !== "" && Number(form.maxStay) < Number(form.minStay)) {
      return "Maximum stay cannot be less than minimum stay";
    }
    return null;
  })();

  const submit = (event) => {
    event.preventDefault();
    if (error) {
      toast.error(error);
      return;
    }
    onSave({
      name: form.name.trim() || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      weekdays: form.weekdays,
      roomIds: form.roomIds,
      minStay: form.minStay === "" ? null : Number(form.minStay),
      maxStay: form.maxStay === "" ? null : Number(form.maxStay),
      stopSell: form.stopSell,
      closedToArrival: form.closedToArrival,
      closedToDeparture: form.closedToDeparture,
      isActive: form.isActive,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <StaysField label="Rule name" hint="Optional — shown only in this list.">
        <StaysInput
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="e.g. Peak weekend minimum"
        />
      </StaysField>

      <div className="grid gap-4 sm:grid-cols-2">
        <StaysField label="Start date" hint="Leave blank for any date.">
          <StaysInput type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} />
        </StaysField>
        <StaysField label="End date" hint="Leave blank for open-ended.">
          <StaysInput type="date" value={form.endDate} onChange={(event) => set("endDate", event.target.value)} />
        </StaysField>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Days of the week</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              aria-pressed={form.weekdays.includes(day.value)}
              onClick={() => toggleArrayValue("weekdays", day.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                form.weekdays.includes(day.value)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500 hover:border-emerald-200",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">No days selected means every day.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Rooms</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {rooms.map((room) => (
            <label
              key={room.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-emerald-200"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={form.roomIds.includes(room.id)}
                onChange={() => toggleArrayValue("roomIds", room.id)}
              />
              <span className="truncate">{room.name}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">No rooms selected means every room.</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <StaysField label="Minimum stay (nights)">
          <StaysInput
            type="number"
            min="1"
            value={form.minStay}
            onChange={(event) => set("minStay", event.target.value)}
            placeholder="No minimum"
          />
        </StaysField>
        <StaysField label="Maximum stay (nights)">
          <StaysInput
            type="number"
            min="1"
            value={form.maxStay}
            onChange={(event) => set("maxStay", event.target.value)}
            placeholder="No maximum"
          />
        </StaysField>
      </div>

      <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Restrictions</legend>
        {[
          ["stopSell", "Stop sell", "Block the selected nights from sale"],
          ["closedToArrival", "Closed to arrival", "Guests cannot check in on matching dates"],
          ["closedToDeparture", "Closed to departure", "Guests cannot check out on matching dates"],
        ].map(([key, label, hint]) => (
          <label key={key} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-emerald-600"
              checked={form[key]}
              onChange={(event) => set(key, event.target.checked)}
            />
            <span>
              <span className="font-medium">{label}</span>
              <span className="block text-xs text-slate-500">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-emerald-600"
          checked={form.isActive}
          onChange={(event) => set("isActive", event.target.checked)}
        />
        Rule is active
      </label>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <StaysButton onClick={onCancel} disabled={pending}>Cancel</StaysButton>
        <StaysButton type="submit" variant="primary" disabled={pending || Boolean(error)}>
          {pending ? "Saving…" : initial ? "Save rule" : "Add rule"}
        </StaysButton>
      </div>
    </form>
  );
}

export default function RestrictionRulesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading: loadingRules } = useQuery({
    queryKey: STAYS_KEYS.restrictionRules(property?.id),
    queryFn: () => listRestrictionRules(property.id),
    enabled: Boolean(property?.id),
    staleTime: 15_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.restrictionRules(property?.id) });
    queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
    queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? updateRestrictionRule(property.id, editing.id, payload)
        : createRestrictionRule(property.id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
      toast.success(editing ? "Restriction rule updated" : "Restriction rule added");
    },
    onError: (error) => toast.error(error?.message || "Could not save the rule"),
  });

  const toggleMutation = useMutation({
    mutationFn: (rule) => updateRestrictionRule(property.id, rule.id, { isActive: !rule.isActive }),
    onSuccess: () => {
      invalidate();
      toast.success("Rule updated");
    },
    onError: (error) => toast.error(error?.message || "Could not update the rule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (rule) => deleteRestrictionRule(property.id, rule.id),
    onSuccess: () => {
      invalidate();
      setConfirmingDelete(null);
      toast.success("Rule removed");
    },
    onError: (error) => toast.error(error?.message || "Could not remove the rule"),
  });

  const rooms = property?.rooms || [];
  const rules = data?.rules || [];

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (rule) => {
    setEditing(rule);
    setModalOpen(true);
  };

  const pending = saveMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <>
      <AvailabilityPropertyBar
        property={property}
        properties={properties}
        onSelect={(id) => {
          selectProperty(id);
          setConfirmingDelete(null);
        }}
      >
        <StaysButton variant="primary" onClick={openAdd} disabled={!property}>
          + Add rule
        </StaysButton>
      </AvailabilityPropertyBar>

      {!property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then add restriction rules.
          </StaysEmptyState>
        </StaysCard>
      ) : loadingRules ? (
        <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />
      ) : rules.length === 0 ? (
        <StaysCard>
          <StaysEmptyState title="No restriction rules yet">
            Add a rule to require minimum stays, stop sales or close arrival and departure on chosen dates.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => (
            <StaysCard key={rule.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {rule.name || "Untitled rule"}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        rule.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {rule.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ruleChips(rule, rooms).map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StaysButton size="small" onClick={() => toggleMutation.mutate(rule)} disabled={pending}>
                    {rule.isActive ? "Pause" : "Activate"}
                  </StaysButton>
                  <StaysButton size="small" onClick={() => openEdit(rule)} disabled={pending}>
                    Edit
                  </StaysButton>
                  {confirmingDelete === rule.id ? (
                    <>
                      <StaysButton size="small" variant="ghost" onClick={() => setConfirmingDelete(null)}>
                        Cancel
                      </StaysButton>
                      <StaysButton
                        size="small"
                        variant="danger"
                        onClick={() => deleteMutation.mutate(rule)}
                        disabled={pending}
                      >
                        Delete
                      </StaysButton>
                    </>
                  ) : (
                    <StaysButton
                      size="small"
                      variant="danger"
                      onClick={() => setConfirmingDelete(rule.id)}
                      disabled={pending}
                    >
                      Delete
                    </StaysButton>
                  )}
                </div>
              </div>
            </StaysCard>
          ))}
        </div>
      )}

      <StaysModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Edit restriction rule" : "Add restriction rule"}
        description="Rules are applied to every matching night when a booking is checked."
        wide
      >
        <RuleForm
          key={editing?.id || "new"}
          rooms={rooms}
          initial={editing}
          pending={saveMutation.isPending}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={(payload) => saveMutation.mutate(payload)}
        />
      </StaysModal>
    </>
  );
}
