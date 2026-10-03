/**
 * Filled duotone icons for the four category groups on the property-type
 * chooser — echoing the reference's solid silhouette style in the project's
 * emerald palette.
 *
 * Every glyph wears the same two-tone recipe: primary surfaces in
 * `currentColor`, secondary volumes at 28% opacity, and white cut-outs for
 * doors and glazing (the cards are white). Tint the whole icon with a text
 * colour, e.g. `className="text-emerald-600"`.
 */

const GLYPHS = {
  apartment: (
    <>
      <path d="M32 5 59 23H5L32 5Z" />
      <rect x="13" y="23" width="38" height="36" rx="2" opacity="0.28" />
      <rect x="21" y="30" width="22" height="7" rx="1.5" />
      <rect x="27" y="46" width="10" height="13" rx="1.5" fill="#fff" />
    </>
  ),
  homes: (
    <>
      <path d="M32 6 61 30H3L32 6Z" />
      <rect x="12" y="28" width="40" height="30" rx="2" opacity="0.28" />
      <rect x="19" y="36" width="6" height="6" rx="1" />
      <rect x="39" y="36" width="6" height="6" rx="1" />
      <rect x="27" y="42" width="10" height="16" rx="1.5" fill="#fff" />
    </>
  ),
  hotel: (
    <>
      <rect x="9" y="7" width="46" height="8" rx="1.5" />
      <rect x="13" y="15" width="38" height="43" rx="2" opacity="0.28" />
      <rect x="18" y="23" width="8" height="8" rx="1" />
      <rect x="28" y="23" width="8" height="8" rx="1" />
      <rect x="38" y="23" width="8" height="8" rx="1" />
      <rect x="18" y="34" width="8" height="8" rx="1" />
      <rect x="28" y="34" width="8" height="8" rx="1" />
      <rect x="38" y="34" width="8" height="8" rx="1" />
      <rect x="27" y="47" width="10" height="11" rx="1.5" fill="#fff" />
    </>
  ),
  alternative: (
    <>
      <rect x="51" y="31" width="3" height="11" rx="1.5" opacity="0.55" />
      <circle cx="52.5" cy="24" r="6" opacity="0.55" />
      <path d="M31 9 58 55H4L31 9Z" />
      <path d="M31 24 44 55H18L31 24Z" fill="#fff" />
      <path d="M31 35 37 55H25L31 35Z" opacity="0.45" />
    </>
  ),
};

export default function PropertyGroupIcon({ group, size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {GLYPHS[group] || GLYPHS.apartment}
    </svg>
  );
}
