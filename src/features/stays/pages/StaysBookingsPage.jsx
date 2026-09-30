import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysSeg from "../components/StaysSeg";
import StaysPill from "../components/StaysPill";
import StaysEmptyState from "../components/StaysEmptyState";
import StaysResponsiveTable from "../components/StaysResponsiveTable";
import BookingModal from "../components/BookingModal";
import { listStaysBookings, updateBookingStatus, STAYS_KEYS } from "../api";
import { BOOKING_STATUSES, statusTone } from "../utils/status";
import { formatStayShort } from "../utils/dates";
import { formatMoney } from "../utils/money";

/**
 * Bookings — the guest stays list. Filters match the prototype (plus All),
 * rows open the reservation editor, and the table collapses to cards below
 * `md` (the responsive fix that replaces the prototype's 650px scroll table).
 */
export default function StaysBookingsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null); // { booking, openKey }

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.bookings(),
    queryFn: () => listStaysBookings(),
    staleTime: 20_000,
  });

  const shown = useMemo(
    () => bookings.filter((booking) => filter === "All" || booking.status === filter),
    [bookings, filter],
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "bookings"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      toast.success("Reservation updated");
    },
    onError: () => toast.error("Could not update the reservation"),
  });

  return (
    <StaysSurface>
      <StaysPageHeader title="Bookings" subtitle="Review guest stays and update booking status." />

      <StaysSeg
        className="mb-4"
        ariaLabel="Filter bookings by status"
        options={["All", ...BOOKING_STATUSES].map((status) => ({ value: status, label: status }))}
        value={filter}
        onChange={setFilter}
      />

      <StaysCard>
        {isLoading ? (
          <div className="min-h-[160px] animate-pulse" />
        ) : (
          <StaysResponsiveTable
            ariaLabel="Guest reservations"
            columns={[
              {
                key: "id",
                label: "Booking",
                render: (booking) => <b className="text-sm font-medium text-slate-700">{booking.id}</b>,
              },
              {
                key: "guest",
                label: "Guest",
                render: (booking) => (
                  <span>
                    {booking.guest}
                    <br />
                    <small className="text-xs text-slate-400">{booking.guests} guests</small>
                  </span>
                ),
              },
              {
                key: "property",
                label: "Property / room",
                render: (booking) => (
                  <span>
                    {booking.propertyName || "—"}
                    <br />
                    <small className="text-xs text-slate-400">{booking.room}</small>
                  </span>
                ),
              },
              {
                key: "dates",
                label: "Dates",
                render: (booking) => formatStayShort(booking.from, booking.to),
              },
              {
                key: "amount",
                label: "Total",
                render: (booking) => formatMoney(booking.amount),
              },
              {
                key: "status",
                label: "Status",
                render: (booking) => <StaysPill tone={statusTone(booking.status)}>{booking.status}</StaysPill>,
              },
            ]}
            rows={shown}
            getRowKey={(booking) => booking.id}
            onRowClick={(booking) => setSelected({ booking, openKey: Date.now() })}
            emptyState={<StaysEmptyState title="No reservations in this status" />}
          />
        )}
      </StaysCard>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Arrival dates, room allocation and payment status stay in sync with the guest's booking.
      </p>

      <BookingModal
        key={selected?.openKey}
        open={Boolean(selected)}
        booking={selected?.booking}
        onClose={() => setSelected(null)}
        onUpdateStatus={(id, status) => updateMutation.mutateAsync({ id, status })}
      />
    </StaysSurface>
  );
}
