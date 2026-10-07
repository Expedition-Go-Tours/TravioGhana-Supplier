/**
 * Stays workspace navigation — one source for the sidebar AND the search
 * palette, so a page can never appear in one and not the other.
 *
 * The grouping mirrors the Stays dashboard prototype:
 *
 *   STAYS              the property workspace itself
 *   GROW YOUR BUSINESS offers, cancellation reporting and analytics
 *   SHARED ACCOUNT     the account-level pages that stay shared with the
 *                      Experiences workspace until their Stays versions land
 *                      (finance, notifications, verification, settings, team)
 *
 * `permission` always comes from PAGE_ACCESS so the route guards, the
 * sidebar and search agree by construction.
 */
import {
  LayoutDashboard,
  Home,
  Ticket,
  CalendarDays,
  LineChart,
  Table,
  NotebookText,
  BadgePercent,
  CalendarX2,
  MessageSquare,
  DollarSign,
  Star,
  Bell,
  BarChart3,
  ShieldCheck,
  Settings,
  UserPlus,
} from "lucide-react";
import { PAGE_ACCESS } from "@/config/pageAccess";

export const STAYS_NAV_GROUPS = [
  {
    label: "STAYS",
    items: [
      {
        label: "Dashboard",
        path: "/stays",
        icon: LayoutDashboard,
        iconName: "LayoutDashboard",
        permission: PAGE_ACCESS["/stays"],
        keywords: ["home", "overview", "stats"],
        // Exact match only: `/stays` must not stay active on `/stays/properties`.
        end: true,
      },
      {
        label: "Properties",
        path: "/stays/properties",
        icon: Home,
        iconName: "Home",
        permission: PAGE_ACCESS["/stays/properties"],
        keywords: ["listings", "hotel", "apartment", "rooms", "accommodation"],
      },
      {
        label: "Bookings",
        path: "/stays/bookings",
        icon: Ticket,
        iconName: "Ticket",
        permission: PAGE_ACCESS["/stays/bookings"],
        keywords: ["reservations", "guests", "stays"],
      },
      {
        label: "Messages",
        path: "/stays/messages",
        icon: MessageSquare,
        iconName: "MessageSquare",
        permission: PAGE_ACCESS["/stays/messages"],
        keywords: ["guest", "inbox", "questions", "chat"],
      },
      {
        label: "Availability",
        path: "/stays/availability",
        icon: CalendarDays,
        iconName: "CalendarDays",
        permission: PAGE_ACCESS["/stays/availability"],
        keywords: ["calendar", "inventory", "blocked", "dates"],
      },
      {
        label: "Rates & availability",
        path: "/stays/rates",
        icon: LineChart,
        iconName: "LineChart",
        permission: PAGE_ACCESS["/stays/rates"],
        keywords: ["pricing", "rate plans", "nightly", "cancellation"],
      },
      {
        label: "Rooms & units",
        path: "/stays/rooms",
        icon: Table,
        iconName: "Table",
        permission: PAGE_ACCESS["/stays/rooms"],
        keywords: ["room types", "units", "beds", "capacity"],
      },
      {
        label: "Policies",
        path: "/stays/policies",
        icon: NotebookText,
        iconName: "NotebookText",
        permission: PAGE_ACCESS["/stays/policies"],
        keywords: ["house rules", "check-in", "children", "safety"],
      },
      {
        label: "Reviews",
        path: "/stays/reviews",
        icon: Star,
        iconName: "Star",
        permission: PAGE_ACCESS["/stays/reviews"],
        keywords: ["rating", "feedback", "reputation"],
      },
    ],
  },
  {
    label: "GROW YOUR BUSINESS",
    items: [
      {
        label: "Special Offers",
        path: "/stays/special-offers",
        icon: BadgePercent,
        iconName: "BadgePercent",
        permission: PAGE_ACCESS["/stays/special-offers"],
        keywords: ["discount", "deal", "promo", "offer"],
      },
      {
        label: "Cancellation",
        path: "/stays/cancellation",
        icon: CalendarX2,
        iconName: "CalendarX2",
        permission: PAGE_ACCESS["/stays/cancellation"],
        keywords: ["cancel", "rate", "no-show"],
      },
      {
        label: "Analytics",
        path: "/stays/analytics",
        icon: BarChart3,
        iconName: "BarChart3",
        permission: PAGE_ACCESS["/stays/analytics"],
        keywords: ["stats", "reports", "insights", "revenue"],
      },
      {
        label: "Finance",
        path: "/stays/finance",
        icon: DollarSign,
        iconName: "DollarSign",
        permission: PAGE_ACCESS["/stays/finance"],
        keywords: ["money", "payout", "earnings", "withdraw", "bank"],
      },
    ],
  },
  {
    label: "SHARED ACCOUNT",
    items: [
      {
        label: "Notifications",
        path: "/notifications",
        icon: Bell,
        iconName: "Bell",
        permission: PAGE_ACCESS["/notifications"],
        keywords: ["alerts", "updates"],
      },
      {
        label: "Verification",
        path: "/verification",
        icon: ShieldCheck,
        iconName: "ShieldCheck",
        permission: PAGE_ACCESS["/verification"],
        keywords: ["verify", "identity", "badge", "kyc"],
      },
      {
        label: "Settings",
        path: "/settings",
        icon: Settings,
        iconName: "Settings",
        permission: PAGE_ACCESS["/settings"],
        keywords: ["account", "preferences", "configuration"],
        // Settings and Team both live on /settings — the tab decides which
        // row is current, otherwise both would highlight at once.
        match: (location) =>
          location.pathname === "/settings" &&
          new URLSearchParams(location.search).get("tab") !== "team",
      },
      {
        label: "Team",
        path: "/settings?tab=team",
        icon: UserPlus,
        iconName: "UserPlus",
        permission: PAGE_ACCESS["/settings"],
        keywords: ["members", "roles", "invite", "staff"],
        match: (location) =>
          location.pathname === "/settings" &&
          new URLSearchParams(location.search).get("tab") === "team",
      },
    ],
  },
];

/** Flat list, for search and active-route lookups. */
export const STAYS_NAV_ITEMS = STAYS_NAV_GROUPS.flatMap((group) => group.items);

/** Is this path inside the Stays workspace? (`/stays` itself included.) */
export function isStaysPath(pathname) {
  return /^\/stays(\/|$)/.test(pathname || "");
}
