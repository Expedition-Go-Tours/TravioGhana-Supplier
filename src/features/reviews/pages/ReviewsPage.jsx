import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Pen,
  Phone,
  RefreshCw,
  Search,
  Send,
  Star,
  ThumbsUp,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
  X,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import {
  addReviewResponse,
  deleteReviewResponse,
  fetchSupplierReviews,
  flagReview,
  updateReviewResponse,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import { fetchCustomerBookings } from "@/features/bookings/api";

const REVIEW_TABS = [
  { key: "all", label: "All Reviews", status: undefined },
  { key: "replied", label: "Replied", clientFilter: "replied" },
  { key: "unreplied", label: "Unreplied", clientFilter: "unreplied" },
];

const FLAG_REASONS = [
  "Inappropriate content (abusive, hateful, or sexual)",
  "Not appropriate or family-friendly",
  "Spam or self-promotion",
  "Off-topic / not about this tour",
  "Reviewer did not take this tour / did not experience this business",
  "Posted to the wrong business",
  "Describes an experience from more than a year ago",
  "Written by a competitor or their employee",
  "Privacy violation",
  "Contains false or misleading information",
  "Duplicate review",
  "Conflict of interest (incentivized or unverified)",
];

const STAT_ACCENTS = {
  emerald: "border-emerald-200/50 hover:border-emerald-300/60",
  amber: "border-amber-200/50 hover:border-amber-300/60",
  blue: "border-blue-200/50 hover:border-blue-300/60",
};

const STAT_ICON_BG = {
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

const STAT_VALUE_COLOR = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
};

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function StarRating({ rating, size = "sm", animated = false }) {
  const starSize = size === "lg" ? 18 : size === "md" ? 14 : 12;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={animated ? { scale: 0, rotate: -180 } : undefined}
          animate={animated ? { scale: 1, rotate: 0 } : undefined}
          transition={{ delay: animated ? i * 0.06 : 0, type: "spring", stiffness: 300, damping: 12 }}
        >
          <Star
            size={starSize}
            className={cn(
              i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200",
              "transition-colors duration-200"
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}

function computeStats(reviews) {
  const total = reviews.length;
  if (!total) return { avgRating: 0, total: 0, responseRate: 0, withPhotos: 0 };

  const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = (sumRating / total).toFixed(1);
  const replied = reviews.filter((r) => Boolean(r.supplierResponse)).length;
  const responseRate = Math.round((replied / total) * 100);
  const withPhotos = reviews.filter((r) => r.photos > 0).length;

  return { avgRating, total, responseRate, withPhotos };
}

function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-all duration-200",
        accent ? STAT_ACCENTS[accent] : "border-slate-100 hover:shadow-sm hover:border-slate-200"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        accent ? STAT_ICON_BG[accent] : "bg-slate-50 text-slate-500"
      )}>
        <Icon size={18} />
      </div>
      <div>
        <p className={cn(
          "text-lg font-bold",
          accent ? STAT_VALUE_COLOR[accent] : "text-slate-800"
        )}>{value}</p>
        <p className="text-[11px] font-medium text-slate-500 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-2.5 w-36 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function ReplyModal({ review, onClose, onSubmit, submitting }) {
  const [text, setText] = useState(review.supplierResponse || "");
  const maxChars = 1000;

  const handleSubmit = () => {
    if (text.trim().length < 10) {
      toast.error("Response must be at least 10 characters");
      return;
    }
    onSubmit(review, text.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
              <MessageSquare size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {review.supplierResponse ? "Edit Response" : "Reply to Review"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{review.customerName} · {review.tourName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} />
              <span className="text-xs font-medium text-slate-400">{review.rating}/5</span>
            </div>
            {review.comment && (
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                "{review.comment}"
              </p>
            )}
          </div>

          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {review.supplierResponse ? "Update your response" : "Write your response"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxChars))}
            rows={5}
            placeholder="Share your thoughts on this review..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 resize-none placeholder:text-slate-400 transition-all"
          />
          <div className="flex items-center justify-between mt-2">
            <span className={cn(
              "text-xs font-medium",
              text.length > maxChars * 0.9 ? "text-amber-500" :
              text.length > maxChars * 0.75 ? "text-slate-500" :
              "text-slate-400"
            )}>
              {text.length}/{maxChars}
            </span>
            <span className="text-[11px] text-slate-400">Minimum 10 characters</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || text.trim().length < 10}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-200"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} className="-ml-0.5" />
            )}
            {review.supplierResponse ? "Update Response" : "Post Response"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FlagModal({ review, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Select a reason for flagging this review");
      return;
    }
    onSubmit(review, { reason, comment: comment.trim() || undefined });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
              <Flag size={16} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Flag this review</h2>
              <p className="text-xs text-slate-500 mt-0.5">{review.customerName} · {review.tourName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} />
              <span className="text-xs font-medium text-slate-400">{review.rating}/5</span>
            </div>
            {review.comment && (
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                "{review.comment}"
              </p>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-3">Why are you flagging this review?</p>
          <div className="space-y-1.5">
            {FLAG_REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${reason === r ? "border-amber-300 bg-amber-50/60" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="radio"
                  name="flag-reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="mt-0.5 h-4 w-4 accent-amber-500"
                />
                <span className="text-sm text-slate-700 leading-snug">{r}</span>
              </label>
            ))}
          </div>

          <label className="block text-sm font-semibold text-slate-700 mt-4 mb-2">
            Anything else we should know? <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Add context to help our team review this quickly..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 resize-none placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-amber-200"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} className="-ml-0.5" />}
            Submit flag
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewPhotoLightbox({ photos, index, onClose, onIndexChange }) {  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
      >
        <X size={24} />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <OptimizedImage
          src={photos[index]}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </motion.div>

      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onIndexChange(i); }}
              className={cn(
                "rounded-full transition-all duration-200",
                i === index
                  ? "w-5 h-2 bg-white"
                  : "w-2 h-2 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
          <span className="ml-3 text-xs font-medium text-white/50">
            {index + 1} / {photos.length}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("reviewId");
  const [highlightedReviewId, setHighlightedReviewId] = useState(null);
  const [lightboxPhotos, setLightboxPhotos] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [replyTarget, setReplyTarget] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagSaving, setFlagSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerBookingsLoading, setCustomerBookingsLoading] = useState(false);

  const currentTab = REVIEW_TABS.find((t) => t.key === activeTab) || REVIEW_TABS[0];

  const loadReviews = useCallback(async () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (currentTab.status) params.status = currentTab.status;
      const result = await fetchSupplierReviews(params);
      setReviews(result.reviews);
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      setError(err.response?.data?.message || err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [currentTab.status]);

  useEffect(() => { Promise.resolve().then(() => loadReviews()); }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    let data = [...reviews];
    if (currentTab.clientFilter === "replied") {
      data = data.filter((r) => Boolean(r.supplierResponse));
    } else if (currentTab.clientFilter === "unreplied") {
      data = data.filter((r) => !r.supplierResponse);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.tourName.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }
    return data;
  }, [reviews, currentTab.clientFilter, search]);

  const stats = useMemo(() => computeStats(reviews), [reviews]);

  useEffect(() => {
    if (highlightId && reviews.length > 0) {
      const match = reviews.find((r) => r.id === highlightId);
      if (match) {
        Promise.resolve().then(() => {
          setHighlightedReviewId(highlightId);
          setTimeout(() => {
            const el = document.getElementById(`review-${highlightId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        });
        const timer = setTimeout(() => {
          setHighlightedReviewId(null);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("reviewId");
            return next;
          }, { replace: true });
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, reviews, setSearchParams]);

  const handleOpenReply = (review) => setReplyTarget(review);

  const handleOpenFlag = (review) => setFlagTarget(review);

  const handleSubmitFlag = async (review, { reason, comment }) => {
    setFlagSaving(true);
    try {
      await flagReview(review.id, { reason, comment });
      toast.success("Review flagged for our team to review");
      setFlagTarget(null);
      await loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to flag review");
    } finally {
      setFlagSaving(false);
    }
  };

  const handleSubmitReply = async (review, text) => {
    setSubmitting(true);
    try {
      if (review.supplierResponse) {
        await updateReviewResponse(review.id, text);
        toast.success("Response updated");
      } else {
        await addReviewResponse(review.id, text);
        toast.success("Response posted");
      }
      setReplyTarget(null);
      await loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!confirm("Remove your response to this review?")) return;
    try {
      await deleteReviewResponse(reviewId);
      toast.success("Response removed");
      await loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove response");
    }
  };

  const handleCustomerClick = async (review) => {
    setSelectedCustomer(review);
    if (!review.customerId) return;
    setCustomerBookingsLoading(true);
    try {
      const bookings = await fetchCustomerBookings(review.customerId);
      setCustomerBookings(bookings || []);
    } catch {
      setCustomerBookings([]);
    } finally {
      setCustomerBookingsLoading(false);
    }
  };

  const openLightbox = (photos, index) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxPhotos(null);

  const changeLightboxIndex = useCallback((next) => {
    if (!lightboxPhotos) return;
    const total = lightboxPhotos.length;
    setLightboxIndex(((next % total) + total) % total);
  }, [lightboxPhotos]);

  useEffect(() => {
    if (!lightboxPhotos) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") changeLightboxIndex(lightboxIndex - 1);
      if (e.key === "ArrowRight") changeLightboxIndex(lightboxIndex + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxPhotos, lightboxIndex, changeLightboxIndex]);

  const formatCurrency = (amount, currency = "EUR") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const BOOKING_STATUS_CONFIG = {
    PENDING: { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
    CONFIRMED: { label: "Confirmed", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    COMPLETED: { label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    CANCELLED: { label: "Cancelled", dot: "bg-red-400", bg: "bg-red-50", text: "text-red-600" },
    NO_SHOW: { label: "No Show", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600" },
    REFUNDED: { label: "Refunded", dot: "bg-purple-400", bg: "bg-purple-50", text: "text-purple-600" },
  };

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Reviews</h1>
              {!loading && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                >
                  {stats.total}
                </motion.span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Customer feedback across your tours</p>
          </div>
        </div>
        <button
          onClick={loadReviews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 shadow-sm"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Refresh
        </button>
      </div>

      {/* Stats Banner */}
      {!loading && !error && reviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <StatPill icon={Star} label="Average Rating" value={stats.avgRating} accent="amber" />
          <StatPill icon={MessageSquare} label="Total Reviews" value={stats.total} accent="emerald" />
          <StatPill icon={TrendingUp} label="Response Rate" value={`${stats.responseRate}%`} accent="blue" />
          <StatPill icon={Camera} label="With Photos" value={stats.withPhotos} accent="emerald" />
        </motion.div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl flex-1 min-w-0 overflow-x-auto scrollbar-none">
          {REVIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              )}
            >
              {activeTab === tab.key && (
                <motion.span
                  layoutId="activeTab"
                  className={cn(
                    "absolute inset-0 rounded-lg bg-emerald-600"
                  )}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 placeholder:text-slate-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200/60 rounded-xl">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Failed to load reviews</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
              <button
                onClick={loadReviews}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <ReviewSkeleton key={i} />
            ))}
          </motion.div>
        ) : filteredReviews.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-20 px-5"
          >
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-6 ring-1 ring-emerald-200/60 shadow-inner">
              {search ? (
                <Search size={32} className="text-emerald-300" />
              ) : (
                <Inbox size={32} className="text-emerald-300" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1.5">
              {search ? "No matching reviews" : "No reviews yet"}
            </h3>
            <p className="text-sm text-slate-400 max-w-[260px] text-center leading-relaxed">
              {search
                ? "Try adjusting your search terms or filtering by a different status."
                : "Customer reviews will appear here once guests start leaving feedback on your tours."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab + search}
            variants={STAGGER}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {filteredReviews.map((review) => (
              <motion.div
                key={review.id}
                id={`review-${review.id}`}
                variants={FADE_UP}
                layout
                className={cn(
                  "group relative bg-white border rounded-xl transition-all duration-200",
                  highlightedReviewId === review.id
                    ? "border-emerald-400 ring-2 ring-emerald-200/60 shadow-lg shadow-emerald-200/30"
                    : "border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-900/5"
                )}
              >
                {/* Status accent bar */}
                <div className={cn(
                  "absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300",
                  review.supplierResponse
                    ? "bg-linear-to-b from-emerald-400 to-emerald-300"
                    : "bg-linear-to-b from-amber-400 to-amber-300"
                )} />

                <div className="pl-5 pr-5 py-5">
                  {/* Top row */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <button
                      onClick={() => handleCustomerClick(review)}
                      className="w-10 h-10 rounded-full shrink-0 ring-1 ring-emerald-200/50 overflow-hidden bg-linear-to-br from-emerald-50 to-emerald-100 flex items-center justify-center hover:ring-emerald-400 transition-all"
                    >
                      {review.customerPhoto ? (
                        <OptimizedImage src={review.customerPhoto} width={40} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-emerald-700">
                          {(review.customerName || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                        <button
                          onClick={() => handleCustomerClick(review)}
                          className="text-sm font-semibold text-slate-800 hover:text-emerald-700 transition-colors"
                        >
                          {review.customerName}
                        </button>
                        <StarRating rating={review.rating} />
                        <span className="text-[11px] font-medium text-slate-400">{review.rating}.0</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          onClick={() => navigate(`/products/${review.tourId}`)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {review.tourPhoto ? (
                            <OptimizedImage src={review.tourPhoto} width={32} className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center">
                              <ArrowUpRight size={10} className="text-slate-300" />
                            </span>
                          )}
                          <span>{review.tourName}</span>
                        </button>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{formatDate(review.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {review.flagged ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60"
                          title={review.flagReason ? `Flagged: ${review.flagReason}` : "Flagged for review"}
                        >
                          <Flag size={11} />
                          Flagged for review
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenFlag(review)}
                          title="Flag this review"
                          className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Flag size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title + Comment */}
                  {review.title && (
                    <h3 className="text-sm font-semibold text-slate-800 mb-1.5">{review.title}</h3>
                  )}
                  {review.comment && (
                    <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                  )}

                  {/* Metadata badges */}
                  <div className="flex items-center gap-3 mt-3">
                    {review.photos > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openLightbox(review.photoUrls, 0); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/50 hover:bg-amber-100 cursor-pointer transition-colors"
                      >
                        <Camera size={12} />
                        {review.photos} {review.photos === 1 ? "photo" : "photos"}
                      </button>
                    )}
                    {review.helpful > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                        <ThumbsUp size={12} />
                        {review.helpful}
                      </span>
                    )}
                  </div>

                  {/* Supplier Response */}
                  {review.supplierResponse && (
                    <div className="relative mt-4 ml-2 pl-4 border-l-2 border-emerald-200/80">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Your Response</span>
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenReply(review)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit response"
                          >
                            <Pen size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteReply(review.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove response"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{review.supplierResponse}</p>
                      {review.supplierResponseAt && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-[11px] font-medium text-slate-400">
                            Posted {formatDate(review.supplierResponseAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reply action */}
                  {!review.supplierResponse && (
                    <div className="mt-4 flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleOpenReply(review)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                      >
                        <MessageSquare size={13} />
                        Reply to this review
                      </button>
                    </div>
                  )}

                  {/* Always show reply/edit for replied reviews */}
                  {review.supplierResponse && (
                    <div className="mt-3 flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleOpenReply(review)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-all"
                      >
                        <Pen size={12} />
                        Edit response
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyTarget && (
          <ReplyModal
            review={replyTarget}
            onClose={() => setReplyTarget(null)}
            onSubmit={handleSubmitReply}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      {/* Flag Modal */}
      <AnimatePresence>
        {flagTarget && (
          <FlagModal
            review={flagTarget}
            onClose={() => setFlagTarget(null)}
            onSubmit={handleSubmitFlag}
            submitting={flagSaving}
          />
        )}
      </AnimatePresence>

      {/* Customer Profile Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => { setSelectedCustomer(null); setCustomerBookings([]); }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl shadow-black/10 z-50 flex flex-col"
            >
              {/* Header */}
              <div className="bg-linear-to-r from-[#044b3b] to-emerald-700 px-5 h-16 flex items-center justify-between relative shrink-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
                <h3 className="relative text-sm font-semibold text-white/90">Customer Profile</h3>
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerBookings([]); }}
                  className="relative flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Customer card */}
              <div className="relative -mt-4 px-4 shrink-0">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-[#044b3b] to-emerald-500 text-xl font-bold text-white shadow-sm ring-2 ring-white/80">
                      <span>{(selectedCustomer.customerName || "?").charAt(0).toUpperCase()}</span>
                      {selectedCustomer.customerPhoto && (
                        <OptimizedImage
                          src={selectedCustomer.customerPhoto}
                          width={56}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedCustomer.customerName || "Unknown"}</p>
                      <div className="mt-1 space-y-0.5">
                        {selectedCustomer.customerEmail && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Mail size={10} className="shrink-0 text-gray-400" />
                            <span className="truncate">{selectedCustomer.customerEmail}</span>
                          </div>
                        )}
                        {selectedCustomer.customerPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Phone size={10} className="shrink-0 text-gray-400" />
                            <span>{selectedCustomer.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              {!customerBookingsLoading && customerBookings.length > 0 && (
                <div className="mx-4 mt-2.5 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                  <div className="flex items-center divide-x divide-gray-200">
                    <div className="flex-1 flex flex-col items-center py-2">
                      <span className="text-sm font-bold text-gray-900">{customerBookings.length}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Bookings</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-2">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(customerBookings.reduce((s, b) => s + (b.total || 0), 0))}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Total</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-2">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(Math.round(customerBookings.reduce((s, b) => s + (b.total || 0), 0) / customerBookings.length))}
                      </span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Average</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings list */}
              <div className="flex-1 overflow-y-auto">
                {customerBookingsLoading ? (
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
                ) : customerBookings.length === 0 ? (
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
                        {customerBookings.length} Booking{customerBookings.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {customerBookings.map((booking) => {
                      const st = BOOKING_STATUS_CONFIG[booking.status] || { label: booking.status, dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-600" };
                      return (
                        <div
                          key={booking.id}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors group"
                          onClick={() => navigate(`/bookings?bookingId=${booking.id}`)}
                        >
                          <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                            {booking.tourPhoto ? (
                              <OptimizedImage src={booking.tourPhoto} width={40} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <Ticket size={16} className="text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{booking.tourName}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${st.bg} ${st.text}`}>
                                <span className={`w-1 h-1 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Calendar size={9} />
                                {formatDate(booking.travelDate)}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Users size={9} />
                                {booking.travelers}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-900 mt-1.5 block">{formatCurrency(booking.total, booking.currency)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxPhotos && (
          <ReviewPhotoLightbox
            photos={lightboxPhotos}
            index={lightboxIndex}
            onClose={closeLightbox}
            onIndexChange={changeLightboxIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
