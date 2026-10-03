import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import PropertyScopeIcon from "../components/PropertyScopeIcon";
import { PROPERTY_GROUPS } from "../config/constants";

/**
 * The Homes and Alternative places cards' intro screen — Booking's "What can
 * guests book?" page.
 *
 * Continue moves on to the group's sub-type list (Homes → the entire-place or
 * private-room categories; Alternative places → the campsite/boat/luxury-tent
 * list), where the draft is finally created, so backing out of either screen
 * leaves nothing behind. Returning from the sub-type screen restores the
 * answer from `?booking=`.
 */

const BOOK_OPTIONS = [
  {
    value: "Entire property",
    slug: "entire",
    title: "Entire place",
    description:
      "Guests are able to use the entire place and do not have to share this with the host or other guests.",
    icon: "entirePlace",
  },
  {
    value: "Individual rooms",
    slug: "private",
    title: "A private room",
    description:
      "Guests rent a room within the property. There are common areas that are either shared with the host or other guests.",
    icon: "privateRoom",
  },
];

function BookTypeCard({ option, selected, onSelect }) {
  return (
    <label
      className={`relative flex cursor-pointer items-start gap-5 rounded-xl border-2 p-5 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 md:gap-6 md:p-6 ${
        selected
          ? "border-emerald-600 bg-emerald-50/30"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name="bookingType"
        value={option.value}
        checked={selected}
        onChange={() => onSelect(option.value)}
        className="sr-only"
      />
      <PropertyScopeIcon
        variant={option.icon}
        className="h-14 w-14 shrink-0 text-emerald-600 md:h-16 md:w-16"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-slate-900 md:text-lg">{option.title}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-slate-600 md:text-base">
          {option.description}
        </span>
      </span>
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

export default function PropertyBookTypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === searchParams.get("group")) ||
    PROPERTY_GROUPS.find((entry) => entry.id === "homes") ||
    PROPERTY_GROUPS[0];
  const draftParam = searchParams.get("draft");

  // Returning from the sub-type screen restores the answered booking type.
  const [bookingType, setBookingType] = useState(() => {
    const booking = searchParams.get("booking");
    if (booking === "entire") return "Entire property";
    if (booking === "private") return "Individual rooms";
    return null;
  });

  const selectedOption = BOOK_OPTIONS.find((option) => option.value === bookingType);

  const handleContinue = () => {
    if (!selectedOption) return;
    const target =
      group.id === "alternative"
        ? "/stays/properties/build/alternative-category"
        : "/stays/properties/build/home-category";
    navigate(
      `${target}?group=${group.id}&booking=${selectedOption.slug}${draftParam ? `&draft=${draftParam}` : ""}`,
    );
  };

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
          What can guests book?
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-7">
          <div className="space-y-4" role="radiogroup" aria-label="What can guests book?">
            {BOOK_OPTIONS.map((option) => (
              <BookTypeCard
                key={option.value}
                option={option}
                selected={bookingType === option.value}
                onSelect={setBookingType}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <StaysButton
            aria-label="Back"
            onClick={() =>
              navigate(
                `/stays/properties/build${draftParam ? `?draft=${draftParam}` : ""}`,
              )
            }
            className="h-14 w-14 shrink-0 p-0"
          >
            <ChevronLeft size={20} />
          </StaysButton>
          <StaysButton
            variant="primary"
            className="h-14 flex-1 text-base"
            disabled={!bookingType}
            onClick={handleContinue}
          >
            Continue
          </StaysButton>
        </div>
      </div>
    </StaysBuilderFrame>
  );
}
