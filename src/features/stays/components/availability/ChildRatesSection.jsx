import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysCard from "../StaysCard";
import StaysButton from "../StaysButton";
import StaysEmptyState from "../StaysEmptyState";
import { StaysField, StaysInput, StaysSelect } from "../StaysForm";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import {
  listRatePlans,
  STAYS_KEYS,
  updateChildPricing,
} from "../../api";
import { formatMoney } from "../../utils/money";

/** Child rates — the nightly supplement for each extra child on a rate plan. */
export default function ChildRatesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [planId, setPlanId] = useState("");
  const [drafts, setDrafts] = useState({});

  const { data, isLoading: loadingPlans } = useQuery({
    queryKey: STAYS_KEYS.ratePlans(property?.id),
    queryFn: () => listRatePlans(property.id),
    enabled: Boolean(property?.id),
    staleTime: 15_000,
  });

  const plans = useMemo(() => data?.ratePlans || [], [data]);
  const rooms = useMemo(() => data?.rooms || property?.rooms || [], [data, property]);
  const currency = data?.currency || "GHS";

  const planOptions = useMemo(
    () =>
      plans.map((plan) => {
        const room = rooms.find((row) => row.id === plan.roomId);
        return {
          value: plan.id,
          label: `${room?.name || "Room"} · ${plan.name || "Rate plan"}`,
        };
      }),
    [plans, rooms],
  );

  const activePlan = plans.find((plan) => plan.id === planId) || plans[0] || null;
  const activeRoom = rooms.find((room) => room.id === activePlan?.roomId);

  const extraChild = activePlan
    ? drafts[activePlan.id] ?? activePlan.extraChild ?? 0
    : 0;

  const mutation = useMutation({
    mutationFn: () =>
      updateChildPricing(property.id, activePlan.id, { extraChild: Number(extraChild) || 0 }),
    onSuccess: () => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[activePlan.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.ratePlans(property?.id) });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
      toast.success("Child rate saved");
    },
    onError: (error) => toast.error(error?.message || "Could not save the child rate"),
  });

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <>
      <AvailabilityPropertyBar
        property={property}
        properties={properties}
        onSelect={(id) => {
          selectProperty(id);
          setPlanId("");
          setDrafts({});
        }}
      />

      {!property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then configure child rates.
          </StaysEmptyState>
        </StaysCard>
      ) : loadingPlans ? (
        <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />
      ) : !activePlan ? (
        <StaysCard>
          <StaysEmptyState title="No rate plans yet">
            Add a rate plan before setting a child rate.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
          <StaysCard>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-800">Child rates</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeRoom?.name || "Room"} · {activePlan.name || "Rate plan"} ·{" "}
                {formatMoney(activePlan.price ?? activeRoom?.price ?? 0, currency)} base nightly
              </p>
            </div>

            <StaysField label="Rate plan">
              <StaysSelect
                options={planOptions}
                value={activePlan.id}
                onChange={(event) => setPlanId(event.target.value)}
              />
            </StaysField>

            <div className="mt-4 max-w-sm">
              <StaysField
                label="Extra child (GHS/night)"
                hint="Charged for each child above the room's included occupancy."
              >
                <StaysInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraChild}
                  onChange={(event) =>
                    activePlan &&
                    setDrafts((current) => ({ ...current, [activePlan.id]: event.target.value }))
                  }
                />
              </StaysField>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <StaysButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save child rate"}
              </StaysButton>
            </div>
          </StaysCard>

          <StaysCard className="bg-slate-50/60">
            <h3 className="text-sm font-semibold text-slate-800">What this changes</h3>
            <p className="mt-2 text-sm text-slate-600">
              Each extra child on this rate plan adds{" "}
              <strong className="text-slate-800">{formatMoney(extraChild || 0, currency)}</strong> per night.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Child rates are saved alongside the plan, so they survive later edits to guest pricing.
            </p>
          </StaysCard>
        </div>
      )}
    </>
  );
}
