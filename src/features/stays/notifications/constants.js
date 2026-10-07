/**
 * Stays notification types — the Stays twin of
 * `features/notifications/constants.js`. Same icon language, but property
 * copy: a listing notification is a "Property", not a "Product".
 */
import {
  Home,
  CalendarCheck,
  Star,
  AlertTriangle,
  Info,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const STAYS_NOTIFICATION_TYPES = {
  booking: { icon: CalendarCheck, color: "bg-[#ebfcf5] text-[#047857]", label: "Booking" },
  review: { icon: Star, color: "bg-[#fffbeb] text-[#b45309]", label: "Review" },
  product: { icon: Home, color: "bg-[#ebfcf5] text-[#047857]", label: "Property" },
  payment: { icon: DollarSign, color: "bg-[#f0fdf4] text-[#044b3b]", label: "Payment" },
  alert: { icon: AlertTriangle, color: "bg-[#ffebeb] text-[#b91c1c]", label: "Alert" },
  system: { icon: Info, color: "bg-[#f0fdf4] text-[#047857]", label: "System" },
  message: { icon: MessageSquare, color: "bg-[#ebfcf5] text-[#044b3b]", label: "Message" },
  cancellation_approved: { icon: CheckCircle2, color: "bg-[#ebfcf5] text-[#047857]", label: "Cancellation approved" },
  cancellation_rejected: { icon: XCircle, color: "bg-[#ffebeb] text-[#b91c1c]", label: "Cancellation rejected" },
};

export const STAYS_NOTIFICATIONS_QUERY_KEY = ["stays", "notifications"];
