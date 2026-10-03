import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import PropertyGroupIcon from "../components/PropertyGroupIcon";
import { PROPERTY_GROUPS } from "../config/constants";

/**
 * The confirmation that closes the One-apartment Quick start path — Booking's
 * "You're listing: … Does this sound like your property?" screen.
 *
 * Only reachable with `?scope=one` (the Multiple path answers its questions
 * inline and skips it). Continue moves on to the other-listings question,
 * where the draft is actually created; "No, I need to make a change" returns
 * to the scope screen with the answer kept.
 */
export default function PropertyConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === searchParams.get("group")) ||
    PROPERTY_GROUPS.find((entry) => entry.quickStart) ||
    PROPERTY_GROUPS[0];
  const noun = group.scope || { singular: group.label.toLowerCase(), plural: group.label.toLowerCase() };
  const isOne = searchParams.get("scope") === "one";
  const draftParam = searchParams.get("draft");

  // Deep links or a stale back button without an answer go back to the question.
  if (!isOne) {
    return <Navigate to={`/stays/properties/build/quick-start?group=${group.id}`} replace />;
  }

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white px-5 py-10 text-center md:px-10 md:py-14">
        <p className="text-sm text-slate-600 md:text-base">You&apos;re listing:</p>

        <PropertyGroupIcon group={group.id} size={96} className="mx-auto mt-6 block text-emerald-600" />

        <h1 className="mx-auto mt-6 max-w-3xl text-2xl font-bold leading-tight text-slate-800 md:text-[32px]">
          One {noun.singular} where guests can book the entire place
        </h1>

        <p className="mt-6 text-base text-slate-600 md:text-lg">
          Does this sound like your property?
        </p>

        <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col gap-3 md:mt-12">
          <StaysButton
            variant="primary"
            className="h-14 w-full text-base"
            onClick={() =>
              navigate(
                `/stays/properties/build/quick-start/other-listings?group=${group.id}&scope=one${draftParam ? `&draft=${draftParam}` : ""}`,
              )
            }
          >
            Continue
          </StaysButton>
          <StaysButton
            className="h-14 w-full text-base"
            onClick={() =>
              navigate(
                `/stays/properties/build/quick-start?group=${group.id}&scope=one${draftParam ? `&draft=${draftParam}` : ""}`,
              )
            }
          >
            No, I need to make a change
          </StaysButton>
        </div>
      </div>
    </StaysBuilderFrame>
  );
}
