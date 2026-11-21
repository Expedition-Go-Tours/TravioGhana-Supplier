import {
  Package,
  CalendarCheck,
  Star,
  AlertTriangle,
  Info,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/**
 * One row anatomy for every notification surface: the bell, the page and the
 * dashboard panel all read this map.
 *
 * `chip` is a complete pair of classes (background + text). The dashboard used
 * to read `bg` and `text` from here, which never existed, so its icon chips
 * rendered with no background at all.
 *
 * The palette is deliberately six hues, not nine: bookings are the most common
 * notification and get a neutral chip so money, messages and alerts are the
 * things that stand out. `group` is the word shown in the row's meta line.
 */
export const NOTIFICATION_TYPES = {
  booking: {
    icon: CalendarCheck,
    chip: "bg-slate-100 text-slate-700",
    label: "Booking",
    group: "Bookings",
  },
  review: {
    icon: Star,
    chip: "bg-amber-50 text-amber-700",
    label: "Review",
    group: "Reviews",
  },
  product: {
    icon: Package,
    chip: "bg-sky-50 text-sky-700",
    label: "Product",
    group: "Products",
  },
  payment: {
    icon: DollarSign,
    chip: "bg-primary-50 text-primary-600",
    label: "Payment",
    group: "Money",
  },
  alert: {
    icon: AlertTriangle,
    chip: "bg-red-50 text-red-600",
    label: "Alert",
    group: "Alerts",
  },
  system: {
    icon: Info,
    chip: "bg-slate-100 text-slate-600",
    label: "System",
    group: "System",
  },
  message: {
    icon: MessageSquare,
    chip: "bg-indigo-50 text-indigo-600",
    label: "Message",
    group: "Messages",
  },
  cancellation_approved: {
    icon: CheckCircle2,
    chip: "bg-emerald-50 text-emerald-700",
    label: "Cancellation approved",
    group: "Bookings",
  },
  cancellation_rejected: {
    icon: XCircle,
    chip: "bg-red-50 text-red-600",
    label: "Cancellation rejected",
    group: "Bookings",
  },
};

export const NOTIFICATIONS_QUERY_KEY = "notifications";
