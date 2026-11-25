import { useMutation, useQueryClient } from "@tanstack/react-query";
import StaysCard from "../StaysCard";
import StaysEmptyState from "../StaysEmptyState";
import RatePlanCards from "../RatePlanCards";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { STAYS_KEYS, deleteRatePlan, saveRatePlan } from "../../api";

/**
 * Rate plans — the same grouped editor as the top-level Rate page, kept under
 * Availability for users who manage rates while working the calendar. The
 * route guard for this section additionally requires `stays.rates`.
 */
export default function RatePlansSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property?.id) });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.ratePlans(property?.id) });
    queryClient.invalidateQueries({ queryKey: ["stays", "calendar"] });
  };

  const saveMutation = useMutation({
    mutationFn: (plan) => saveRatePlan(property.id, plan),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (plan) => deleteRatePlan(property.id, plan.id),
    onSuccess: invalidate,
  });

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <>
      <AvailabilityPropertyBar
        property={property}
        properties={properties}
        onSelect={selectProperty}
      />

      {property ? (
        <RatePlanCards
          property={property}
          onSavePlan={(plan) => saveMutation.mutateAsync(plan)}
          onDeletePlan={(plan) => deleteMutation.mutateAsync(plan)}
          emptyState={
            <StaysCard>
              <StaysEmptyState title="Add a room before creating rate plans">
                Rooms & units live under Properties → Edit listing.
              </StaysEmptyState>
            </StaysCard>
          }
        />
      ) : (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add your first listing.
          </StaysEmptyState>
        </StaysCard>
      )}
    </>
  );
}
