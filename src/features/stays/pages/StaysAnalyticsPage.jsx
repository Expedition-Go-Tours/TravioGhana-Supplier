import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysStatCard from "../components/StaysStatCard";
import StaysButton from "../components/StaysButton";
import StaysRow from "../components/StaysRow";
import StaysEmptyState from "../components/StaysEmptyState";
import StaysResponsiveTable from "../components/StaysResponsiveTable";
import { fetchStaysAnalytics, STAYS_KEYS } from "../api";
import { formatMoney } from "../utils/money";

/**
 * Analytics — the Stays workspace's own reporting page (separate from the
 * Experiences analytics): booking and revenue tiles, the monthly trend, a
 * per-property breakdown and the best sellers. Period buttons re-query the
 * supplier analytics endpoint, mirroring the cancellation page's controls.
 */
export default function StaysAnalyticsPage() {
  const [period, setPeriod] = useState("90 days");

  const { data, isLoading } = useQuery({
    queryKey: STAYS_KEYS.analytics(period),
    queryFn: () => fetchStaysAnalytics({ period }),
    staleTime: 30_000,
  });

  const trend = data?.revenueTrend || [];
  const maxTrend = Math.max(1, ...trend.map((point) => point.value));

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Analytics"
        subtitle={`Bookings and revenue performance over the last ${period}.`}
      />

      <div className="mb-[18px] flex flex-wrap gap-[9px]">
        {["30 days", "90 days", "365 days"].map((option) => (
          <StaysButton
            key={option}
            size="small"
            variant={period === option ? "primary" : "default"}
            aria-pressed={period === option}
            onClick={() => setPeriod(option)}
          >
            {option}
          </StaysButton>
        ))}
      </div>

      {isLoading ? (
        <StaysCard className="min-h-[240px] animate-pulse bg-white/60" />
      ) : (
        <>
          <div className="mb-[18px] grid grid-cols-2 gap-[10px] sm:gap-[18px] xl:grid-cols-4">
            <StaysStatCard compact label="Total bookings" value={data?.totalBookings ?? 0} />
            <StaysStatCard
              compact
              label="Gross booking value"
              value={formatMoney(data?.grossBookingValue)}
            />
            <StaysStatCard
              compact
              label="Average booking"
              value={formatMoney(data?.averageBookingValue)}
            />
            <StaysStatCard compact label="Live properties" value={data?.liveProperties ?? 0} />
          </div>

          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
            <StaysCard>
              <h2 className="text-base font-semibold text-slate-800">Revenue trend</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Illustrative monthly series while live reporting rolls out.
              </p>
              <div className="mt-5 flex h-[180px] gap-3">
                {trend.map((point) => (
                  <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">{point.value}</span>
                    <div className="flex w-full flex-1 items-end rounded-md bg-slate-100">
                      <span
                        className="block w-full rounded-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{ height: `${Math.max(6, Math.round((point.value / maxTrend) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">{point.month}</span>
                  </div>
                ))}
              </div>
            </StaysCard>

            <StaysCard>
              <h2 className="text-base font-semibold text-slate-800">Bookings by property</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Confirmed and completed reservations per listing.
              </p>
              <div className="mt-3">
                {(data?.bookingsByProperty || []).map((row) => (
                  <StaysRow key={row.id}>
                    <span className="min-w-0 truncate text-[14px] text-slate-700">{row.name}</span>
                    <strong className="text-[14px] text-slate-800 tabular-nums">{row.count}</strong>
                  </StaysRow>
                ))}
              </div>
            </StaysCard>
          </div>

          <StaysCard className="mt-[18px]">
            <h2 className="text-base font-semibold text-slate-800">Best selling properties</h2>
            <div className="mt-4">
              <StaysResponsiveTable
                ariaLabel="Best selling properties"
                columns={[
                  {
                    key: "name",
                    label: "Property",
                    render: (row) => (
                      <b className="text-sm font-medium text-slate-700">{row.name}</b>
                    ),
                  },
                  { key: "bookings", label: "Bookings", render: (row) => row.bookings },
                  {
                    key: "revenue",
                    label: "Revenue",
                    render: (row) => formatMoney(row.revenue),
                  },
                ]}
                rows={data?.bestSelling || []}
                getRowKey={(row) => row.id}
                emptyState={<StaysEmptyState title="No bookings yet" />}
              />
            </div>
          </StaysCard>
        </>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Figures cover bookings made through TravioGhana and exclude cancelled stays.
      </p>
    </StaysSurface>
  );
}
