/**
 * Monochrome line icons for the Stays property types — one unique glyph per
 * type, drawn in the same visual language as the Experience product builder's
 * product-type icons (`features/products/steps/Step02Category.jsx`): a 40×40
 * circle frame around a simple line drawing.
 *
 * The stroke is `currentColor`, so the type chooser can tint an icon without
 * duplicating the SVG — slate-400 when unselected, emerald-600 when selected.
 * These are original drawings, not third-party icon assets.
 */

const PROPERTY_TYPE_GLYPHS = {
  Hotel: (
    <>
      <path d="M12.5 29.5V15.5h15v14" />
      <path d="M11.5 15.5h17" />
      <path d="M17.5 29.5v-5h5v5" />
      <rect x="15" y="19" width="3" height="3.5" rx="0.5" />
      <rect x="22" y="19" width="3" height="3.5" rx="0.5" />
      <path d="M20 8.2l.9 1.85 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </>
  ),
  Apartment: (
    <>
      <path d="M14.5 29.5V12h11v17.5" />
      <path d="M13.5 12h13" />
      <rect x="16.5" y="14" width="2.5" height="2.4" rx="0.4" />
      <rect x="21" y="14" width="2.5" height="2.4" rx="0.4" />
      <rect x="16.5" y="18" width="2.5" height="2.4" rx="0.4" />
      <rect x="21" y="18" width="2.5" height="2.4" rx="0.4" />
      <rect x="16.5" y="22" width="2.5" height="2.4" rx="0.4" />
      <rect x="21" y="22" width="2.5" height="2.4" rx="0.4" />
      <path d="M18.7 29.5v-3.2h2.6v3.2" />
    </>
  ),
  Guesthouse: (
    <>
      <path d="M12.5 18.5L20 12.5l7.5 6" />
      <path d="M14.5 17.5v12h11v-12" />
      <path d="M18.5 29.5v-4.5h3v4.5" />
      <circle cx="23.5" cy="21.2" r="1.8" />
      <path d="M23.5 19.4v-1.9" />
    </>
  ),
  Resort: (
    <>
      <circle cx="27" cy="11" r="2.6" />
      <path d="M16.5 29c.2-4.6 1.4-8.7 2.9-11.6" />
      <path d="M19.4 17.4c-2.6-1.7-5.2-1.8-7.4-.5" />
      <path d="M19.4 17.4c-.8-2.7-2.8-4.5-5.5-5.1" />
      <path d="M19.4 17.4c1.9-1.5 4.3-1.6 6.4-.4" />
      <path d="M19.4 17.4c.4-2.7 2-4.7 4.6-5.5" />
      <path d="M12.5 29.5h15" />
    </>
  ),
  Hostel: (
    <>
      <path d="M13 12.5v17" />
      <path d="M27 12.5v17" />
      <path d="M13 18h14" />
      <path d="M13 25h14" />
      <rect x="15" y="14.5" width="5" height="3.5" rx="0.8" />
      <rect x="15" y="21.5" width="5" height="3.5" rx="0.8" />
    </>
  ),
  Villa: (
    <>
      <path d="M12 17L20 11l8 6" />
      <path d="M14 16v9h12v-9" />
      <path d="M18.5 25v-4h3v4" />
      <rect x="15.5" y="18.5" width="2.5" height="2.5" rx="0.4" />
      <rect x="22" y="18.5" width="2.5" height="2.5" rx="0.4" />
      <path d="M12.5 28.5c1.3-1.5 2.6-1.5 3.9 0s2.6 1.5 3.9 0 2.6-1.5 3.9 0 2.6 1.5 3.9 0" />
    </>
  ),
  "Holiday home": (
    <>
      <path d="M12.5 18.5L20 12.5l7.5 6" />
      <path d="M14.5 17.5v12h11v-12" />
      <circle cx="17.5" cy="21.5" r="1.7" />
      <path d="M19.2 21.5h4.3" />
      <path d="M22.4 21.5v1.6" />
      <path d="M21.1 21.5v1.2" />
    </>
  ),
  Lodge: (
    <>
      <path d="M12.5 18.5L20 12.5l7.5 6" />
      <path d="M14.5 17.5v12h11v-12" />
      <path d="M18.5 29.5v-4.5h3v4.5" />
      <path d="M14.5 20.5h4" />
      <path d="M21.5 20.5h4" />
      <path d="M14.5 23.5h4" />
      <path d="M21.5 23.5h4" />
    </>
  ),
  "Bed & Breakfast": (
    <>
      <path d="M14 17.5h10.5V22a4.5 4.5 0 01-4.5 4.5h-1.5A4.5 4.5 0 0114 22z" />
      <path d="M24.5 19h2a2.2 2.2 0 010 4.4h-2" />
      <path d="M12.5 27.8h13.5" />
      <path d="M17.5 14.8c0-1.1.9-1.7.9-2.8" />
      <path d="M21.5 14.8c0-1.1.9-1.7.9-2.8" />
    </>
  ),
  Homestay: (
    <>
      <path d="M12.5 18.5L20 12.5l7.5 6" />
      <path d="M14.5 17.5v12h11v-12" />
      <path d="M20 25.8s-3.8-2.3-3.8-4.6c0-1.3 1-2.3 2.3-2.3.8 0 1.2.3 1.5.9.3-.6.7-.9 1.5-.9 1.3 0 2.3 1 2.3 2.3 0 2.3-3.8 4.6-3.8 4.6z" />
    </>
  ),
  "Serviced apartment": (
    <>
      <path d="M12.5 29.5V13h10v16.5" />
      <path d="M11.5 13h12" />
      <rect x="14.5" y="15.5" width="2.2" height="2.2" rx="0.4" />
      <rect x="18.3" y="15.5" width="2.2" height="2.2" rx="0.4" />
      <rect x="14.5" y="19.5" width="2.2" height="2.2" rx="0.4" />
      <rect x="18.3" y="19.5" width="2.2" height="2.2" rx="0.4" />
      <rect x="14.5" y="23.5" width="2.2" height="2.2" rx="0.4" />
      <rect x="18.3" y="23.5" width="2.2" height="2.2" rx="0.4" />
      <path d="M24.5 27.5v-1.5a3.8 3.8 0 017.6 0v1.5z" />
      <circle cx="28.3" cy="21.6" r="0.9" />
    </>
  ),
  Chalet: (
    <>
      <path d="M12 21 20 10l8 11" />
      <path d="M14.5 19.5v10h11v-10" />
      <path d="M11.5 21h17" />
      <path d="M18.5 29.5v-4h3v4" />
    </>
  ),
  "Holiday park": (
    <>
      <rect x="11.5" y="13.5" width="15" height="9.5" rx="2" />
      <path d="M26.5 16.5h2.5v6.5h-2.5" />
      <circle cx="15.5" cy="25.5" r="1.8" />
      <circle cx="23" cy="25.5" r="1.8" />
      <path d="M11.5 29h17" />
    </>
  ),
  Aparthotel: (
    <>
      <rect x="13.5" y="11" width="13" height="19" rx="1" />
      <path d="M11.5 11.5h17" />
      <rect x="16.5" y="14.5" width="2.5" height="2.5" rx="0.4" />
      <rect x="21" y="14.5" width="2.5" height="2.5" rx="0.4" />
      <rect x="16.5" y="19" width="2.5" height="2.5" rx="0.4" />
      <rect x="21" y="19" width="2.5" height="2.5" rx="0.4" />
      <path d="M14.5 26h11" />
      <path d="M18.5 29.5v-3h3v3" />
    </>
  ),
  "Country house": (
    <>
      <path d="M12.5 18.5 19 13l6.5 5.5" />
      <path d="M14.5 17.5v12h9v-12" />
      <path d="M17.5 29.5v-4h3v4" />
      <circle cx="27" cy="17" r="3" />
      <path d="M27 20v9.5" />
    </>
  ),
  "Farm stay": (
    <>
      <path d="M11.5 19 20 13l8.5 6" />
      <path d="M13.5 18v11.5h13V18" />
      <rect x="17" y="23" width="6" height="6.5" rx="0.5" />
      <path d="M17 23l3-2.5 3 2.5" />
      <rect x="24.5" y="14.5" width="3.5" height="15" rx="1.5" />
    </>
  ),
  "Capsule hotel": (
    <>
      <rect x="11.5" y="14.5" width="17" height="11" rx="5.5" />
      <path d="M19 14.5v11" />
      <circle cx="15.5" cy="20" r="2" />
      <path d="M22 17.5h3.5" />
    </>
  ),
  Inn: (
    <>
      <path d="M14 12.5v17" />
      <path d="M14 14.5h5.5" />
      <path d="M19.5 14.5v2.5" />
      <rect x="15.5" y="17" width="10" height="7" rx="1" />
      <path d="M18 20.5h5" />
    </>
  ),
  "Love hotel": (
    <>
      <path d="M20 28.5s-7.5-4.6-7.5-9.4a4.2 4.2 0 0 1 4.2-4.2c1.4 0 2.6.7 3.3 1.9.7-1.2 1.9-1.9 3.3-1.9a4.2 4.2 0 0 1 4.2 4.2c0 4.8-7.5 9.4-7.5 9.4z" />
    </>
  ),
  Motel: (
    <>
      <path d="M11.5 21.5v-1.2l1.7-4a1.6 1.6 0 0 1 1.5-1h7.6a1.6 1.6 0 0 1 1.5 1l1.7 4v1.2" />
      <path d="M11 21.5h18" />
      <circle cx="15.5" cy="24" r="2.2" />
      <circle cx="24.5" cy="24" r="2.2" />
      <path d="M17.7 24h4.6" />
    </>
  ),
  Riad: (
    <>
      <path d="M14 29.5V20a6 6 0 0 1 12 0v9.5" />
      <path d="M11.5 29.5h17" />
      <path d="M18.3 29.5v-4.2a1.7 1.7 0 0 1 3.4 0v4.2" />
      <path d="M16.5 17.5h7" />
    </>
  ),
  Ryokan: (
    <>
      <path d="M12 13.5c2.6-1.3 5.3-2 8-2s5.4.7 8 2" />
      <path d="M13 17h14" />
      <path d="M15.5 17l-.8 12.5" />
      <path d="M24.5 17l.8 12.5" />
      <path d="M20 15.5V17" />
    </>
  ),
  Campsite: (
    <>
      <path d="M11.5 28.5 20 13l8.5 15.5z" />
      <path d="M16.5 28.5 20 22.5l3.5 6" />
      <path d="M9.5 28.5h21" />
    </>
  ),
  Boat: (
    <>
      <path d="M11.5 24.5h17l-2.3 4.5H13.8z" />
      <path d="M20 12.5v12" />
      <path d="M20 14l5.5 8H20z" />
      <path d="M19 16.5 14.5 22H19z" />
    </>
  ),
  "Luxury tent": (
    <>
      <path d="M20 12.5c-4.4 3.9-6.9 8.6-7.5 16h15c-.6-7.4-3.1-12.1-7.5-16z" />
      <path d="M20 12.5v16" />
      <path d="M16.5 28.5 20 22.5l3.5 6" />
    </>
  ),
  Other: (
    <>
      <circle cx="14.8" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="25.2" cy="20" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function PropertyTypeIcon({ type, size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="18" />
      {PROPERTY_TYPE_GLYPHS[type] || PROPERTY_TYPE_GLYPHS.Other}
    </svg>
  );
}
