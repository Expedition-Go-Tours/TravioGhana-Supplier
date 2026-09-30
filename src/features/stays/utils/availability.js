/**
 * Availability cell resolution for the Stays calendar.
 *
 * A cell is a room × date pair. The override (if any) wins over the room's
 * defaults; dates before today are Past and never editable.
 *
 * Status rules:
 *   Past      date before today
 *   Blocked   a closed override on that room/date
 *   Full      no rooms left
 *   Limited   one room left
 *   Available anything more
 */
export function cellStateFor(room, date, overrides, todayIso) {
  const override = overrides[`${room?.id}|${date}`] || {};
  if (date < todayIso) return { key: "Past", override, available: 0 };
  const available = override.count ?? room?.count ?? 0;
  if (override.closed) return { key: "Blocked", override, available };
  if (available <= 0) return { key: "Full", override, available };
  if (available <= 1) return { key: "Limited", override, available };
  return { key: "Available", override, available };
}
