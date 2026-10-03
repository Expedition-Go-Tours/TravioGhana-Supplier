import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, CircleHelp } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import StaysModal, { StaysModalClose } from "../components/StaysModal";
import {
  ENTIRE_PLACE_CATEGORIES,
  PRIVATE_ROOM_CATEGORIES,
  PROPERTY_GROUPS,
} from "../config/constants";

/**
 * The Homes sub-type screen — Booking's "From the list below, which property
 * category is most similar to your place?" page. Which list shows depends on
 * the booking type picked on the previous screen (`?booking=entire|private`);
 * choosing a card and continuing creates the draft with that canonical type
 * and opens builder Step 1 filtered to the Homes group.
 *
 * "I don't see my property type on the list" opens the reference's
 * reassurance dialog.
 */

function CategoryCard({ category, selected, onSelect }) {  return (
    <label
      className={`relative flex h-full cursor-pointer flex-col rounded-xl border-2 p-5 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 ${
        selected
          ? "border-emerald-600 bg-emerald-50/30"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name="propertyCategory"
        value={category.type}
        checked={selected}
        onChange={() => onSelect(category.type)}
        className="sr-only"
      />
      <span className="block text-base font-bold text-slate-900 md:text-lg">
        {category.type}
      </span>
      <span className="mt-2 block text-sm leading-relaxed text-slate-600 md:text-base">
        {category.description}
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

export default function PropertyHomeCategoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [type, setType] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const booking = searchParams.get("booking") === "private" ? "private" : "entire";
  const categories = booking === "private" ? PRIVATE_ROOM_CATEGORIES : ENTIRE_PLACE_CATEGORIES;
  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === "homes") || PROPERTY_GROUPS[0];

  const handleContinue = () => {
    if (!type) return;
    const draftParam = searchParams.get("draft");
    navigate(
      `/stays/properties/build/home-count?group=${group.id}&booking=${booking}&type=${encodeURIComponent(type)}${draftParam ? `&draft=${draftParam}` : ""}`,
    );
  };

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
          From the list below, which property category is most similar to your place?
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-7">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="radiogroup"
            aria-label="Which property category is most similar to your place?"
          >
            {categories.map((category) => (
              <CategoryCard
                key={category.type}
                category={category}
                selected={type === category.type}
                onSelect={setType}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-2.5 rounded-lg border border-emerald-600 px-4 py-2.5 text-base font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <CircleHelp size={20} aria-hidden="true" />
            I don&apos;t see my property type on the list
          </button>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <StaysButton
            aria-label="Back"
            onClick={() =>
              navigate(
                `/stays/properties/build/book-type?group=${group.id}&booking=${booking}${searchParams.get("draft") ? `&draft=${searchParams.get("draft")}` : ""}`,
              )
            }
            className="h-14 w-14 shrink-0 p-0"
          >
            <ChevronLeft size={20} />
          </StaysButton>
          <StaysButton
            variant="primary"
            className="h-14 flex-1 text-base"
            disabled={!type}
            onClick={handleContinue}
          >
            Continue
          </StaysButton>
        </div>
      </div>

      <StaysModal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="I don't see my property type on the list"
        overlayClassName="z-[55]"
        contentClassName="z-[60]"
      >
        <StaysModalClose>
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-lg border border-emerald-600 p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </StaysModalClose>

        <p className="text-sm leading-relaxed text-slate-700 md:text-base">
          That&apos;s ok &mdash; try to choose a category that is most similar to your property. We
          use this category to help guests find your property.
        </p>
        <StaysButton
          variant="primary"
          className="mt-5"
          onClick={() => setHelpOpen(false)}
        >
          Got it
        </StaysButton>
      </StaysModal>
    </StaysBuilderFrame>
  );
}
