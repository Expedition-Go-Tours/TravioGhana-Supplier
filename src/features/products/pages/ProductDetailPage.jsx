import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit, Trash2, Loader2, AlertCircle,
  Clock, Users, Star, Globe, Calendar,
  Check, X as XIcon, Camera, ChevronLeft, ChevronRight,
  Eye, Shield, Activity, Navigation, MoreHorizontal,
  Tag, Percent, DollarSign, MessageSquare, Pencil,
  MapPin, CalendarDays, Bed, UtensilsCrossed, MoonStar,
  Ticket, Lock, Headphones, BookOpen, RotateCcw, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { getMyProduct, deleteProduct } from "@/features/products/api";
import { fetchTourAvailability } from "@/features/availability/api";
import StatusBadge from "@/components/shared/StatusBadge";
import { PRODUCT_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { PickupGeoshapePreview } from "@/components/shared/PickupGeoshapeDrawer";
import PreviewMenu from "@/components/shared/PreviewMenu";
import { getUniqueCities } from "@/features/products/utils/getUniqueCities";
import { ACCOMMODATION_LABELS } from "@/features/products/utils/itineraryConstants";
import DeleteModal from "@/components/ui/DeleteModal";

function reorderPhotos(tour) {
  const rawPhotos = (tour?.photos || []).filter(Boolean);
  const coverPhoto = tour?.coverPhoto;
  if (coverPhoto && rawPhotos.length === 0) return [coverPhoto];
  if (!coverPhoto || rawPhotos.length === 0) return rawPhotos;
  const extractId = (url) => {
    if (!url) return '';
    const m = url.match(/\/(?:v\d+\/)?([^/]+)$/);
    return m ? m[1] : url;
  };
  const coverId = extractId(coverPhoto);
  const rest = rawPhotos.filter((p) => extractId(p) !== coverId);
  return [coverPhoto, ...rest];
}

function formatDuration(duration) {
  const parts = [];
  if (duration?.days) parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
  if (duration?.hours) parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
  return parts.join(', ') || null;
}

const ADMISSION_LABELS = { yes: 'Admission included', no: 'Pay separately', passby: 'Pass by' };

function formatStopDuration(loc) {
  if (loc?.timeSpent == null || loc.timeSpent === '') return null;
  const n = Number(loc.timeSpent);
  if (loc.timeSpentUnit === 'hours') return `${n} hour${n === 1 ? '' : 's'}`;
  return `${n} min`;
}

function stopTitle(loc) {
  return (loc.name && String(loc.name).trim()) ? loc.name : (loc.address || 'Stop');
}

function validityLabel(option) {
  const v = option?.validityType;
  if (v === 'open_ended') return 'Valid anytime';
  if (v === 'from_activation') return `Valid ${option.validity || 1} ${option.validityUnit || 'days'} from first use`;
  if (v === 'period') return `Valid ${option.validity || 1} ${option.validityUnit || 'days'} from booking`;
  if (v === 'date_picked') return 'Valid on selected date';
  return null;
}

/* ======================================================================
   SUB-COMPONENTS
   ====================================================================== */

const SECTION_EDIT_MAP = {
  "Description": { section: "basics", step: "language-and-title" },
  "What Makes This Unique": { section: "product-content", step: "unique-selling-points" },
  "Highlights": { section: "product-content", step: "tour-details" },
  "What's Included": { section: "product-content", step: "inclusions-exclusions" },
  "What to Bring": { section: "product-content", step: "info-travelers-need" },
  "What to Know": { section: "product-content", step: "info-travelers-need" },
  "Accessibility & Health": { section: "product-content", step: "info-travelers-need" },
  "Pricing": { section: "schedules-and-pricing", step: "pricing-schedules" },
  "Details": { section: "basics", step: "categorization" },
  "Traveler Info Required": { section: "booking-and-tickets", step: "traveler-required-info" },
  "Location": { section: "product-content", step: "locations" },
  "Schedule": { section: "schedules-and-pricing", step: "pricing-schedules" },
  "Booking Options": { section: "option-setup", step: "options" },
  "Booking Rules": { section: "booking-and-tickets", step: "booking-process" },
  "Meeting & Pickup": { section: "booking-and-tickets", step: "meeting-point-pickup" },
  "Languages": { section: "product-content", step: "languages-offered" },
  "Tags": { section: "basics", step: "theme" },
};

function SectionCard({ title, children, className, onEdit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200", className)}
    >
      {title && (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight flex-1">{title}</h2>
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title={`Edit ${title}`}>
                <Pencil size={13} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className={cn("px-5 py-4", !title && "p-5")}>
        {children}
      </div>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value, children }) {
  if (!value && !children) return null;
  return (
    <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-slate-400 shrink-0" />
        <span className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="min-w-0">
        {value && <span className="text-sm font-medium text-slate-800 break-words leading-snug">{value}</span>}
        {children}
      </div>
    </div>
  );
}

function PhotoGalleryModal({ displayPhotos, index: lightboxIndex, setLightboxIndex, tour }) {
  if (lightboxIndex === null) return null;
  const photo = displayPhotos[lightboxIndex];
  if (!photo) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 md:p-8"
      onClick={() => setLightboxIndex(null)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all"
      >
        <XIcon size={22} />
      </button>
      {lightboxIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {lightboxIndex < displayPhotos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all"
        >
          <ChevronRight size={28} />
        </button>
      )}
      <div className="flex flex-col items-center max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full flex items-center justify-center">
          <OptimizedImage
            src={photo}
            width={1600}
            alt={`${tour?.title} - Photo ${lightboxIndex + 1}`}
            fit="fill"
            className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
          />
        </div>
        <div className="flex items-center gap-4 mt-5">
          <div className="flex items-center gap-1.5">
            {displayPhotos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", i === lightboxIndex ? "bg-white w-4" : "bg-white/30 hover:bg-white/50")}
              />
            ))}
          </div>
          <span className="text-sm text-white/50 font-medium">{lightboxIndex + 1} / {displayPhotos.length}</span>
        </div>
      </div>
    </div>
  );
}

function AllPhotosModal({ displayPhotos, open, onClose, onSelect, handleImageError, tour }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Camera size={18} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-800">All Photos <span className="text-slate-400 font-normal">({displayPhotos.length})</span></h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-70px)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayPhotos.map((photo, i) => (
              <button key={i} onClick={() => { onClose(); onSelect(i); }} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                <OptimizedImage src={photo} width={600} alt={`${tour?.title} - Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110" onError={(e) => handleImageError(e, i)} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                <div className="absolute bottom-2 right-2 opacity-100 transition-opacity duration-200 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">{i + 1}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvailabilityCalendar({ availability, availMonth, setAvailMonth }) {
  const [y, m] = availMonth.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const availMap = {};
  availability.forEach((a) => { availMap[a.date] = a; });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${availMonth}-${String(d).padStart(2, "0")}`;
    const day = availMap[dateStr];
    const status = day?.status?.toLowerCase() || "available";
    const isPast = new Date(dateStr) < new Date(new Date().toDateString());
    const bgMap = { available: "bg-emerald-50 text-emerald-700", limited: "bg-amber-50 text-amber-700", full: "bg-red-50 text-red-700", blocked: "bg-slate-100 text-slate-400" };
    const dotMap = { available: "bg-emerald-500", limited: "bg-amber-400", full: "bg-red-500", blocked: "bg-slate-300" };
    cells.push(
      <div key={dateStr} className={cn("relative flex flex-col items-center justify-center rounded-md text-xs font-medium aspect-square transition-all duration-150", isPast ? "opacity-40" : "hover:shadow-sm", bgMap[status] || "bg-slate-50 text-slate-400")} title={`${dateStr}: ${status}${day ? ` (${day.booked}/${day.capacity})` : ""}`}>
        <span className="leading-none">{d}</span>
        <span className={cn("w-1 h-1 rounded-full mt-0.5", dotMap[status] || "bg-slate-300")} />
      </div>
    );
  }

  const prevMonth = () => {
    const prev = new Date(y, m - 2, 1);
    setAvailMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const next = new Date(y, m, 1);
    setAvailMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"><ChevronLeft size={14} /></button>
        <span className="text-xs font-semibold text-slate-500">{new Date(y, m - 1).toLocaleString("default", { month: "long", year: "numeric" })}</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">{dayLabels.map((d) => <div key={d} className="text-[10px] text-slate-400 text-center font-semibold py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
      <div className="flex items-center justify-center gap-2.5 mt-3 pt-3 border-t border-slate-200">
        {[{ label: "Available", dot: "bg-emerald-500" }, { label: "Limited", dot: "bg-amber-400" }, { label: "Full", dot: "bg-red-500" }, { label: "Blocked", dot: "bg-slate-300" }].map((l) => (
          <div key={l.label} className="flex items-center gap-1"><span className={cn("w-1.5 h-1.5 rounded-full", l.dot)} /><span className="text-[10px] text-slate-500">{l.label}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ======================================================================
   SKELETON
   ====================================================================== */

const skeletonVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" } }),
};

function SkeletonBlock({ className, style }) {
  return <div className={cn("animate-pulse bg-linear-to-r from-slate-100 via-slate-200/50 to-slate-100 bg-[length:200%_100%] rounded-lg", className)} style={style} />;
}

function DetailPageSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <motion.div custom={0} variants={skeletonVariants} initial="hidden" animate="visible"><SkeletonBlock className="h-10 w-full" /></motion.div>
      <motion.div custom={1} variants={skeletonVariants} initial="hidden" animate="visible"><SkeletonBlock className="h-[400px] rounded-xl" /></motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {[160, 120, 240].map((h, i) => (<motion.div key={i} custom={i + 2} variants={skeletonVariants} initial="hidden" animate="visible"><SkeletonBlock className="rounded-xl" style={{ height: `${h}px` }} /></motion.div>))}
        </div>
        <div className="space-y-4">
          {[200, 160, 180, 140].map((h, i) => (<motion.div key={i} custom={i + 5} variants={skeletonVariants} initial="hidden" animate="visible"><SkeletonBlock className="rounded-xl" style={{ height: `${h}px` }} /></motion.div>))}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   MAIN COMPONENT
   ====================================================================== */

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [availability, setAvailability] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availMonth, setAvailMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
      getMyProduct(id)
        .then((res) => {
          const data = res.data?.data?.tour;
          if (!data) { setError("Product not found"); return; }
          setTour(data);
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || "Failed to load product");
        })
        .finally(() => setLoading(false));
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const [year, month] = availMonth.split("-").map(Number);
    const startDate = `${availMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${availMonth}-${String(lastDay).padStart(2, "0")}`;
    Promise.resolve().then(() => {
      setAvailLoading(true);
      fetchTourAvailability(id, startDate, endDate)
        .then((res) => setAvailability(res.calendar || []))
        .catch(() => {})
        .finally(() => setAvailLoading(false));
    });
  }, [id, availMonth]);

  const handleDeleteConfirm = () => {
    setDeleteModalOpen(false);
    setMenuOpen(false);
    setDeleting(true);
    deleteProduct(id)
      .then(() => { toast.success("Product deleted successfully"); navigate("/products"); })
      .catch((err) => { toast.error(err.response?.data?.message || err.message || "Failed to delete product"); })
      .finally(() => setDeleting(false));
  };

  const handleImageError = useCallback((e) => {
    e.target.style.display = 'none';
  }, []);

  const displayPhotos = useMemo(() => tour ? reorderPhotos(tour) : [], [tour]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  if (loading) return <DetailPageSkeleton />;

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="bg-white rounded-xl border border-slate-100 p-8 max-w-md text-center shadow-sm shadow-slate-900/5">
            <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-red-500" /></div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Failed to Load Product</h2>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => window.location.reload()} className="px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-all shadow-sm">Try Again</button>
              <button onClick={() => navigate("/products")} className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all">Back to Products</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!tour) return null;

  const categorization = tour.categorization || {};
  const content = { ...tour.productContent };
  if (content.uniqueSellingPoints && !Array.isArray(content.uniqueSellingPoints)) {
    const val = content.uniqueSellingPoints;
    content.uniqueSellingPoints = (typeof val === 'string' && val.trim()) ? [val.trim()] : [];
  }
  const schedules = tour.schedulesAndPricing || {};
  const booking = tour.bookingAndTickets || {};
  const pricingSchedules = schedules.pricingSchedules || {};
  const pricing = pricingSchedules.schedules?.[0] || {};
  const pricingArr = schedules.pricing || [];
  const avail = schedules.availability || {};
  const travelerDetails = schedules.travelerDetails || {};
  const cancellation = booking.cancellationPolicy || {};
  const location = content.location?.city ? content.location : (categorization.location || {});
  const uniqueCities = getUniqueCities(content.locations);
  const duration = categorization.duration;
  const durationStr = typeof duration === 'string' ? duration : formatDuration(duration || {});
  const currency = pricingSchedules.currency || schedules.currency || 'GHS';
  const included = content.included?.length > 0 ? content.included : (categorization.includes || []);
  const excluded = content.excluded?.length > 0 ? content.excluded : (categorization.excludes || []);
  const whatToKnow = content.whatToKnow || content.additionalInfo;

  const scheduleData = {
    operatingDays: schedules.operatingDays || avail.daysOfWeek || [],
    timeSlots: schedules.timeSlots || pricing.timeSlots || avail.timeSlots || [],
    capacityPerSlot: travelerDetails.maxParticipants || null,
    availableDates: schedules.availableDates || (pricing.dateExceptions || []).filter(d => d.type === 'override').map(d => d.date),
    scheduleType: avail.scheduleType || null,
  };

  const validPeriod = pricing.startDate ? { start: pricing.startDate, end: pricing.endDate } : null;

  const normalizedPrices = (() => {
    if (pricing.prices?.length > 0) {
      return pricing.prices.map(p => ({
        label: p.ageGroup || p.travelerType || 'Standard',
        price: Number(p.retailPrice ?? p.price ?? 0),
        _raw: p,
      }));
    }
    if (pricingArr.length > 0) {
      return pricingArr.map(p => ({
        label: p.travelerType || p.ageGroup || 'Standard',
        price: Number(p.price ?? p.retailPrice ?? 0),
        _raw: p,
      }));
    }
    const cats = travelerDetails.pricingCategories || [];
    if (cats.length > 0) {
      const uniform = travelerDetails.uniformPrice;
      return cats.map(c => ({
        label: c.name,
        price: Number(uniform ?? c.price ?? 0),
        tiers: c.tiers || [],
        minAge: c.minAge,
        maxAge: c.maxAge,
        idRequired: c.idRequired,
        idType: c.idType,
        _raw: c,
      }));
    }
    return [];
  })();

  const hasAnyStat = [tour.totalBookings, tour._count?.bookings, tour.totalRevenue, tour.averageRating, tour._count?.reviews, tour.viewCount].some(v => v > 0);

  const handleEditSection = (sectionKey) => {
    const mapping = SECTION_EDIT_MAP[sectionKey];
    if (!mapping) return;
    navigate(`/products/build/${tour.id}?section=${mapping.section}&step=${mapping.step}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* ===== STICKY HEADER ===== */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate("/products")} className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all shrink-0">
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Products</span>
              </button>
              <span className="text-xs text-slate-300 shrink-0">/</span>
              <h1 className="text-sm font-semibold text-slate-800 truncate">{tour.title}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={tour.status} size="sm" />
              <PreviewMenu product={tour} label="Preview" />
              {(tour.status === "ACTIVE" || tour.status === "PAUSED") && (
                <button
                  onClick={() => navigate(`/special-offers/build/new/products?productId=${id}`)}
                  title="Create special offer"
                  className="flex items-center gap-1.5 px-3.5 h-8 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-all"
                >
                  <Percent size={13} />
                  <span>Create special offer</span>
                </button>
              )}
              <button
                onClick={() => navigate(`/products/build/${id}/type`)}
                className="flex items-center gap-1.5 px-3.5 h-8 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800 transition-all shadow-sm shadow-emerald-200"
              >
                <Edit size={13} />
                <span>Edit</span>
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-slate-200 shadow-lg shadow-slate-900/10 py-1 z-50" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setMenuOpen(false); navigate(`/products/build/${id}/type`); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => { setMenuOpen(false); setDeleteModalOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

        {/* ===== HERO GALLERY + STAT CARDS ===== */}
        {displayPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative mb-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-1 rounded-xl overflow-hidden shadow-sm shadow-slate-900/5">
              {displayPhotos.slice(0, 5).map((photo, i) => {
                const hasMore = displayPhotos.length > 5 && i === 4
                return (
                  <button key={i} onClick={hasMore ? () => setGalleryOpen(true) : () => setLightboxIndex(i)} className={cn("relative overflow-hidden bg-slate-100 group cursor-pointer", i === 0 ? "md:col-span-2 md:row-span-2 min-h-[260px] md:min-h-[440px]" : "min-h-[130px] md:min-h-[219px]")}>
                    <OptimizedImage src={photo} width={i === 0 ? 2400 : 600} alt={`${tour.title} - Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent opacity-100 transition-all duration-300" />
                    {i === 0 && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 shadow-sm opacity-100 transition-all duration-300">
                        <Camera size={12} /> <span>View all {displayPhotos.length} photos</span>
                      </div>
                    )}
                    {hasMore && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-all duration-300 group-hover:bg-black/60">
                        <span className="text-xs font-semibold text-white/90 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-lg">+{displayPhotos.length - 5} more</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ===== STAT CARDS ===== */}
        {hasAnyStat && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mb-8 -mt-2"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(tour.totalBookings > 0 || tour._count?.bookings > 0) && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 ring-1 ring-slate-200/50"><Calendar size={17} /></div>
                  <div><p className="text-base font-bold text-slate-800 leading-none tabular-nums">{tour.totalBookings || tour._count?.bookings}</p><p className="text-xs text-slate-400 font-medium leading-tight mt-1">Bookings</p></div>
                </div>
              )}
              {tour.totalRevenue > 0 && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 ring-1 ring-emerald-200/50"><DollarSign size={17} /></div>
                  <div><p className="text-base font-bold text-slate-800 leading-none tabular-nums">{formatCurrency(tour.totalRevenue, currency)}</p><p className="text-xs text-slate-400 font-medium leading-tight mt-1">Revenue</p></div>
                </div>
              )}
              {tour.averageRating > 0 && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 ring-1 ring-amber-200/50"><Star size={17} /></div>
                  <div><p className="text-base font-bold text-slate-800 leading-none tabular-nums">{tour.averageRating}</p><p className="text-xs text-slate-400 font-medium leading-tight mt-1">Rating</p></div>
                </div>
              )}
              {tour._count?.reviews > 0 && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 ring-1 ring-emerald-200/50"><MessageSquare size={17} /></div>
                  <div><p className="text-base font-bold text-slate-800 leading-none tabular-nums">{tour._count.reviews}</p><p className="text-xs text-slate-400 font-medium leading-tight mt-1">Reviews</p></div>
                </div>
              )}
              {tour.viewCount > 0 && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 shadow-sm shadow-slate-900/5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 ring-1 ring-slate-200/50"><Eye size={17} /></div>
                  <div><p className="text-base font-bold text-slate-800 leading-none tabular-nums">{tour.viewCount}</p><p className="text-xs text-slate-400 font-medium leading-tight mt-1">Views</p></div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== TITLE + METADATA ===== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-10 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge status={tour.status} label={PRODUCT_STATUSES[tour.status]?.label} size="sm" />
                <span className="text-xs text-slate-400">Created {formatDate(tour.createdAt)}</span>
                <span className="text-xs text-slate-300">&middot;</span>
                <span className="text-xs text-slate-400">Updated {formatDate(tour.updatedAt)}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{tour.title}</h1>
              {content.shortSummary && (
                <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">{content.shortSummary}</p>
              )}
            </div>
          </div>

          {(tour.status === "REJECTED" || tour.status === "FLAGGED" || (tour.status === "ACTIVE" && tour.draftStatus === "REJECTED")) && (
            <div className="mt-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5">
              <AlertCircle size={17} className="text-rose-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-700">Tour was flagged for changes</p>
                <p className="text-sm text-rose-600 mt-0.5 leading-relaxed">
                  {tour.draftReviewNote || tour.reviewNote || "An admin flagged this tour for review. Make the requested changes and resubmit it for approval."}
                </p>
              </div>
              <button
                onClick={() => navigate(`/products/build/${id}/type`)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-all"
                title="Edit and fix your tour, then resubmit for review from the builder"
              >
                <Edit size={12} />
                <span>Fix & Resubmit</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* ===== MAIN LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ======== LEFT COLUMN (8/12) ======== */}
          <div className="lg:col-span-8 space-y-6">

            {/* DESCRIPTION */}
            <SectionCard title="Description" onEdit={() => handleEditSection("Description")}>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{tour.description}</p>
            </SectionCard>

            {/* UNIQUE SELLING POINTS */}
            {content.uniqueSellingPoints?.length > 0 && (
              <SectionCard title="What Makes This Unique" onEdit={() => handleEditSection("What Makes This Unique")}>
                <ul className="space-y-2">
                  {content.uniqueSellingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-[7px] shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* HIGHLIGHTS */}
            {content.highlights?.length > 0 && (
              <SectionCard title="Highlights" onEdit={() => handleEditSection("Highlights")}>
                <ul className="space-y-3">
                  {content.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-[7px] shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* MEETING & PICKUP */}
            {(content.meetingMode || booking.meetingPoint?.name || content.meetingPointPicture || content.arrivalTimeType !== 'none' || content.pickupAreas?.length > 0 || content.pickupLocations?.length > 0 || content.pickupDescription || content.dropoffOption !== 'none') && (
              <SectionCard title="Meeting & Pickup" onEdit={() => handleEditSection("Meeting & Pickup")}>
                {/* Mode badge */}
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  {content.meetingMode === 'pickup' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Navigation size={11} /> Pickup
                    </span>
                  ) : content.meetingMode === 'selfGuided' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                      <MapPin size={11} /> Self-Guided
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <MapPin size={11} /> Meeting Point
                    </span>
                  )}
                </div>

                {/* MEETING POINT MODE */}
                {(!content.meetingMode || content.meetingMode === 'meeting_point') && (() => {
                  const meetingPts = Array.isArray(content.meetingPoints) && content.meetingPoints.length > 0
                    ? content.meetingPoints
                    : (booking.meetingPoint?.name || booking.meetingPoint?.address ? [booking.meetingPoint] : [])
                  return (
                    <>
                      {meetingPts.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">
                            {meetingPts.length > 1 ? 'Meeting Points' : 'Meeting Point'}
                          </p>
                          <div className="space-y-1.5">
                            {meetingPts.map((pt, i) => (
                              <div key={i} className="bg-slate-50 rounded-lg px-3.5 py-3">
                                {pt.name && <p className="font-semibold text-slate-800 text-sm">{pt.name}</p>}
                                {pt.address && <p className="text-xs text-slate-500 mt-0.5">{pt.address}</p>}
                                {(pt.lat && pt.lng) && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                                    <Navigation size={10} /> {pt.lat}, {pt.lng}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    {content.meetingPointPicture && (
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Photo</p>
                        <OptimizedImage src={content.meetingPointPicture} alt="Meeting point" width={800} fit="fill" className="w-full max-h-48 object-cover rounded-lg border border-slate-200" />
                      </div>
                    )}
                    {content.arrivalTimeType && content.arrivalTimeType !== 'none' && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Arrive <strong className="text-slate-700">
                          {({
                            '5min': '5 minutes before',
                            '10min': '10 minutes before',
                            '15min': '15 minutes before',
                            '20min': '20 minutes before',
                            '25min': '25 minutes before',
                            '30min': '30 minutes before',
                            'notified': 'when notified',
                            'custom': content.arrivalTimeCustom || 'custom time',
                          })[content.arrivalTimeType] || content.arrivalTimeType}
                        </strong></span>
                      </div>
                    )}
                    {content.meetingPointDescription && (
                      <p className="text-sm text-slate-600 leading-relaxed mt-2">{content.meetingPointDescription}</p>
                    )}
                    </>
                  )
                })()}

                {/* PICKUP MODE */}
                {content.meetingMode === 'pickup' && (
                  <>
                    {content.pickupAreas?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Pickup Areas</p>
                        <div className="space-y-1.5">
                          {content.pickupAreas.map((area, i) => {
                            const name = typeof area === 'string' ? area : area.name || '';
                            const time = typeof area === 'string' ? '' : area.time || '';
                            const address = typeof area === 'string' ? '' : area.address || '';
                            const radiusKm = typeof area === 'string' ? null : area.radiusKm;
                            return (
                              <div key={i} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700 font-medium">{name}</span>
                                  {time && <span className="text-xs text-slate-400">{time}</span>}
                                </div>
                                {address && <p className="text-[12px] text-slate-400 mt-0.5 truncate">{address}</p>}
                                {radiusKm && <p className="text-[12px] text-slate-500 mt-0.5">Radius: {radiusKm} km</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {content.pickupLocations?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Pickup Locations</p>
                        <div className="space-y-1.5">
                          {content.pickupLocations.map((loc, i) => (
                            <div key={i} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                              <p className="font-medium text-slate-700">{loc.name}</p>
                              {loc.address && <p className="text-xs text-slate-500 mt-0.5">{loc.address}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {content.pickupTiming && (
                        <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                          Pickup {content.pickupTiming === 'at_start' ? 'at start' : 'before start'}
                        </span>
                      )}
                      {content.pickupFinalLocationTiming && (
                        <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                          Location: {content.pickupFinalLocationTiming === 'day_before' ? 'day before' : 'after selection'}
                        </span>
                      )}
                      {content.referenceStartTime && (
                        <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                          Ref: {formatTime(content.referenceStartTime)}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const mappableAreas = (content.pickupAreas || []).filter(
                        (a) => typeof a === 'object' && a.lat != null && a.lng != null && (a.radiusKm || (Array.isArray(a?.polygon) && a.polygon.length >= 3))
                      )
                      if (mappableAreas.length === 0) return null
                      return (
                        <div className="mb-3">
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Pickup Areas</p>
                          <PickupGeoshapePreview areas={mappableAreas} height={220} />
                        </div>
                      )
                    })()}
                    {content.pickupDescription && (
                      <p className="text-sm text-slate-600 leading-relaxed">{content.pickupDescription}</p>
                    )}
                  </>
                )}

                {/* SELF-GUIDED MODE */}
                {content.meetingMode === 'selfGuided' && (
                  <div className="bg-slate-50 rounded-lg px-3.5 py-3">
                    <p className="text-sm text-slate-600">This is a self-guided experience. No meeting point or pickup required.</p>
                  </div>
                )}

                {/* DROP-OFF */}
                {content.dropoffOption && content.dropoffOption !== 'none' && (
                  <div className={cn("border-t border-slate-100 pt-3 mt-3", content.meetingMode === 'selfGuided' && "border-t-0 pt-0 mt-0")}>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Drop-off</p>
                    <div className="bg-slate-50 rounded-lg px-3.5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200/60 text-slate-600 uppercase tracking-wider">
                          {content.dropoffOption === 'same_location' ? 'Same as meeting point' :
                           content.dropoffOption === 'different_location' ? 'Different location' :
                           content.dropoffOption === 'customer_preferred' ? "Customer's choice" :
                           'Service included'}
                        </span>
                      </div>
                      {content.dropoffLocation?.name && (
                        <p className="text-sm font-medium text-slate-700 mt-1.5">{content.dropoffLocation.name}</p>
                      )}
                      {content.dropoffLocation?.address && (
                        <p className="text-xs text-slate-500 mt-0.5">{content.dropoffLocation.address}</p>
                      )}
                      {content.dropoffDescription && (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{content.dropoffDescription}</p>
                      )}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ITINERARY */}
            {Array.isArray(content.locations) && content.locations.length > 0 && (() => {
              const days = {};
              content.locations.forEach((loc) => {
                const d = loc.day ?? 1;
                if (!days[d]) days[d] = [];
                days[d].push(loc);
              });
              const dayKeys = Object.keys(days).map(Number).sort((a, b) => a - b);
              const isMultiDay = dayKeys.length > 1 || content.locations.some((l) => (l.day ?? 1) > 1);
              const lastDayNum = dayKeys.length > 0 ? Math.max(...dayKeys) : null;
              return (
                <SectionCard title="Itinerary" onEdit={() => handleEditSection("Location")}>
                  <div className="space-y-5">
                    {dayKeys.map((dayNum) => {
                      const stops = days[dayNum];
                      const logistics = content.dayLogistics?.[dayNum];
                      const isLastDay = dayNum === lastDayNum;
                      const hasNoSleepOver = isLastDay && !!logistics?.noSleepOver;
                      const hasReturnToStart = isLastDay && !!logistics?.returnToStart;
                      return (
                        <div key={dayNum}>
                          {isMultiDay && (
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isLastDay ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}>
                                {isLastDay ? 'Final Day' : `Day ${dayNum}`}
                              </span>
                              {!hasNoSleepOver && logistics?.accommodation && (
                                <span className="flex items-center gap-1 text-xs text-slate-500"><Bed size={12} className="text-slate-400" /> {ACCOMMODATION_LABELS[logistics.accommodation] || logistics.accommodation}</span>
                              )}
                              {logistics?.meals?.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-slate-500"><UtensilsCrossed size={12} className="text-slate-400" /> {logistics.meals.map((m) => `${m.type}${m.format ? ` (${m.format})` : ''}`).join(', ')}</span>
                              )}
                              {logistics?.drinksIncluded && (
                                <span className="text-xs text-slate-400">· Drinks included</span>
                              )}
                              {hasReturnToStart && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><RotateCcw size={12} /> Returns to start point</span>
                              )}
                              {hasNoSleepOver && (
                                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Ban size={12} /> No overnight stay</span>
                              )}
                            </div>
                          )}
                          <div className="space-y-2.5">
                            {stops.map((loc, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800">{stopTitle(loc)}</p>
                                    {formatStopDuration(loc) && <span className="text-xs text-slate-400 shrink-0">{formatStopDuration(loc)}</span>}
                                  </div>
                                  {(loc.city || loc.country) && (
                                    <p className="text-xs text-slate-400 mt-0.5">{[loc.city, loc.country].filter(Boolean).join(', ')}</p>
                                  )}
                                  {loc.admissionIncluded && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">{ADMISSION_LABELS[loc.admissionIncluded]}</p>
                                  )}
                                  {loc.description && (
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{loc.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isMultiDay && !hasNoSleepOver && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pl-9">
                                <MoonStar size={12} className="text-amber-500" />
                                Overnight in {stopTitle(stops[stops.length - 1])}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              );
            })()}

            {/* WHAT TO KNOW / ADDITIONAL INFO */}
            {whatToKnow && (
              <SectionCard title="What to Know" onEdit={() => handleEditSection("What to Know")}>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{whatToKnow}</p>
              </SectionCard>
            )}

            {/* LANGUAGES */}
            {content.languages?.length > 0 && (
              <SectionCard title="Languages" onEdit={() => handleEditSection("Languages")}>
                <div className="flex flex-wrap gap-1.5">
                  {content.languages.map((lang) => (
                    <span key={lang} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100">
                      <Globe size={11} /> {lang}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* TAGS */}
            {tour.tags?.length > 0 && (
              <SectionCard title="Tags" onEdit={() => handleEditSection("Tags")}>
                <div className="flex flex-wrap gap-1.5">
                  {tour.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100">
                      <Tag size={11} /> {tag}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* AVAILABILITY */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-800">Availability</h3>
                </div>
              </div>
              <div className="p-5">
                {availLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
                ) : availability.length > 0 ? (
                  <AvailabilityCalendar availability={availability} availMonth={availMonth} setAvailMonth={setAvailMonth} />
                ) : (
                  <div className="text-center py-6">
                    <CalendarDays size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">No availability data</p>
                    <button onClick={() => handleEditSection("Pricing")} className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                      Add availability
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ======== RIGHT COLUMN (4/12) ======== */}
          <div className="lg:col-span-4 space-y-5">

            {/* PRICING */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
            >
              <div className="px-5 py-4 bg-linear-to-r from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-800">Pricing</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {currency && <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{currency}</span>}
                    <button onClick={() => handleEditSection("Pricing")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Pricing">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {normalizedPrices.length > 0 ? (
                  <>
                    {/* Pricing model badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {travelerDetails.pricingModel === 'perGroup' ? 'Per group' : 'Per person'}
                      </span>
                      {travelerDetails.pricingApproach === 'sameForEveryone' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600">
                          Same for everyone
                        </span>
                      )}
                      {travelerDetails.pricingApproach === 'dependsOnAge' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600">
                          Depends on age
                        </span>
                      )}
                    </div>

                    {/* Per-category prices */}
                    <div className="divide-y divide-slate-50">
                      {normalizedPrices.map((price, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm text-slate-700 font-medium">{price.label}</span>
                              {(price.minAge != null || price.maxAge != null) && (
                                <span className="text-xs text-slate-400">
                                  ({price.minAge}–{price.maxAge})
                                </span>
                              )}
                              {price.idRequired && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium border border-amber-200/50">
                                  {price.idType || 'ID'}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0 ml-3">{formatCurrency(price.price, currency)}</span>
                          </div>

                          {/* Tiers inside this category */}
                          {price.tiers && price.tiers.length > 0 && (
                            <div className="ml-3 mb-2 pb-2 border-b border-slate-50 last:border-b-0">
                              <div className="space-y-1">
                                {price.tiers.map((tier, ti) => (
                                  <div key={ti} className="flex items-center justify-between text-xs pl-3 py-1 rounded bg-slate-50/50 px-2">
                                    <span className="text-slate-500">
                                      {tier.from ?? '1'}–{tier.to ?? '∞'} people
                                    </span>
                                    <span className="font-semibold text-slate-700 tabular-nums">
                                      {formatCurrency(tier.pricePerPerson, currency)} each
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Valid period */}
                    {validPeriod && (
                      <div className="pt-3 mt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Valid period</span>
                          <span className="font-medium text-slate-500">{formatDate(validPeriod.start)}{validPeriod.end ? ` \u2013 ${formatDate(validPeriod.end)}` : ''}</span>
                        </div>
                      </div>
                    )}

                    {/* Discount Perks */}
                    {schedules.discountPerks && (schedules.discountPerks.groupDiscount || schedules.discountPerks.earlyBirdDiscount) && (
                      <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount Perks</p>
                        {schedules.discountPerks.groupDiscount && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50/50 rounded-lg px-3 py-2">
                            <Percent size={12} className="text-emerald-500 shrink-0" />
                            <span>Group: <strong>{schedules.discountPerks.groupDiscount.discountPercentage}% off</strong> ({schedules.discountPerks.groupDiscount.minTravelers}+ travelers)</span>
                          </div>
                        )}
                        {schedules.discountPerks.earlyBirdDiscount && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-amber-50/50 rounded-lg px-3 py-2">
                            <Percent size={12} className="text-amber-500 shrink-0" />
                            <span>Early bird: <strong>{schedules.discountPerks.earlyBirdDiscount.discountPercentage}% off</strong> (book {schedules.discountPerks.earlyBirdDiscount.daysBeforeBooking} days ahead)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400 mb-2">No pricing configured yet</p>
                    <button onClick={() => handleEditSection("Pricing")} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      <Pencil size={11} />
                      Add pricing
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* SCHEDULE */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-800">Schedule</h3>
                  </div>
                  <button onClick={() => handleEditSection("Schedule")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Schedule">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Schedule type badge */}
                {scheduleData.scheduleType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                    {scheduleData.scheduleType === 'operatingHours' ? 'Operating Hours' : 'Fixed Time Slot'}
                  </span>
                )}

                {/* Operating Days */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Operating Days</p>
                  {scheduleData.operatingDays.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {scheduleData.operatingDays.map((day) => (
                        <span key={day} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100 capitalize">{day.slice(0, 3)}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Not configured</p>
                  )}
                </div>

                {/* Time Slots */}
                {scheduleData.timeSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Time Slots</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scheduleData.timeSlots.map((slot, i) => {
                        const start = typeof slot === "string" ? slot : slot.startTime;
                        const end = slot.endTime;
                        return <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100">{formatTime(start)}{end ? ` \u2013 ${formatTime(end)}` : ""}</span>;
                      })}
                    </div>
                  </div>
                )}

                {/* Capacity */}
                {scheduleData.capacityPerSlot && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <Users size={13} /> Max per booking: <strong className="text-slate-700">{scheduleData.capacityPerSlot}</strong>
                  </div>
                )}

                {/* Valid period */}
                {validPeriod && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <Calendar size={13} /> {formatDate(validPeriod.start)}{validPeriod.end ? ` \u2013 ${formatDate(validPeriod.end)}` : ''}
                  </div>
                )}

                {/* Available Dates */}
                {scheduleData.availableDates.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Available Dates</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scheduleData.availableDates.map((date, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100">{formatDate(date)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* BOOKING OPTIONS */}
            {Array.isArray(content.options) && content.options.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
              >
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-800">Booking Options</h3>
                    </div>
                    <button onClick={() => handleEditSection("Booking Options")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Booking Options">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {content.options.map((opt, i) => {
                    const vLabel = validityLabel(opt);
                    return (
                      <div key={opt.id || i} className="rounded-lg border border-slate-100 p-4 space-y-2 bg-slate-50/40">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{opt.title || `Option ${i + 1}`}</p>
                          {opt.refCode && opt.refCode !== 'default' && (
                            <span className="text-[11px] text-slate-400 shrink-0">Ref: {opt.refCode}</span>
                          )}
                        </div>
                        {vLabel && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Ticket size={12} className="text-slate-400 shrink-0" /> {vLabel}
                          </p>
                        )}
                        {opt.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {opt.isPrivate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-600 border border-violet-200/50"><Lock size={10} /> Private</span>
                          )}
                          {opt.skipTheLine && opt.skipTheLine !== 'none' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200/50"><Tag size={10} /> Skip the line</span>
                          )}
                          {opt.audioGuide && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200/50"><Headphones size={10} /> Audio guide</span>
                          )}
                          {opt.infoBooklet && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-600 border border-teal-200/50"><BookOpen size={10} /> Info booklet</span>
                          )}
                          {opt.maxGroupSize && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-200/50"><Users size={10} /> Max {opt.maxGroupSize} ppl</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* DETAILS */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-800">Details</h3>
                  </div>
                  <button onClick={() => handleEditSection("Details")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Details">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <div className="px-5 py-2">
                <DetailRow icon={Globe} label="Category" value={categorization.category ? `${categorization.category}${categorization.subcategory ? ` / ${categorization.subcategory}` : ""}` : null} />
                <DetailRow icon={Activity} label="Activity Type" value={categorization.activityType || tour.activityType} />
                <DetailRow icon={Clock} label="Duration" value={durationStr} />
                <DetailRow icon={Activity} label="Difficulty" value={categorization.difficulty} />
                <DetailRow icon={Users} label="Group Size" value={categorization.groupSize ? `${categorization.groupSize.min || 1}\u2013${categorization.groupSize.max}` : null} />
                <DetailRow icon={Shield} label="Age Requirement" value={categorization.ageRequirement} />
                <DetailRow icon={Navigation} label="Transport" value={categorization.transportMode && Object.keys(categorization.transportMode).length > 0 ? Object.entries(categorization.transportMode).map(([mode, items]) => {
                  const joined = Array.isArray(items) ? items.join(", ") : (typeof items === "string" ? items : items ? String(items) : "")
                  return joined ? `${mode}: ${joined}` : ""
                }).filter(Boolean).join(" | ") : null} />
                <DetailRow icon={Users} label="Group Type" value={content.isPrivateActivity ? "Private" : "Group"} />
                <DetailRow icon={DollarSign} label="Pricing" value={travelerDetails.pricingModel === "perPerson" ? "Per person" : "Per group"} />
                {(() => {
                  const cats = travelerDetails.pricingCategories || travelerDetails.ageGroups || []
                  const enabled = cats.filter(c => c.enabled !== false)
                  if (enabled.length === 0) return null
                  return (
                    <div className="px-5 py-3 -mx-5 border-t border-slate-50">
                      <p className="text-xs font-medium text-slate-500 mb-2">Pricing categories</p>
                      <div className="space-y-1.5">
                        {enabled.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-700 font-medium">{c.name}</span>
                              <span className="text-slate-400">({c.minAge}–{c.maxAge})</span>
                              {c.idRequired && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-600 font-medium border border-amber-200/50">
                                  {c.idType || 'ID'}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {formatCurrency(c.price ?? 0, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </motion.div>

            {/* TRAVELER INFO REQUIRED */}
            {(() => {
              const flags = [
                content.passportRequired && "Passport",
                content.flightInfoRequired && "Flight Info",
                content.shipInfoRequired && "Ship/Cruise Info",
                content.trainInfoRequired && "Train Info",
                content.hotelInfoRequired && "Hotel Info",
              ].filter(Boolean);
              if (flags.length === 0) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
                  className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
                >
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                        <h3 className="text-sm font-semibold text-slate-800">Traveler Info Required</h3>
                      </div>
                      <button onClick={() => handleEditSection("Traveler Info Required")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Traveler Info">
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4 flex flex-wrap gap-1.5">
                    {flags.map(f => (
                      <span key={f} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100">{f}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            {/* LOCATION */}
            {(location.city || location.country || tour.latitude) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
                className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
              >
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-800">Location</h3>
                    </div>
                    <button onClick={() => handleEditSection("Location")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Location">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-800">{[location.city, location.country].filter(Boolean).join(", ") || "Not specified"}</p>
                  {location.region && <p className="text-xs text-slate-500 mt-0.5">{location.region}</p>}
                  {tour.latitude && tour.longitude && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                      <Navigation size={10} /> {tour.latitude}, {tour.longitude}
                    </p>
                  )}
                  {uniqueCities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Tour stops in</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCities.map((city) => (
                          <span key={city} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}



            {/* BOOKING RULES */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.25 }}
              className="group bg-white rounded-xl border border-slate-100 shadow-sm shadow-slate-900/5 overflow-hidden hover:shadow-md hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-200"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-0.5 h-4 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-800">Booking Rules</h3>
                  </div>
                  <button onClick={() => handleEditSection("Booking Rules")} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-100" title="Edit Booking Rules">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {booking.ticketType && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Tag size={14} className="text-slate-400 shrink-0" /> <span>Ticket type: <strong className="text-slate-700">{booking.ticketType}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-slate-600">
                  {booking.instantBooking ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Clock size={14} className="text-slate-400 shrink-0" />}
                  <span>{booking.instantBooking ? "Instant booking" : "Request booking"}</span>
                </div>
                {typeof booking.instantConfirmation === 'boolean' && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    {booking.instantConfirmation ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Clock size={14} className="text-slate-400 shrink-0" />}
                    <span>{booking.instantConfirmation ? "Instant confirmation" : "Manual confirmation"}</span>
                  </div>
                )}
                {travelerDetails.maxParticipants && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Users size={14} className="text-slate-400 shrink-0" /> Max travelers: <strong className="text-slate-700">{travelerDetails.maxParticipants}</strong>
                  </div>
                )}
                {booking.maxQuantity && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Users size={14} className="text-slate-400 shrink-0" /> Max per booking: <strong className="text-slate-700">{booking.maxQuantity}</strong>
                  </div>
                )}
                {booking.bookingWindow?.start && booking.bookingWindow?.end && (
                  <div className="flex items-start gap-2.5 text-slate-600">
                    <Calendar size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div><span className="font-medium text-slate-700">Booking window:</span> <span className="text-slate-500">{formatDate(booking.bookingWindow.start)} \u2013 {formatDate(booking.bookingWindow.end)}</span></div>
                  </div>
                )}
                {booking.minAdvanceBookingHours && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Clock size={14} className="text-slate-400 shrink-0" /> Book <strong className="text-slate-700">{booking.minAdvanceBookingHours}h</strong> in advance
                  </div>
                )}
                {cancellation.type && (
                  <div className="flex items-start gap-2.5 text-slate-600">
                    <Shield size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700">Cancellation:</span> <span className="text-slate-500">{cancellation.type}{cancellation.refundPercentage ? ` (${cancellation.refundPercentage}% refund)` : ""}</span>
                      {cancellation.refundRules?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cancellation.refundRules.map((rule, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100">{rule.daysBefore ? `${rule.daysBefore}+ days: ` : ""}{rule.refundPercentage}%</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {content.meetingInstructions && (
                  <div className="flex items-start gap-2.5 text-sm text-slate-600">
                    <MessageSquare size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>{content.meetingInstructions}</span>
                  </div>
                )}
                {content.contactPhone?.number && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Globe size={14} className="text-slate-400 shrink-0" /> Contact: <strong className="text-slate-700">{content.contactPhone.countryCode} {content.contactPhone.number}</strong>
                  </div>
                )}
                {booking.travelerRequiredInfo?.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Traveler Required Info</p>
                    <div className="flex flex-wrap gap-1">
                      {booking.travelerRequiredInfo.map((info, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100">{info}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* INCLUDED / EXCLUDED */}
            {(included.length > 0 || excluded.length > 0 || content.meals?.length > 0 || content.foodProvided || content.drinksIncluded || content.dietaryOptions?.length > 0) && (
              <SectionCard title="What's Included" onEdit={() => handleEditSection("What's Included")}>
                <div className="space-y-5">
                  {included.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-3">Included</h3>
                      <ul className="space-y-2.5">
                        {included.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                            <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Check size={10} className="text-emerald-500" />
                            </div>
                            <span className="min-w-0 break-words leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excluded.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-3">Excluded</h3>
                      <ul className="space-y-2.5">
                        {excluded.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                            <div className="w-4 h-4 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                              <XIcon size={10} className="text-red-400" />
                            </div>
                            <span className="min-w-0 break-words leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(content.foodProvided || content.meals?.length > 0 || content.drinksIncluded || content.dietaryOptions?.length > 0) && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      {content.foodProvided && <p className="text-sm text-slate-600"><span className="font-medium">Meals:</span> {content.meals?.map(m => `${m.type} (${m.format})`).join(', ') || 'Provided'}</p>}
                      {content.drinksIncluded && <p className="text-sm text-slate-600"><span className="font-medium">Drinks:</span> Included</p>}
                      {content.dietaryOptions?.length > 0 && <p className="text-sm text-slate-600"><span className="font-medium">Dietary options:</span> {content.dietaryOptions.join(', ')}</p>}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* WHAT TO BRING */}
            {content.whatToBring?.length > 0 && (
              <SectionCard title="What to Bring" onEdit={() => handleEditSection("What to Bring")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {content.whatToBring.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-50 text-sm text-slate-600">
                      <Check size={12} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ACCESSIBILITY & HEALTH */}
            {(() => {
              const a = content.accessibility || {};
              const restrictions = [
                !a.wheelchairAccessible && "Not wheelchair accessible",
                !a.strollerAccessible && "Not stroller accessible",
                !a.serviceAnimalsAllowed && "No service animals",
                !a.publicTransportation && "No public transportation nearby",
                !a.infantsOnLaps && "Infants must sit on laps",
                !a.infantSeatsAvailable && "No infant seats available",
              ].filter(Boolean);
              const hasHealth = content.healthRestrictions?.length > 0;
              const hasPhysical = !!content.physicalDifficulty;
              const hasAccess = restrictions.length > 0;
              if (!hasAccess && !hasHealth && !hasPhysical) return null;
              return (
                <SectionCard title="Accessibility & Health" onEdit={() => handleEditSection("Accessibility & Health")}>
                  <div className="space-y-2">
                    {hasPhysical && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Activity size={12} className="text-slate-400 shrink-0" />
                        <span>Physical level: <strong className="text-slate-700 capitalize">{content.physicalDifficulty}</strong></span>
                      </div>
                    )}
                    {restrictions.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <XIcon size={12} className="text-amber-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                    {hasHealth && (
                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Health Restrictions</p>
                        {content.healthRestrictions.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-600 py-0.5">
                            <AlertCircle size={11} className="text-amber-400 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>
              );
            })()}

          </div>
        </div>
      </div>

      {/* MODALS */}
      <AllPhotosModal displayPhotos={displayPhotos} open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelect={setLightboxIndex} handleImageError={handleImageError} tour={tour} />
      <PhotoGalleryModal displayPhotos={displayPhotos} index={lightboxIndex} setLightboxIndex={setLightboxIndex} tour={tour} />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete product"
        entityName={tour?.title}
        isLoading={deleting}
      />
    </div>
  );
}
