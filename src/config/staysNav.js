/**
 * Stays workspace navigation — one source for the sidebar AND the search
 * palette, so a page can never appear in one and not the other.
 *
 * The grouping mirrors the Stays dashboard prototype:
 *
 *   STAYS              the property workspace itself
 *   GROW YOUR BUSINESS offers, cancellation reporting and analytics
 *   ACCOUNT            the Stays workspace's own account pages (notifications,
 *                      verification, settings and team) — separate from the
 *                      Experiences workspace's equivalents
 *
 * `permission` always comes from PAGE_ACCESS so the route guards, the
 * sidebar and search agree by construction.
 */
import {
  LayoutDashboard,
  Users,
  Home,
  Ticket,
  CalendarDays,
  LineChart,
  BadgePercent,
  CalendarX2,
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
        label: "Customers",
        path: "/stays/customers",
        icon: Users,
        iconName: "Users",
        permission: PAGE_ACCESS["/stays/customers"],
        keywords: ["chat", "messages", "inbox", "guests"],
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
        label: "Rate",
        path: "/stays/rates",
        icon: LineChart,
        iconName: "LineChart",
        permission: PAGE_ACCESS["/stays/rates"],
        keywords: ["pricing", "rate plans", "nightly", "cancellation"],
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
    label: "ACCOUNT",
    items: [
      {
        label: "Notifications",
        path: "/stays/notifications",
        icon: Bell,
        iconName: "Bell",
        permission: PAGE_ACCESS["/stays/notifications"],
        keywords: ["alerts", "updates"],
      },
      {
        label: "Verification",
        path: "/stays/verification",
        icon: ShieldCheck,
        iconName: "ShieldCheck",
        permission: PAGE_ACCESS["/stays/verification"],
        keywords: ["verify", "documents", "property", "kyc"],
      },
      {
        label: "Settings",
        path: "/stays/settings",
        icon: Settings,
        iconName: "Settings",
        permission: PAGE_ACCESS["/stays/settings"],
        keywords: ["account", "preferences", "configuration"],
        // Settings and Team both live on /stays/settings — the tab decides
        // which row is current, otherwise both would highlight at once.
        match: (location) =>
          location.pathname === "/stays/settings" &&
          new URLSearchParams(location.search).get("tab") !== "team",
        children: [
          { label: "Profile", tab: "profile", keywords: ["business", "contact", "info"] },
          { label: "Notifications", tab: "notifications", keywords: ["alerts", "email"] },
          { label: "Payout Settings", tab: "payouts", keywords: ["bank", "mobile money", "payout", "withdraw"] },
          { label: "Security", tab: "security", keywords: ["password", "login"] },
          { label: "Tax Information", tab: "tax", keywords: ["vat", "tin", "registration"] },
        ],
      },
      {
        label: "Team",
        path: "/stays/settings?tab=team",
        icon: UserPlus,
        iconName: "UserPlus",
        permission: PAGE_ACCESS["/stays/settings"],
        keywords: ["members", "roles", "invite", "staff"],
        match: (location) =>
          location.pathname === "/stays/settings" &&
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
