import { useState, useEffect, useMemo } from "react";
import { X, Calendar, Users, Clock, Ticket, Hash, Phone, Mail, Circle } from "lucide-react";
import { fetchCustomerBookings } from "@/features/bookings/api";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "@/components/shared/OptimizedImage";

const statusConfig = {
  PENDING: { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
  CONFIRMED: { label: "Confirmed", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  COMPLETED: { label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  CANCELLED: { label: "Cancelled", dot: "bg-red-400", bg: "bg-red-50", text: "text-red-600" },
  NO_SHOW: { label: "No Show", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600" },
  REFUNDED: { label: "Refunded", dot: "bg-purple-400", bg: "bg-purple-50", text: "text-purple-600" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function CustomerDetailsPanel({ conversation, currentUserId, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const otherParticipant = conversation?.participants?.find(
    (p) => p.userId !== currentUserId
  )?.user;
  const customerId = otherParticipant?.id;
  const cu = otherParticipant || {};

  useEffect(() => {
    if (!customerId) return;
    Promise.resolve().then(() => {
      setLoading(true);
      fetchCustomerBookings(customerId)
        .then(setBookings)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [customerId]);

  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
    return { totalSpent };
  }, [bookings]);

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="flex h-full w-full lg:w-[420px] shrink-0 flex-col border-l border-gray-200 bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.06)]"
    >
      {/* Header */}
      <div className="bg-linear-to-r from-[#044b3b] to-emerald-700 px-5 h-16 flex items-center justify-between relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <h3 className="relative text-sm font-semibold text-white/90">Customer Profile</h3>
        <button
          onClick={handleClose}
          className="relative flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Customer card */}
      <div className="relative -mt-4 px-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-[#044b3b] to-emerald-500 text-xl font-bold text-white shadow-sm ring-2 ring-white/80">
              <span>{(cu.name || "?").charAt(0).toUpperCase()}</span>
              {cu.photoURL && (
                <OptimizedImage
                  src={cu.photoURL}
                  width={56}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{cu.name || "Unknown"}</p>
                {cu.status && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    cu.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    <Circle size={4} fill="currentColor" />
                    {cu.status}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {(cu.email || bookings[0]?.customerEmail) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Mail size={10} className="shrink-0 text-gray-400" />
                    <span className="truncate">{cu.email || bookings[0]?.customerEmail}</span>
                  </div>
                )}
                {(cu.phone || bookings[0]?.customerPhone) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Phone size={10} className="shrink-0 text-gray-400" />
                    <span>{cu.phone || bookings[0]?.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {cu.lastLoginAt && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-[10px] text-gray-400">
              <Clock size={10} />
              <span>Last seen {timeAgo(cu.lastLoginAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!loading && bookings.length > 0 && (
        <div className="mx-4 mt-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center divide-x divide-gray-200">
            <div className="flex-1 flex flex-col items-center py-2">
              <span className="text-sm font-bold text-gray-900">{bookings.length}</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Bookings</span>
            </div>
            <div className="flex-1 flex flex-col items-center py-2">
              <span className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Total</span>
            </div>
            <div className="flex-1 flex flex-col items-center py-2">
              <span className="text-sm font-bold text-gray-900">{formatCurrency(Math.round(stats.totalSpent / bookings.length))}</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Average</span>
            </div>
          </div>
        </div>
      )}

      {/* Booking list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 pt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                  <div className="h-2 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <Ticket size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No bookings yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Customer hasn't made any bookings</p>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-4 space-y-1">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Ticket size={12} className="text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {bookings.length} Booking{bookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {bookings.map((booking) => {
              const status = statusConfig[booking.status] || { label: booking.status, dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-600" };
              return (
                <div
                  key={booking.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors group"
                  onClick={() => navigate(`/bookings?bookingId=${booking.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                    {booking.tourPhoto ? (
                      <OptimizedImage
                        src={booking.tourPhoto}
                        width={40}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <Ticket size={16} className="text-gray-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{booking.tourName}</p>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${status.bg} ${status.text}`}>
                        <span className={`w-1 h-1 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar size={9} />
                        {formatDate(booking.travelDate)}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Hash size={9} />
                        {booking.bookingNumber}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Users size={9} />
                        {booking.travelers}
                      </span>
                    </div>

                    {/* Extra info row */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-400">Booked {formatDate(booking.bookingDate)}</span>
                      {booking.specialRequests && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[9px] text-gray-400 truncate max-w-[120px]">"{booking.specialRequests}"</span>
                        </>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-gray-900 mt-1.5 block">{formatCurrency(booking.total, booking.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
