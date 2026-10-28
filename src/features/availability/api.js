import api from "@/lib/axios";

export function mapCalendarDay(day) {
  const rawStatus = (day.status || "available").toLowerCase();
  const overrideCapacity = day.overrideCapacity ?? null;
  const baseCapacity = day.baseCapacity ?? day.capacity;

  // A day override with a capacity BELOW the tour default limits the day.
  // The backend only labels such days AVAILABLE — derive the Limited badge here
  // so the calendar shows amber "Limited" exactly like the Blocked treatment.
  let status = rawStatus;
  if (
    overrideCapacity != null &&
    baseCapacity != null &&
    overrideCapacity < baseCapacity &&
    (rawStatus === "available" || rawStatus === "limited")
  ) {
    status = "limited";
  }

  const slots = (day.timeSlots || []).map((s) => ({
    time: s.time,
    capacity: s.capacity,
    booked: s.booked || 0,
    groupsBooked: s.groupsBooked ?? 0,
    groupsRemaining: s.groupsRemaining ?? null,
    cutoffMinutes: s.cutoffMinutes ?? null,
    closed: s.closed === true,
    closesAt: s.closesAt ?? null,
  }));

  // The backend's raw status only reflects capacity/manual overrides. A date
  // whose booking window has closed (or whose every slot is closed) is still
  // "available" there, so derive the online-booking state explicitly. Past,
  // blocked and full days keep their own status precedence.
  const allSlotsClosed = slots.length > 0 && slots.every((slot) => slot.closed);
  const bookingsClosed = (day.closedCutoff === true || allSlotsClosed) &&
    (status === "available" || status === "limited");
  if (bookingsClosed) status = "closed";

  return {
    date: day.date,
    dayOfWeek: day.dayOfWeek,
    isOperatingDay: day.isOperatingDay,
    status,
    capacity: day.capacity,
    baseCapacity,
    overrideCapacity,
    booked: day.booked,
    remaining: day.remaining,
    capacityUnit: day.capacityUnit === "groups" ? "groups" : "people",
    groupsPerSlot: day.groupsPerSlot ?? null,
    maxGroupSize: day.maxGroupSize ?? null,
    cutoffMinutes: day.cutoffMinutes ?? null,
    closedCutoff: day.closedCutoff === true,
    closesAt: day.closesAt ?? null,
    slots,
    hasOverride: day.hasOverride,
    overrideStatus: day.overrideStatus ? day.overrideStatus.toLowerCase() : null,
    // Party-size floor for this date. `minParticipants` is the effective value
    // (always present), the rest let the supplier see where it came from.
    minParticipants: day.minParticipants ?? null,
    minParticipantsSource: day.minParticipantsSource || "TOUR",
    defaultMinParticipants: day.defaultMinParticipants ?? null,
    overrideMinParticipants: day.overrideMinParticipants ?? null,
  };
}

export async function fetchTourAvailability(tourId, startDate, endDate, optionId) {
  const params = { startDate, endDate };
  if (optionId) params.optionId = optionId;
  const response = await api.get(`/tours/${tourId}/availability`, {
    params,
    skipGlobalErrorHandler: true,
  });

  const payload = response.data?.data || {};
  return {
    tour: payload.tour || null,
    startDate: payload.startDate,
    endDate: payload.endDate,
    calendar: (payload.calendar || []).map(mapCalendarDay),
  };
}

export function updateDateAvailability(tourId, date, payload) {
  return api.patch(`/tours/${tourId}/availability/${date}`, payload, {
    skipGlobalErrorHandler: true,
  });
}

export function removeDateOverride(tourId, date) {
  return api.delete(`/tours/${tourId}/availability/${date}`, {
    skipGlobalErrorHandler: true,
  });
}

export function batchUpdateAvailability(tourId, updates) {
  return api.post(`/tours/${tourId}/availability/batch`, { updates }, {
    skipGlobalErrorHandler: true,
  });
}
