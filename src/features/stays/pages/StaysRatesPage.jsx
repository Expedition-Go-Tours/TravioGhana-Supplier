import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysButton from "../components/StaysButton";
import StaysCard from "../components/StaysCard";
import StaysEmptyState from "../components/StaysEmptyState";
import RatePlanCards from "../components/RatePlanCards";
import RatePlanModal from "../components/RatePlanModal";
import StaysPropertySelect from "../components/StaysPropertySelect";
import { usePropertyContext } from "../hooks/usePropertyContext";
import { STAYS_KEYS, saveRatePlan, deleteRatePlan } from "../api";

/**
 * Rates & availability — manage the bookable rate plans per room type.
 * Opens the same plan modal as builder step 4; deletion keeps the prototype's
 * rule that every room retains at least one plan (enforced by the API layer,
 * surfaced here as a toast).
 */
export default function StaysRatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [modal, setModal] = useState(null); // { room, plan? }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property?.id) });
  };

  const saveMutation = useMutation({
    mutationFn: (plan) => saveRatePlan(property.id, plan),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (plan) => deleteRatePlan(property.id, plan.id),
    onSuccess: invalidate,
  });

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Rates & availability"
        subtitle={
          property
            ? `Manage bookable rate plans for ${property.name}.`
            : "Add a property and a room before creating rate plans."
        }
        actions={
          <>
            <StaysPropertySelect
              properties={properties}
              value={property?.id}
              onChange={selectProperty}
              className="w-auto min-w-[200px] py-2 text-sm"
            />
            <StaysButton onClick={() => navigate("/stays/availability")}>Open calendar</StaysButton>
          </>
        }
      />

      {isLoading ? (
        <StaysCard className="min-h-[200px] animate-pulse bg-white/60" />
      ) : property ? (
        <RatePlanCards
          property={property}
          onAddPlan={(room) => setModal({ room, openKey: Date.now() })}
          onEditPlan={(room, plan) => setModal({ room, plan, openKey: Date.now() })}
          emptyState={
            <StaysCard>
              <StaysEmptyState title="Add a room before creating rate plans">
                Rooms & units live under Properties → Edit listing, or the Rooms & units page.
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

      <RatePlanModal
        key={modal?.openKey}
        open={Boolean(modal)}
        room={modal?.room}
        plan={modal?.plan}
        onClose={() => setModal(null)}
        onSave={(plan) => saveMutation.mutateAsync(plan)}
        onDelete={(plan) => deleteMutation.mutateAsync(plan)}
      />
    </StaysSurface>
  );
}
