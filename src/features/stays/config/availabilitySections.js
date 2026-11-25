/**
 * The eight Availability sections — one source for the sidebar submenu, the
 * in-page tab strip and the search palette.
 *
 * They all live on `/stays/availability?section=<id>` so the calendar and its
 * range tools share one route, one property picker and one permission guard.
 * Rate plans is the only child with its own permission: a member with
 * `stays.availability` but not `stays.rates` still gets the other seven.
 */
import {
  Baby,
  CalendarDays,
  Copy,
  DoorOpen,
  Gift,
  LineChart,
  Settings2,
  Users,
} from "@/features/stays/icons";

export const DEFAULT_AVAILABILITY_SECTION = "calendar";

export const AVAILABILITY_SECTIONS = [
  {
    id: "calendar",
    label: "Calendar",
    title: "Calendar",
    description: "See and edit nightly inventory, prices and minimum stays.",
    icon: CalendarDays,
    keywords: ["calendar", "dates", "inventory", "nightly", "price", "blocked"],
  },
  {
    id: "open-close",
    label: "Open/close rooms",
    title: "Open/close rooms",
    description: "Close or reopen a room type across a date range in one action.",
    icon: DoorOpen,
    keywords: ["close", "open", "block", "room", "range", "inventory"],
  },
  {
    id: "copy-rates",
    label: "Copy rates to future dates",
    title: "Copy rates to future dates",
    description: "Copy prices and restrictions from one date range onto a later one.",
    icon: Copy,
    keywords: ["copy", "rates", "future", "price", "bulk", "duplicate"],
  },
  {
    id: "restrictions",
    label: "Dynamic restriction rules",
    title: "Dynamic restriction rules",
    description: "Apply minimum stays, stop-sells and arrival/departure rules by date and room.",
    icon: Settings2,
    keywords: ["restriction", "rule", "minimum stay", "maximum stay", "stop sell", "arrival", "departure"],
  },
  {
    id: "rate-plans",
    label: "Rate plans",
    title: "Rate plans",
    description: "Create and edit the bookable rates for each room type.",
    icon: LineChart,
    permission: "stays.rates",
    keywords: ["rate plan", "pricing", "nightly", "cancellation", "meal"],
  },
  {
    id: "value-adds",
    label: "Value adds",
    title: "Value adds",
    description: "Sell optional extras such as breakfast, pickup or late checkout.",
    icon: Gift,
    keywords: ["value add", "extra", "breakfast", "pickup", "upsell", "add-on"],
  },
  {
    id: "guest-pricing",
    label: "Pricing per guest",
    title: "Pricing per guest",
    description: "Set how many guests the base rate covers and what each extra adult costs.",
    icon: Users,
    keywords: ["guest", "adult", "occupancy", "extra adult", "single guest", "pricing"],
  },
  {
    id: "child-rates",
    label: "Child rates",
    title: "Child rates",
    description: "Set the nightly supplement charged for each extra child.",
    icon: Baby,
    keywords: ["child", "children", "kid", "family", "extra child", "pricing"],
  },
];

export function availabilitySection(id) {
  return (
    AVAILABILITY_SECTIONS.find((section) => section.id === id) ||
    AVAILABILITY_SECTIONS[0]
  );
}

export function isAvailabilitySection(id) {
  return AVAILABILITY_SECTIONS.some((section) => section.id === id);
}
