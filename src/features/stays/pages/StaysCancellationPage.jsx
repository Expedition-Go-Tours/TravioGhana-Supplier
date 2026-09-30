import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import StaysRow from "../components/StaysRow";
import { fetchCancellationSummary, STAYS_KEYS } from "../api";

/**
 * Cancellation rate — the prototype's gauge, with the period buttons wired to
 * the API (the prototype's buttons re-rendered without filtering anything).
 * The bar is a straight 0–100% scale of the rate.
 */
export default function StaysCancellationPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: STAYS_KEYS.cancellation(days),
    queryFn: () => fetchCancellationSummary({ days }),
    staleTime: 30_000,
  });

  const rate = data?.rate ?? 0;

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Cancellation rate"
        subtitle={`Monitor booking cancellations over the last ${days} days.`}
      />

      <StaysCard>
        <div className="flex flex-wrap gap-[9px]">
          {[30, 60, 90].map((period) => (
            <StaysButton
              key={period}
              size="small"
              variant={days === period ? "primary" : "default"}
              aria-pressed={days === period}
              onClick={() => setDays(period)}
            >
              {period} days
            </StaysButton>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-6 min-h-[140px] animate-pulse" />
        ) : (
          <>
            <div className="mt-[25px] grid grid-cols-1 gap-[18px] md:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  CANCELLATION RATE
                </span>
                <h2 className="mb-2.5 mt-2.5 text-4xl font-bold tracking-tight text-slate-800">{rate}%</h2>
                <p className="m-0 text-sm leading-relaxed text-slate-500">
                  {data?.cancelled ?? 0} of {data?.total ?? 0} bookings cancelled
                </p>
              </div>
              <StaysCard>
                <StaysRow>
                  <strong className="text-[14px]">Confirmed</strong>
                  <span className="text-[14px]">{data?.byStatus?.confirmed ?? 0}</span>
                </StaysRow>
                <StaysRow>
                  <strong className="text-[14px]">Cancelled</strong>
                  <span className="text-[14px]">{data?.cancelled ?? 0}</span>
                </StaysRow>
                <StaysRow>
                  <strong className="text-[14px]">Completed</strong>
                  <span className="text-[14px]">{data?.byStatus?.completed ?? 0}</span>
                </StaysRow>
              </StaysCard>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, rate)}%` }} />
            </div>
          </>
        )}
      </StaysCard>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Real reporting excludes ineligible and guest-requested cancellations once the reporting endpoint lands.
      </p>
    </StaysSurface>
  );
}
