import {
  Package,
  CalendarCheck,
  Star,
  AlertTriangle,
  Info,
  DollarSign,
  MessageSquare,
} from "lucide-react";

export const NOTIFICATION_TYPES = {
  booking: { icon: CalendarCheck, color: "bg-[#ebfcf5] text-[#047857]", label: "Booking" },
  review: { icon: Star, color: "bg-[#fffbeb] text-[#b45309]", label: "Review" },
  product: { icon: Package, color: "bg-[#ebfcf5] text-[#047857]", label: "Product" },
  payment: { icon: DollarSign, color: "bg-[#f0fdf4] text-[#044b3b]", label: "Payment" },
  alert: { icon: AlertTriangle, color: "bg-[#ffebeb] text-[#b91c1c]", label: "Alert" },
  system: { icon: Info, color: "bg-[#f0fdf4] text-[#047857]", label: "System" },
  message: { icon: MessageSquare, color: "bg-[#ebfcf5] text-[#044b3b]", label: "Message" },
};

export const NOTIFICATIONS_QUERY_KEY = "notifications";




