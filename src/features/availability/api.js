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
    slots: (day.timeSlots || []).map((s) => ({
      time: s.time,
      capacity: s.capacity,
      booked: s.booked || 0,
      groupsBooked: s.groupsBooked ?? 0,
      groupsRemaining: s.groupsRemaining ?? null,
      cutoffMinutes: s.cutoffMinutes ?? null,
    })),
    hasOverride: day.hasOverride,
    overrideStatus: day.overrideStatus ? day.overrideStatus.toLowerCase() : null,
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
