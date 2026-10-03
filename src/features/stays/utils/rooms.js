/**
 * Room helpers shared by the builder step, the standalone Rooms page and the
 * rate-plan defaults.
 */

/**
 * Total sleeping capacity of a room. The editor now stores the headcount in
 * `adults` with `children: 0`, but legacy rooms may still carry a split, so the
 * two fields are summed for display and defaults.
 */
export function roomPeople(room) {
  return (Number(room?.adults) || 0) + (Number(room?.children) || 0);
}

/** "1 person" / "3 people" — for the room cards and rows. */
export function peopleLabel(room) {
  const people = roomPeople(room);
  return `${people} ${people === 1 ? "person" : "people"}`;
}
