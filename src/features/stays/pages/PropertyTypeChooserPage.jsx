import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import PropertyGroupIcon from "../components/PropertyGroupIcon";
import { PROPERTY_GROUPS } from "../config/constants";
import { createProperty, updateProperty, STAYS_KEYS } from "../api";

/**
 * The "list your property" landing page — the first thing a supplier sees
 * after clicking Add property, mirroring Booking.com's category chooser.
 * It renders as step 1 of the property builder ("Category & property type")
 * inside the builder frame, with the wizard sidebar visible.
 *
 * Every card detours through its own intro chain (Apartment's quick start,
 * Homes' booking type, Hotel's category list, Alternative places' booking
 * type + category list), where the draft is created with the chosen type. The
 * direct path is the fallback for a group without an intro screen: it creates
 * the draft with the group's canonical default type and opens the builder at
 * the Location step. The brand's emerald stands in for Booking's blue.
 *
 * Arriving with `?draft=<id>` (clicking step 1 in the builder sidebar) reopens
 * the chain to edit that draft: the chain carries the id along and updates the
 * existing draft instead of creating a new one.
 */
function GroupCard({ group, busy, disabled, onStart, className = "" }) {
  return (
    <div
      className={`flex h-full flex-col items-center bg-white px-5 pb-6 pt-8 text-center ${className}`}
    >
      <PropertyGroupIcon group={group.id} className="text-emerald-600" />
      <h2 className="mt-4 text-base font-bold text-slate-800">{group.label}</h2>
      <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500">
        {group.description}
      </p>
      <StaysButton
        variant="primary"
        className="mt-auto w-full"
        onClick={() => onStart(group)}
        disabled={disabled}
        aria-busy={busy}
        aria-label={`List your property: ${group.label}`}
      >
        {busy ? "Starting…" : "List your property"}
      </StaysButton>
    </div>
  );
}

export default function PropertyTypeChooserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [starting, setStarting] = useState(null);
  const draftParam = searchParams.get("draft");

  const startMutation = useMutation({
    mutationFn: (group) =>
      draftParam
        ? updateProperty(draftParam, { type: group.defaultType })
        : createProperty({ type: group.defaultType, step: 1 }),
    onSuccess: (property) => {
      queryClient.setQueryData(STAYS_KEYS.property(property.id), property);
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      navigate(
        draftParam
          ? `/stays/properties/build/${property.id}`
          : `/stays/properties/build/${property.id}?section=basic-information&step=location`,
      );
    },
    onError: () => toast.error("Could not start your property listing"),
    onSettled: () => setStarting(null),
  });

  const start = (group) => {
    // Groups with an intro screen (the Quick start Apartment card) answer one
    // question before the builder opens — no draft exists until they continue.
    if (group.introPath) {
      navigate(
        `${group.introPath}?group=${group.id}${draftParam ? `&draft=${draftParam}` : ""}`,
      );
      return;
    }
    if (startMutation.isPending) return;
    setStarting(group.id);
    startMutation.mutate(group);
  };

  const [quickStart, ...rest] = PROPERTY_GROUPS;

  return (
    // Step 1 of the builder: the four category cards under the builder chrome,
    // with the wizard sidebar visible (inert until a draft exists).
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center">
        <h1 className="text-2xl font-bold leading-tight text-slate-800 md:text-[32px]">
          List your property on TravioGhana and start welcoming guests in no time!
        </h1>
        <p className="mt-3 text-base text-slate-600 md:text-lg">
          To get started, choose the type of property you want to list on TravioGhana
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 xl:mt-12 xl:grid-cols-4">
          <div className="relative h-full min-w-0 rounded-xl border border-slate-200 bg-white xl:col-span-1">
            {quickStart.quickStart && (
              <span className="absolute -top-3 left-5 z-10 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                <Zap size={12} aria-hidden="true" />
                Quick start
              </span>
            )}
            <GroupCard
              group={quickStart}
              busy={starting === quickStart.id}
              disabled={startMutation.isPending}
              onStart={start}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-3 md:divide-x md:divide-y-0 xl:col-span-3">
            {rest.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                busy={starting === group.id}
                disabled={startMutation.isPending}
                onStart={start}
              />
            ))}
          </div>
        </div>
      </div>
    </StaysBuilderFrame>
  );
}
