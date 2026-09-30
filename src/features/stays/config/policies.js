/**
 * Policy vocabulary for the Stays workspace — the six sections, their editor
 * fields and the display lines the detail tabs render. Lifted from the
 * prototype's `policyFields`, `policySection` and Overview panels so the
 * editor, the overview and the detail views all speak the same language.
 *
 * Values fall back to the same defaults the prototype displays when a field
 * has never been set ("Not allowed", "No smoking", …).
 */

export const POLICY_SECTIONS = [
  "Overview",
  "Arrival & departure",
  "House rules",
  "Families & extras",
  "Cancellation & charges",
  "Safety & access",
];

export const POLICY_FIELDS = {
  "Arrival & departure": [
    { key: "checkin", label: "Check-in from", type: "time" },
    { key: "checkinEnd", label: "Check-in until", type: "time" },
    { key: "checkout", label: "Checkout by", type: "time" },
    { key: "earlyCheckin", label: "Early check-in", type: "select", options: ["On request", "Available", "Not available"], fallback: "On request" },
    { key: "lateCheckout", label: "Late checkout", type: "select", options: ["On request", "Available", "Not available"], fallback: "On request" },
    { key: "minAge", label: "Minimum check-in age", type: "number" },
    { key: "idRequirement", label: "Guest identification", type: "select", options: ["Valid photo ID at check-in", "Booking confirmation and photo ID", "No ID requested"], fallback: "Valid photo ID at check-in" },
    { key: "arrivalInstructions", label: "Arrival instructions", type: "textarea", wide: true },
  ],
  "House rules": [
    { key: "smoking", label: "Smoking", type: "select", options: ["No smoking", "Designated areas", "Allowed"], fallback: "No smoking" },
    { key: "pets", label: "Pets", type: "select", options: ["Not allowed", "Allowed", "On request"], fallback: "Not allowed" },
    { key: "petFee", label: "Pet fee per stay (GHS)", type: "number" },
    { key: "parties", label: "Parties and events", type: "select", options: ["Not allowed", "Allowed", "On request"], fallback: "Not allowed" },
    { key: "quietFrom", label: "Quiet hours from", type: "time" },
    { key: "quietTo", label: "Quiet hours until", type: "time" },
    { key: "visitors", label: "Visitors", type: "select", options: ["Registered guests only", "Visitors on request", "Visitors allowed"], fallback: "Registered guests only" },
    { key: "houseNotes", label: "Additional house rules", type: "textarea", wide: true },
  ],
  "Families & extras": [
    { key: "children", label: "Children", type: "select", options: ["Welcome", "Adults only"], fallback: "Welcome" },
    { key: "childAdultAge", label: "Age considered adult", type: "number" },
    { key: "cots", label: "Cots", type: "select", options: ["Not available", "Available on request", "Available"], fallback: "Not available" },
    { key: "extraBeds", label: "Extra beds", type: "select", options: ["Not available", "Available on request", "Available"], fallback: "Not available" },
    { key: "extraBedFee", label: "Extra bed per night (GHS)", type: "number" },
    { key: "accessibleRooms", label: "Accessible rooms", type: "select", options: ["Contact property to confirm", "Available", "Not available"], fallback: "Contact property to confirm" },
    { key: "familyNotes", label: "Family notes", type: "textarea", wide: true },
  ],
  "Cancellation & charges": [
    { key: "damageDeposit", label: "Damage deposit (GHS)", type: "number" },
    { key: "depositMethod", label: "Deposit handling", type: "select", options: ["Handled on arrival", "Held by property", "Not applicable"], fallback: "Handled on arrival" },
    { key: "cleaningFee", label: "Cleaning fee (GHS)", type: "number" },
    { key: "localTax", label: "Local taxes", type: "select", options: ["Included in displayed rate", "Payable at property", "Not applicable"], fallback: "Included in displayed rate" },
    { key: "chargeNotes", label: "Additional charge notes", type: "textarea", wide: true },
  ],
  "Safety & access": [
    { key: "accessibility", label: "Accessibility", type: "select", options: ["Contact property to confirm", "Step-free access available", "Limited accessibility"], fallback: "Contact property to confirm" },
    { key: "parkingPolicy", label: "Parking", type: "select", options: ["See property facilities", "Free on-site parking", "Paid parking nearby", "No parking"], fallback: "See property facilities" },
    { key: "securityPolicy", label: "Security", type: "select", options: ["On-site staff", "24-hour security", "Self check-in"], fallback: "On-site staff" },
    { key: "emergencyContact", label: "Emergency contact information", type: "text" },
    { key: "safetyNotes", label: "Safety and access notes", type: "textarea", wide: true },
  ],
};

/** `policyValue(property, key, fallback)` — never render blank lines. */
export function policyValue(property, key, fallback = "Not set") {
  const value = property?.[key];
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

/**
 * The lines a detail tab renders per section — labels and computed values
 * from the prototype's per-tab lists.
 */
export function policyLines(section, property, plans = []) {
  const money = (value) => `GHS ${Number(value || 0).toLocaleString()}`;
  switch (section) {
    case "Arrival & departure":
      return [
        ["Check-in begins", policyValue(property, "checkin", "Not set")],
        ["Check-in ends", policyValue(property, "checkinEnd", "No cutoff set")],
        ["Checkout by", policyValue(property, "checkout", "Not set")],
        ["Early check-in", policyValue(property, "earlyCheckin", "On request")],
        ["Late checkout", policyValue(property, "lateCheckout", "On request")],
        ["Minimum check-in age", property.minAge ? `${property.minAge} years` : "Not set"],
        ["Guest identification", policyValue(property, "idRequirement", "Valid photo ID at check-in")],
      ];
    case "House rules": {
      const lines = [
        ["Smoking", policyValue(property, "smoking", "No smoking")],
        ["Pets", policyValue(property, "pets", "Not allowed")],
      ];
      if (property.pets === "Allowed") {
        lines.push(["Pet fee", property.petFee ? `${money(property.petFee)} per stay` : "No fee specified"]);
      }
      lines.push(
        ["Parties or events", policyValue(property, "parties", "Not allowed")],
        ["Quiet hours", property.quietFrom && property.quietTo ? `${property.quietFrom} – ${property.quietTo}` : "Not set"],
        ["Visitors", policyValue(property, "visitors", "Registered guests only")],
      );
      return lines;
    }
    case "Families & extras":
      return [
        ["Children", policyValue(property, "children", "Welcome")],
        ["Child age considered adult", property.childAdultAge ? `${property.childAdultAge} years` : "Not set"],
        ["Cots", policyValue(property, "cots", "Not available")],
        ["Extra beds", policyValue(property, "extraBeds", "Not available")],
        ["Extra bed charge", property.extraBedFee ? `${money(property.extraBedFee)} per night` : "No fee specified"],
        ["Accessible rooms", policyValue(property, "accessibleRooms", "Contact property to confirm")],
      ];
    case "Safety & access":
      return [
        ["Accessibility", policyValue(property, "accessibility", "Contact property to confirm")],
        ["Parking", policyValue(property, "parkingPolicy", "See property facilities")],
        ["Security", policyValue(property, "securityPolicy", "On-site staff")],
        ["Emergency contact", policyValue(property, "emergencyContact", "Provided at check-in")],
      ];
    case "Cancellation & charges":
      return [
        ["Damage deposit", property.damageDeposit ? `${money(property.damageDeposit)} · ${policyValue(property, "depositMethod", "handled on arrival")}` : "None specified"],
        ["Cleaning fee", property.cleaningFee ? money(property.cleaningFee) : "None specified"],
        ["Local taxes", policyValue(property, "localTax", "Included in displayed rate")],
        ["Rate plans", `${plans.length} with own cancellation terms`],
      ];
    default:
      return [];
  }
}

/** The free-text note attached to a section, when one was written. */
export function policyNote(section, property) {
  const notes = {
    "Arrival & departure": ["Arrival instructions", property?.arrivalInstructions],
    "House rules": ["Additional house rules", property?.houseNotes],
    "Families & extras": ["Family notes", property?.familyNotes],
    "Cancellation & charges": ["Additional charges", property?.chargeNotes],
    "Safety & access": ["Safety and access notes", property?.safetyNotes],
  };
  const [label, text] = notes[section] || [];
  return text ? { label, text } : null;
}
