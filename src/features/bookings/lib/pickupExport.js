import { pickupDisplay } from "./pickupHelpers";

/**
 * Pure manifest builders, kept out of the menu component so the escaping rules
 * are testable. Every customer-controlled value is escaped for HTML and
 * guarded against spreadsheet formula injection.
 */

function tripDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB");
}

export function escapeCsv(value) {
  let s = String(value ?? "");
  // Excel/Sheets execute cells beginning with = + - @ (or a tab/CR) as a
  // formula, including values that arrive from a customer's pickup address.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function manifestRow(booking) {
  const pickup = booking.pickup || {};
  const display = pickupDisplay(pickup);
  return {
    date: tripDate(booking.travelDate),
    tourTime: booking.selectedTime || "",
    tour: booking.tourName || "",
    bookingNumber: booking.bookingNumber || "",
    customer: booking.customerName || "",
    phone: booking.customerPhone || "",
    travelers: booking.travelers ?? "",
    address: display.primary || "",
    zone: display.zone && display.zone !== display.primary ? display.zone : "",
    landmark: display.secondary || "",
    pickupTime: pickup.time || "",
    instructions: pickup.instructions || "",
    specialRequests: booking.specialRequests || "",
    status: booking.status || "",
  };
}

const CSV_HEADERS = [
  "Date",
  "Tour Time",
  "Tour",
  "Booking #",
  "Customer",
  "Phone",
  "Travelers",
  "Pickup Address",
  "Zone",
  "Landmark",
  "Pickup Time",
  "Instructions",
  "Special Requests",
  "Status",
];

export function generateCsv(bookings) {
  const rows = (bookings || []).map((booking) => {
    const row = manifestRow(booking);
    return [
      row.date,
      row.tourTime,
      row.tour,
      row.bookingNumber,
      row.customer,
      row.phone,
      row.travelers,
      row.address,
      row.zone,
      row.landmark,
      row.pickupTime,
      row.instructions,
      row.specialRequests,
      row.status,
    ];
  });
  return [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

export function generatePrintHtml(bookings, dateRange, { truncated = false } = {}) {
  const rows = (bookings || []).map((booking) => {
    const row = manifestRow(booking);
    return `<tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.pickupTime || "—")}</td>
        <td><strong>${escapeHtml(row.tour)}</strong></td>
        <td>${escapeHtml(row.bookingNumber)}</td>
        <td>${escapeHtml(row.customer)}</td>
        <td>${escapeHtml(row.phone || "—")}</td>
        <td>${escapeHtml(row.travelers)}</td>
        <td>${escapeHtml(row.address || "—")}${row.zone ? `<br><span class="muted">Zone: ${escapeHtml(row.zone)}</span>` : ""}${row.landmark ? `<br><span class="muted">${escapeHtml(row.landmark)}</span>` : ""}</td>
        <td>${escapeHtml(row.instructions || "—")}${row.specialRequests ? `<br><span class="muted">Special: ${escapeHtml(row.specialRequests)}</span>` : ""}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Pickup Manifest ${escapeHtml(dateRange)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1e293b; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .warning { font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 6px 8px; margin-bottom: 12px; }
  .muted { color: #64748b; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: #f8fafc; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Pickup Manifest</h1>
<p class="subtitle">${escapeHtml(dateRange)} &middot; ${(bookings || []).length} bookings</p>
${truncated ? '<p class="warning">This range is larger than the export cap; the manifest contains the first page of results.</p>' : ""}
<table>
<thead><tr>
  <th>Date</th><th>Pickup Time</th><th>Tour</th><th>Booking #</th>
  <th>Customer</th><th>Phone</th><th>Travelers</th>
  <th>Pickup Address</th><th>Instructions / Requests</th><th>Status</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body></html>`;
}
