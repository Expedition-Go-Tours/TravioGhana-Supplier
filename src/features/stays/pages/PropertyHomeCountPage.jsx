import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import PropertyScopeIcon from "../components/PropertyScopeIcon";
import { categoryByType, PROPERTY_GROUPS } from "../config/constants";
import { createProperty, updateProperty, STAYS_KEYS } from "../api";

/**
 * The category chains' "how many are you listing?" page — Booking's owner
 * question, worded for the category chosen on the previous screen. Continue
 * creates the draft with the type, booking type and listing scope, then opens
 * the builder at the Location step — Step 1 is fully answered by this chain.
 *
 * `booking=entire` (Homes → Entire place) uses the short labels; the private
 * and hotel (`booking=rooms`) chains keep the "with one or multiple rooms"
 * wording. Back returns to the chain that led here.
 */

const SCOPES = { one: "One property", multiple: "Multiple properties" };
const BOOKING_TYPES = {
  entire: "Entire property",
  private: "Individual rooms",
  rooms: "Individual rooms",
};

function ScopeCard({ label, icon, selected, onSelect }) {
  return (
    <label
      className={`relative flex cursor-pointer items-center gap-5 rounded-xl border-2 p-5 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 md:gap-6 md:p-6 ${
        selected
          ? "border-emerald-600 bg-emerald-50/30"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name="listingScope"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <PropertyScopeIcon
        variant={icon}
        className="h-14 w-14 shrink-0 text-emerald-600 md:h-16 md:w-16"
      />
      <span className="min-w-0 flex-1 text-base text-slate-800 md:text-lg">{label}</span>
      {selected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-3 -top-3 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow-sm ring-4 ring-white"
        >
          <Check size={16} strokeWidth={3} />
        </span>
      )}
    </label>
  );
}

export default function PropertyHomeCountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState(null);

  const draftParam = searchParams.get("draft");
  const bookingParam = searchParams.get("booking");
  const booking =
    bookingParam === "private" || bookingParam === "rooms" ? bookingParam : "entire";
  const type = searchParams.get("type") || "Holiday home";
  const category = categoryByType(type) || {
    type,
    singular: type.toLowerCase(),
    plural: `${type.toLowerCase()}s`,
  };
  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === searchParams.get("group")) ||
    PROPERTY_GROUPS.find((entry) => entry.id === "homes") ||
    PROPERTY_GROUPS[0];
  const fromHotel = group.id === "hotel";
  const fromAlternative = group.id === "alternative";

  // Booking words the two paths differently: an entire place is simply one or
  // many of that category, while a room-based listing names the rooms it offers.
  const oneLabel =
    booking === "entire"
      ? `One ${category.singular}`
      : `One ${category.singular} with one or multiple rooms that guests can book`;
  const multipleLabel =
    booking === "entire"
      ? `Multiple ${category.plural}`
      : `Multiple ${category.plural} with one or multiple rooms that guests can book`;

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: category.type,
        bookingType: BOOKING_TYPES[booking],
        listingScope: SCOPES[scope],
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
      navigate(
        draftParam
          ? `/stays/properties/build/${property.id}`
          : `/stays/properties/build/${property.id}?section=basic-information&step=location`,
      );
    },
    onError: () => toast.error("Could not start your property listing"),
  });

  const handleContinue = () => {
    if (!scope || createMutation.isPending) return;
    createMutation.mutate();
  };

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
          How many {category.plural} are you listing?
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-7">
          <div className="space-y-4" role="radiogroup" aria-label={`How many ${category.plural} are you listing?`}>
            <ScopeCard
              label={oneLabel}
              icon="single"
              selected={scope === "one"}
              onSelect={() => setScope("one")}
            />
            <ScopeCard
              label={multipleLabel}
              icon="multiple"
              selected={scope === "multiple"}
              onSelect={() => setScope("multiple")}
            />
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <StaysButton
            aria-label="Back"
            onClick={() =>
              navigate(
                fromAlternative
                  ? `/stays/properties/build/alternative-category?group=${group.id}&booking=${booking}${draftParam ? `&draft=${draftParam}` : ""}`
                  : fromHotel
                    ? `/stays/properties/build/hotel-category?group=${group.id}${draftParam ? `?draft=${draftParam}` : ""}`
                    : `/stays/properties/build/home-category?group=${group.id}&booking=${booking}${draftParam ? `&draft=${draftParam}` : ""}`,
              )
            }
            className="h-14 w-14 shrink-0 p-0"
          >
            <ChevronLeft size={20} />
          </StaysButton>
          <StaysButton
            variant="primary"
            className="h-14 flex-1 text-base"
            disabled={!scope || createMutation.isPending}
            onClick={handleContinue}
          >
            {createMutation.isPending ? "Starting…" : "Continue"}
          </StaysButton>
        </div>
      </div>
    </StaysBuilderFrame>
  );
}
