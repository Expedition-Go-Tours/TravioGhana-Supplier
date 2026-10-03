import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import { NO_OTHER_LISTINGS, OTHER_LISTINGS, PROPERTY_GROUPS } from "../config/constants";
import { createProperty, updateProperty, STAYS_KEYS } from "../api";

const MIN_PROPERTY_COUNT = 1;
const MAX_PROPERTY_COUNT = 100;

/** One checkbox row — the reference's simple left-aligned list. */
function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-4 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 md:gap-5">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 text-white transition-colors md:h-8 md:w-8 ${
          checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 md:text-base">{label}</span>
    </label>
  );
}

/**
 * The Quick start "Where else is your property listed?" screen. Answers
 * collected by the earlier screens ride in the URL (scope, address answer,
 * property count); this screen collects the other-listings answer and hands
 * off to the location screen, where the draft is finally created.
 *
 * "My property isn't listed on any other websites" is exclusive: picking it
 * clears the sites, and picking a site clears it.
 */
export default function PropertyOtherListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === searchParams.get("group")) ||
    PROPERTY_GROUPS.find((entry) => entry.quickStart) ||
    PROPERTY_GROUPS[0];

  const scopeParam = searchParams.get("scope");
  const listingScope =
    scopeParam === "one" ? "One property" : scopeParam === "multiple" ? "Multiple properties" : null;
  const sameAddressParam = searchParams.get("sameAddress");
  const countParam = Number.parseInt(searchParams.get("count"), 10);
  const multipleComplete =
    (sameAddressParam === "same" || sameAddressParam === "different") &&
    Number.isInteger(countParam) &&
    countParam >= MIN_PROPERTY_COUNT &&
    countParam <= MAX_PROPERTY_COUNT;
  const answersComplete =
    listingScope === "One property" ||
    (listingScope === "Multiple properties" && multipleComplete);

  // Returning from the location screen restores the ticked sites.
  const [selected, setSelected] = useState(() => {
    const listings = searchParams.get("listings");
    return listings ? listings.split(",").filter((site) => OTHER_LISTINGS.includes(site)) : [];
  });
  const [none, setNone] = useState(() => searchParams.get("none") === "1");
  const answered = none || selected.length > 0;

  const toggleSite = (site) => {
    setNone(false);
    setSelected((current) =>
      current.includes(site) ? current.filter((value) => value !== site) : [...current, site],
    );
  };

  const toggleNone = () => {
    setNone((current) => {
      if (!current) setSelected([]);
      return !current;
    });
  };

  const draftParam = searchParams.get("draft");

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: group.defaultType,
        listingScope,
        ...(listingScope === "Multiple properties"
          ? { sameAddress: sameAddressParam === "same", propertyCount: countParam }
          : {}),
        otherListings: none ? [] : selected,
        noOtherListings: none,
      };
      // Editing an existing draft (step 1 reopened from the builder) updates
      // it in place and keeps its progress; a fresh walkthrough creates the
      // draft with step 1 (category & property type) already answered.
      return draftParam
        ? updateProperty(draftParam, payload)
        : createProperty({ ...payload, step: 1 });
    },
    onSuccess: (property) => {
      queryClient.setQueryData(STAYS_KEYS.property(property.id), property);
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      // The location step lives inside the builder, under Basic Information.
      navigate(
        draftParam
          ? `/stays/properties/build/${property.id}`
          : `/stays/properties/build/${property.id}?section=basic-information&step=location`,
      );
    },
    onError: () => toast.error("Could not start your property listing"),
  });

  // Deep links or a stale back button without complete answers go back to the
  // question that feeds this screen.
  if (!answersComplete) {
    return <Navigate to={`/stays/properties/build/quick-start?group=${group.id}`} replace />;
  }

  const handleContinue = () => {
    if (!answered || createMutation.isPending) return;
    createMutation.mutate();
  };

  const handleBack = () => {
    if (listingScope === "One property") {
      navigate(
        `/stays/properties/build/quick-start/confirm?group=${group.id}&scope=one${draftParam ? `&draft=${draftParam}` : ""}`,
      );
      return;
    }
    navigate(
      `/stays/properties/build/quick-start?group=${group.id}&scope=multiple&sameAddress=${sameAddressParam}&count=${countParam}${draftParam ? `&draft=${draftParam}` : ""}`,
    );
  };

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold leading-tight text-slate-800 md:text-[32px]">
          Where else is your property listed?
        </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-8">
        <p className="text-sm leading-relaxed text-slate-600 md:text-base">
          If your property is listed on other travel sites, you can speed up registration by
          importing it directly to TravioGhana.
        </p>

        <div className="mt-6 space-y-1 md:mt-8" role="group" aria-label="Where else is your property listed?">
          {OTHER_LISTINGS.map((site) => (
            <CheckRow
              key={site}
              label={site}
              checked={selected.includes(site)}
              onChange={() => toggleSite(site)}
            />
          ))}
          <CheckRow label={NO_OTHER_LISTINGS} checked={none} onChange={toggleNone} />
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3">
        <StaysButton aria-label="Back" onClick={handleBack} className="h-14 w-14 shrink-0 p-0">
          <ChevronLeft size={20} />
        </StaysButton>
        <StaysButton
          variant="primary"
          className="h-14 flex-1 text-base"
          disabled={!answered || createMutation.isPending}
          onClick={handleContinue}
        >
          {createMutation.isPending ? "Starting…" : "Continue"}
        </StaysButton>
      </div>
      </div>
    </StaysBuilderFrame>
  );
}
