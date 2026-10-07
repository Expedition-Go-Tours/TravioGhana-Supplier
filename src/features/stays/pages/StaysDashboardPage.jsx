import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Home, Ticket, TrendingUp } from "lucide-react";
import { StatCardSkeleton, TableSkeleton } from "@/components/shared/Skeleton";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysStatCard from "../components/StaysStatCard";
import StaysButton from "../components/StaysButton";
import StaysPill from "../components/StaysPill";
import StaysRow from "../components/StaysRow";
import StaysResponsiveTable from "../components/StaysResponsiveTable";
import { fetchStaysDashboard, STAYS_KEYS } from "../api";
import { formatMoney } from "../utils/money";
import { formatStayShort } from "../utils/dates";
import { statusTone } from "../utils/status";

/**
 * The Stays landing page — the prototype's Overview, with its four live KPI
 * tiles, recent reservations, an "Action required" checklist, quick links and
 * the top-properties / cancellation-rate pair. All numbers come from
 * `GET /stays/supplier/dashboard` (mock dataset until the endpoint ships).
 */
function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning, partner";
  if (hour < 17) return "Good afternoon, partner";
  return "Good evening, partner";
}

export default function StaysDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: STAYS_KEYS.dashboard,
    queryFn: fetchStaysDashboard,
    staleTime: 30_000,
  });

  const heading = (
    <StaysPageHeader
      title={greetingFor()}
      subtitle="Here is what is happening across your stays."
      actions={
        <StaysButton variant="primary" onClick={() => navigate("/stays/properties/build")}>
          + List a property
        </StaysButton>
      }
    />
  );

  if (isLoading) {
    return (
      <StaysSurface>
        {heading}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton count={4} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4">
          <StaysCard>
            <TableSkeleton rows={3} columns={4} />
          </StaysCard>
        </div>
      </StaysSurface>
    );
  }

  if (isError) {
    return (
      <StaysSurface>
        {heading}
        <StaysCard className="text-center">
          <p className="text-sm font-semibold text-slate-700">We could not load your dashboard</p>
          <p className="mb-4 mt-1 text-sm text-slate-500">Check your connection and try again.</p>
          <StaysButton variant="primary" onClick={() => refetch()}>
            Try again
          </StaysButton>
        </StaysCard>
      </StaysSurface>
    );
  }

  const { stats, currency, cancellation, actionRequired, recentBookings, topProperties } = data;
  const draft = actionRequired.draftProperties > 0;

  return (
    <StaysSurface>
      {heading}

      {draft && (
        <div className="mb-5 flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <strong className="text-sm font-semibold text-emerald-900">
              {`Continue setting up your draft ${actionRequired.draftProperties === 1 ? "property" : "properties"}`}
            </strong>
            <p className="mt-1 text-sm text-emerald-800/80">Your progress is saved as you go.</p>
          </div>
          <StaysButton variant="primary" onClick={() => navigate("/stays/properties")}>
            Continue setup
          </StaysButton>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaysStatCard
          icon={<CalendarDays size={16} />}
          label="Upcoming arrivals"
          value={stats.upcomingArrivals}
          hint="Based on sample reservations"
        />
        <StaysStatCard
          icon={<Ticket size={16} />}
          label="New reservations"
          value={stats.newReservations}
          hint="Needs attention"
          accent="amber"
        />
        <StaysStatCard
          icon={<Home size={16} />}
          label="Live properties"
          value={stats.liveProperties}
          hint="Available to book"
        />
        <StaysStatCard
          icon={<TrendingUp size={16} />}
          label="Gross booking value"
          value={formatMoney(stats.grossBookingValue, currency)}
          hint="Sample bookings"
        />
      </div>

      {/* Recent reservations + action required */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)]">
        <StaysCard>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Recent reservations</h3>
          <StaysResponsiveTable
            ariaLabel="Recent reservations"
            columns={[
              {
                key: "guest",
                label: "Guest",
                render: (booking) => (
                  <span>
                    <b className="text-sm font-medium text-slate-700">{booking.guest}</b>
                    <br />
                    <small className="text-xs text-slate-400">{booking.id}</small>
                  </span>
                ),
              },
              {
                key: "stay",
                label: "Stay",
                render: (booking) => formatStayShort(booking.from, booking.to),
              },
              { key: "propertyName", label: "Property" },
              {
                key: "status",
                label: "Status",
                render: (booking) => <StaysPill tone={statusTone(booking.status)}>{booking.status}</StaysPill>,
              },
            ]}
            rows={recentBookings}
            onRowClick={() => navigate("/stays/bookings")}
          />
          <div className="mt-4">
            <StaysButton size="small" onClick={() => navigate("/stays/bookings")}>
              View reservations
            </StaysButton>
          </div>
        </StaysCard>

        <StaysCard>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Action required</h3>
          <StaysRow>
            <div>
              <strong className="text-sm font-medium text-slate-700">Guest messages</strong>
              <small className="mt-0.5 block text-xs text-slate-500">
                {actionRequired.messagesAwaitingReply} waiting for a reply
              </small>
            </div>
            <StaysButton size="small" onClick={() => navigate("/stays/messages")}>
              Open
            </StaysButton>
          </StaysRow>
          <StaysRow>
            <div>
              <strong className="text-sm font-medium text-slate-700">New bookings</strong>
              <small className="mt-0.5 block text-xs text-slate-500">
                {actionRequired.bookingsToReview} to review
              </small>
            </div>
            <StaysButton size="small" onClick={() => navigate("/stays/bookings")}>
              Open
            </StaysButton>
          </StaysRow>
          <StaysRow>
            <div>
              <strong className="text-sm font-medium text-slate-700">Property setup</strong>
              <small className="mt-0.5 block text-xs text-slate-500">
                {draft ? "Draft awaiting completion" : "All properties completed"}
              </small>
            </div>
            <StaysButton size="small" onClick={() => navigate("/stays/properties")}>
              View
            </StaysButton>
          </StaysRow>
        </StaysCard>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Manage availability",
            copy: "Update room inventory and nightly rates.",
            cta: "Open Calendar",
            to: "/stays/availability",
          },
          {
            title: "Build your listing",
            copy: "Add rooms, rates, policies and photos.",
            cta: "Open Properties",
            to: "/stays/properties",
          },
          {
            title: "Track earnings",
            copy: "See gross bookings and a commission breakdown.",
            cta: "Open Finance",
            to: "/finance",
          },
        ].map((card) => (
          <StaysCard key={card.title}>
            <h3 className="text-sm font-semibold text-slate-800">{card.title}</h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-slate-500">{card.copy}</p>
            <StaysButton size="small" onClick={() => navigate(card.to)}>
              {card.cta}
            </StaysButton>
          </StaysCard>
        ))}
      </div>

      {/* Top properties + cancellation */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)]">
        <StaysCard>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Top properties</h3>
          {topProperties.length === 0 ? (
            <p className="text-sm text-slate-500">No properties yet.</p>
          ) : (
            topProperties.map((property, index) => (
              <StaysRow key={property.id}>
                <div>
                  <strong className="text-sm font-medium text-slate-700">{`${index + 1}. ${property.name}`}</strong>
                  <small className="mt-0.5 block text-xs text-slate-500">
                    {`${property.bookings} bookings · ${property.roomTypes} room types`}
                  </small>
                </div>
                <b className="text-sm font-semibold text-slate-800">{formatMoney(property.revenue, currency)}</b>
              </StaysRow>
            ))
          )}
        </StaysCard>

        <StaysCard>
          <h3 className="text-sm font-semibold text-slate-800">Cancellation rate</h3>
          <p className="text-xs text-slate-500">Based on {cancellation.total} sample reservations</p>
          <div className="mb-4 mt-3">
            <div className="text-4xl font-bold tracking-tight text-slate-800">{cancellation.rate}%</div>
          </div>
          <StaysButton size="small" onClick={() => navigate("/stays/cancellation")}>
            View details
          </StaysButton>
        </StaysCard>
      </div>
    </StaysSurface>
  );
}
