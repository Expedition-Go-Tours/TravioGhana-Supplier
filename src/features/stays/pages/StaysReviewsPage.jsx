import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysSeg from "../components/StaysSeg";
import StaysButton from "../components/StaysButton";
import StaysPill from "../components/StaysPill";
import StaysEmptyState from "../components/StaysEmptyState";
import { StaysTextarea } from "../components/StaysForm";
import { listStaysReviews, replyToStaysReview, STAYS_KEYS } from "../api";

/** Five-star score, filled up to the rating. */
function Rating({ value = 0 }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          aria-hidden="true"
          className={star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

/**
 * Reviews — guest ratings for the Stays workspace's properties, kept separate
 * from the Experiences reviews. Filter by replied state and answer in place
 * through the supplier reviews endpoint (mock-backed today).
 */
export default function StaysReviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.reviews(filter),
    queryFn: () => listStaysReviews({ filter }),
    staleTime: 20_000,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => replyToStaysReview(id, reply),
    onSuccess: (_review, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stays", "reviews"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      setDrafts((current) => ({ ...current, [variables.id]: "" }));
      setOpenId(null);
      toast.success("Reply published");
    },
    onError: () => toast.error("Could not publish the reply"),
  });

  const send = (review) => {
    const reply = (drafts[review.id] || "").trim();
    if (!reply || replyMutation.isPending) return;
    replyMutation.mutate({ id: review.id, reply });
  };

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Reviews"
        subtitle="What guests say about your properties — and your replies."
      />

      <StaysSeg
        className="mb-4"
        ariaLabel="Filter reviews"
        options={["All", "Replied", "Unreplied"].map((status) => ({
          value: status,
          label: status,
        }))}
        value={filter}
        onChange={setFilter}
      />

      {isLoading ? (
        <StaysCard className="min-h-[200px] animate-pulse bg-white/60" />
      ) : reviews.length ? (
        <div className="grid grid-cols-1 gap-[14px]">
          {reviews.map((review) => {
            const replied = Boolean(review.reply);
            const replying = openId === review.id;
            return (
              <StaysCard key={review.id} data-review-card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-slate-800">
                        {review.guest}
                      </strong>
                      <Rating value={review.rating} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.text}</p>
                  </div>
                  <StaysPill tone={replied ? "green" : "amber"}>
                    {replied ? "Replied" : "Needs reply"}
                  </StaysPill>
                </div>

                {replied ? (
                  <div className="mt-3 rounded-lg bg-emerald-50/60 px-3.5 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      Your reply
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{review.reply}</p>
                  </div>
                ) : replying ? (
                  <div className="mt-3 space-y-2.5">
                    <StaysTextarea
                      aria-label={`Reply to ${review.guest}`}
                      rows={3}
                      placeholder="Write a public reply…"
                      value={drafts[review.id] || ""}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [review.id]: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <StaysButton
                        variant="primary"
                        size="small"
                        disabled={replyMutation.isPending}
                        onClick={() => send(review)}
                      >
                        Publish reply
                      </StaysButton>
                      <StaysButton size="small" onClick={() => setOpenId(null)}>
                        Cancel
                      </StaysButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <StaysButton size="small" onClick={() => setOpenId(review.id)}>
                      Reply
                    </StaysButton>
                  </div>
                )}
              </StaysCard>
            );
          })}
        </div>
      ) : (
        <StaysCard>
          <StaysEmptyState title="No reviews in this view">
            Guest reviews appear here after each completed stay.
          </StaysEmptyState>
        </StaysCard>
      )}
    </StaysSurface>
  );
}
