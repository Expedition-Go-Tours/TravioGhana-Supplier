import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysCard from "../StaysCard";
import StaysButton from "../StaysButton";
import StaysEmptyState from "../StaysEmptyState";
import StaysModal from "../StaysModal";
import { StaysField, StaysInput, StaysSelect, StaysTextarea } from "../StaysForm";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import {
  createValueAdd,
  deleteValueAdd,
  listValueAdds,
  STAYS_KEYS,
  updateValueAdd,
} from "../../api";
import { formatMoney } from "../../utils/money";
import { cn } from "@/lib/utils";

const UNITS = [
  { value: "PER_STAY", label: "Per stay" },
  { value: "PER_NIGHT", label: "Per night" },
  { value: "PER_PERSON", label: "Per person" },
];

const unitLabel = (unit) => UNITS.find((option) => option.value === unit)?.label.toLowerCase() || "per stay";

function ValueAddForm({ initial, pending, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    description: initial?.description || "",
    price: initial?.price ?? "",
    unit: initial?.unit || "PER_STAY",
    isActive: initial?.isActive ?? true,
    sortOrder: initial?.sortOrder ?? 0,
  }));

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const name = form.name.trim();
  const price = Number(form.price);
  const error = !name
    ? "Name the value add"
    : !Number.isFinite(price) || price < 0
      ? "Enter a price of zero or more"
      : null;

  const submit = (event) => {
    event.preventDefault();
    if (error) {
      toast.error(error);
      return;
    }
    onSave({
      name,
      description: form.description.trim() || null,
      price,
      unit: form.unit,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <StaysField label="Name">
        <StaysInput
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="e.g. Airport pickup"
        />
      </StaysField>
      <StaysField label="Description" hint="Optional — shown to guests when they choose extras.">
        <StaysTextarea
          rows={3}
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What is included?"
        />
      </StaysField>
      <div className="grid gap-4 sm:grid-cols-2">
        <StaysField label="Price (GHS)">
          <StaysInput
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => set("price", event.target.value)}
          />
        </StaysField>
        <StaysField label="Charged">
          <StaysSelect
            options={UNITS}
            value={form.unit}
            onChange={(event) => set("unit", event.target.value)}
          />
        </StaysField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StaysField label="Sort order" hint="Lower numbers appear first.">
          <StaysInput
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(event) => set("sortOrder", event.target.value)}
          />
        </StaysField>
        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={form.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
          Offer this value add
        </label>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <StaysButton onClick={onCancel} disabled={pending}>Cancel</StaysButton>
        <StaysButton type="submit" variant="primary" disabled={pending || Boolean(error)}>
          {pending ? "Saving…" : initial ? "Save value add" : "Add value add"}
        </StaysButton>
      </div>
    </form>
  );
}

export default function ValueAddsSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading: loadingValueAdds } = useQuery({
    queryKey: STAYS_KEYS.valueAdds(property?.id),
    queryFn: () => listValueAdds(property.id),
    enabled: Boolean(property?.id),
    staleTime: 15_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.valueAdds(property?.id) });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? updateValueAdd(property.id, editing.id, payload)
        : createValueAdd(property.id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
      toast.success(editing ? "Value add updated" : "Value add added");
    },
    onError: (error) => toast.error(error?.message || "Could not save the value add"),
  });

  const toggleMutation = useMutation({
    mutationFn: (valueAdd) =>
      updateValueAdd(property.id, valueAdd.id, { isActive: !valueAdd.isActive }),
    onSuccess: () => {
      invalidate();
      toast.success("Value add updated");
    },
    onError: (error) => toast.error(error?.message || "Could not update the value add"),
  });

  const deleteMutation = useMutation({
    mutationFn: (valueAdd) => deleteValueAdd(property.id, valueAdd.id),
    onSuccess: () => {
      invalidate();
      toast.success("Value add removed");
    },
    onError: (error) => toast.error(error?.message || "Could not remove the value add"),
  });

  const valueAdds = data?.valueAdds || [];
  const currency = data?.currency || "GHS";
  const pending = saveMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <>
      <AvailabilityPropertyBar
        property={property}
        properties={properties}
        onSelect={selectProperty}
      >
        <StaysButton
          variant="primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          disabled={!property}
        >
          + Add value add
        </StaysButton>
      </AvailabilityPropertyBar>

      {!property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then add optional extras.
          </StaysEmptyState>
        </StaysCard>
      ) : loadingValueAdds ? (
        <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />
      ) : valueAdds.length === 0 ? (
        <StaysCard>
          <StaysEmptyState title="No value adds yet">
            Add breakfast, airport pickup or late checkout so guests can include them when booking.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {valueAdds.map((valueAdd) => (
            <StaysCard key={valueAdd.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{valueAdd.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        valueAdd.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {valueAdd.isActive ? "Offered" : "Hidden"}
                    </span>
                  </div>
                  {valueAdd.description && (
                    <p className="mt-1 text-sm text-slate-500">{valueAdd.description}</p>
                  )}
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    {formatMoney(valueAdd.price, currency)}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {unitLabel(valueAdd.unit)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StaysButton
                  size="small"
                  onClick={() => {
                    setEditing(valueAdd);
                    setModalOpen(true);
                  }}
                  disabled={pending}
                >
                  Edit
                </StaysButton>
                <StaysButton
                  size="small"
                  onClick={() => toggleMutation.mutate(valueAdd)}
                  disabled={pending}
                >
                  {valueAdd.isActive ? "Hide" : "Offer"}
                </StaysButton>
                <StaysButton
                  size="small"
                  variant="danger"
                  onClick={() => deleteMutation.mutate(valueAdd)}
                  disabled={pending}
                >
                  Delete
                </StaysButton>
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
        title={editing ? "Edit value add" : "Add value add"}
        description="Optional extras are priced in the property's currency."
      >
        <ValueAddForm
          key={editing?.id || "new"}
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
