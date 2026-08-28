// Booking statuses — aligned with backend BookingStatus enum
export const BOOKING_STATUSES = {
  PENDING: {
    label: "Pending",
    color: "warning",
    badgeColor: "#ffc400",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "success",
    badgeColor: "#00d67f",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "danger",
    badgeColor: "#dc3545",
  },
  REFUNDED: {
    label: "Refunded",
    color: "info",
    badgeColor: "#298dff",
  },
  COMPLETED: {
    label: "Completed",
    color: "success",
    badgeColor: "#00d67f",
  },
  NO_SHOW: {
    label: "No Show",
    color: "danger",
    badgeColor: "#dc3545",
  },
};

export const SUPPLIER_BOOKING_STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No Show" },
];

export const REVIEW_STATUSES = {
  PENDING: { label: "Pending", color: "warning" },
  APPROVED: { label: "Approved", color: "success" },
  REJECTED: { label: "Rejected", color: "danger" },
  FLAGGED: { label: "Flagged", color: "danger" },
};

export const PAYOUT_STATUSES = {
  PENDING: { label: "Pending", color: "warning" },
  APPROVED: { label: "Approved", color: "info" },
  PROCESSING: { label: "Processing", color: "info" },
  PAID: { label: "Paid", color: "success" },
  FAILED: { label: "Failed", color: "danger" },
  CANCELLED: { label: "Cancelled", color: "muted" },
};

// Payment Statuses
export const PAYMENT_STATUSES = {
  PAID: { label: "Paid", color: "success" },
  PENDING: { label: "Pending", color: "warning" },
  FAILED: { label: "Failed", color: "danger" },
  REFUNDED: { label: "Refunded", color: "info" },
};

// Tour/Product Statuses
export const PRODUCT_STATUSES = {
  ACTIVE: { label: "Active", color: "success" },
  INACTIVE: { label: "Inactive", color: "muted" },
  DRAFT: { label: "Draft", color: "warning" },
  PENDING_APPROVAL: { label: "Pending Approval", color: "info" },
  REJECTED: { label: "Rejected", color: "danger" },
  FLAGGED: { label: "Flagged", color: "danger" },
};

// User Roles
export const USER_ROLES = {
  ADMIN: { label: "Admin", color: "primary" },
  SUPPLIER: { label: "Supplier", color: "secondary" },
  CUSTOMER: { label: "Customer", color: "info" },
};

// Sort Options for Bookings
export const BOOKING_SORT_OPTIONS = [
  { value: "NEW_BOOKINGS", label: "Newest First" },
  { value: "OLDEST_FIRST", label: "Oldest First" },
  { value: "TRAVEL_DATE_ASC", label: "Travel Date (Nearest)" },
  { value: "TRAVEL_DATE_DESC", label: "Travel Date (Farthest)" },
  { value: "HIGHEST_VALUE", label: "Highest Value" },
  { value: "LOWEST_VALUE", label: "Lowest Value" },
];

// Page Sizes
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Default Page Size
export const DEFAULT_PAGE_SIZE = 25;
