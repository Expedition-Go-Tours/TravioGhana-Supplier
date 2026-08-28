import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function safeId() {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

const DATE_FORMAT_OPTIONS = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const DATE_TIME_FORMAT_OPTIONS = {
  ...DATE_FORMAT_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleDateString("en-GB", DATE_FORMAT_OPTIONS);
}

export function formatTime(timeString) {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeString;
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleString("en-GB", DATE_TIME_FORMAT_OPTIONS);
}
