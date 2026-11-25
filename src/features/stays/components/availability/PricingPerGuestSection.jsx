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
  updateGuestPricing,
} from "../../api";
import { formatMoney } from "../../utils/money";

/**
 * Pricing per guest — base occupancy, the single-guest discount and the extra
 * adult nightly charge. Writes one plan's fields through the focused endpoint,
 * so a child-rate save on the next page cannot discard them.
 */
export default function PricingPerGuestSection() {
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

  const form = activePlan
    ? drafts[activePlan.id] || {
        baseGuests: activePlan.baseGuests ?? 1,
        singleGuestDiscount: activePlan.singleGuestDiscount ?? 0,
        extraAdult: activePlan.extraAdult ?? 0,
      }
    : { baseGuests: "", singleGuestDiscount: "", extraAdult: "" };

  const updateForm = (patch) => {
    if (!activePlan) return;
    setDrafts((current) => ({
      ...current,
      [activePlan.id]: {
        ...(current[activePlan.id] || {
          baseGuests: activePlan.baseGuests ?? 1,
          singleGuestDiscount: activePlan.singleGuestDiscount ?? 0,
          extraAdult: activePlan.extraAdult ?? 0,
        }),
        ...patch,
      },
    }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      updateGuestPricing(property.id, activePlan.id, {
        baseGuests: Number(form.baseGuests) || 1,
        singleGuestDiscount: Number(form.singleGuestDiscount) || 0,
        extraAdult: Number(form.extraAdult) || 0,
      }),
    onSuccess: () => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[activePlan.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.ratePlans(property?.id) });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
      toast.success("Guest pricing saved");
    },
    onError: (error) => toast.error(error?.message || "Could not save guest pricing"),
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
            Use the property builder to add a listing, then configure guest pricing.
          </StaysEmptyState>
        </StaysCard>
      ) : loadingPlans ? (
        <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />
      ) : !activePlan ? (
        <StaysCard>
          <StaysEmptyState title="No rate plans yet">
            Add a rate plan before setting per-guest pricing.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
          <StaysCard>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-800">Pricing per guest</h2>
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

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <StaysField label="Guests in base rate">
                <StaysInput
                  type="number"
                  min="1"
                  step="1"
                  value={form.baseGuests}
                  onChange={(event) => updateForm({ baseGuests: event.target.value })}
                />
              </StaysField>
              <StaysField label="Single guest discount (GHS/night)">
                <StaysInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.singleGuestDiscount}
                  onChange={(event) =>
                    updateForm({ singleGuestDiscount: event.target.value })
                  }
                />
              </StaysField>
              <StaysField label="Extra adult (GHS/night)">
                <StaysInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.extraAdult}
                  onChange={(event) => updateForm({ extraAdult: event.target.value })}
                />
              </StaysField>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <StaysButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save guest pricing"}
              </StaysButton>
            </div>
          </StaysCard>

          <StaysCard className="bg-slate-50/60">
            <h3 className="text-sm font-semibold text-slate-800">How this is charged</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex justify-between gap-3">
                <span>Guests included</span>
                <strong className="text-slate-800">{form.baseGuests || 1}</strong>
              </li>
              <li className="flex justify-between gap-3">
                <span>Single guest discount</span>
                <strong className="text-slate-800">
                  {formatMoney(form.singleGuestDiscount || 0, currency)}
                </strong>
              </li>
              <li className="flex justify-between gap-3">
                <span>Each extra adult</span>
                <strong className="text-slate-800">{formatMoney(form.extraAdult || 0, currency)}</strong>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              These values apply to every night sold on this rate plan and are enforced when a booking is priced.
            </p>
          </StaysCard>
        </div>
      )}
    </>
  );
}
