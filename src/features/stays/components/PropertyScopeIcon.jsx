/**
 * Filled duotone icons for the "how many are you listing?" step — one home
 * and a cluster of homes, drawn in the same two-tone recipe as
 * PropertyGroupIcon: primary surfaces in `currentColor`, secondary volumes at
 * 28–45% opacity, and white cut-outs for doors and glazing.
 */

const GLYPHS = {
  single: (
    <>
      <path d="M32 5 59 23H5L32 5Z" />
      <rect x="13" y="23" width="38" height="36" rx="2" opacity="0.28" />
      <rect x="21" y="30" width="22" height="7" rx="1.5" />
      <rect x="27" y="46" width="10" height="13" rx="1.5" fill="#fff" />
    </>
  ),
  multiple: (
    <>
      {/* back-left building */}
      <path d="M14 16 26 25H2L14 16Z" opacity="0.45" />
      <rect x="4" y="25" width="20" height="33" rx="2" opacity="0.28" />
      <rect x="9" y="31" width="5" height="5" rx="1" opacity="0.5" />
      <rect x="17" y="31" width="5" height="5" rx="1" opacity="0.5" />
      {/* back-right building */}
      <path d="M50 14 62 23H38L50 14Z" opacity="0.45" />
      <rect x="40" y="23" width="20" height="35" rx="2" opacity="0.28" />
      <rect x="45" y="29" width="5" height="5" rx="1" opacity="0.5" />
      <rect x="53" y="29" width="5" height="5" rx="1" opacity="0.5" />
      {/* front building */}
      <path d="M31 18 45 28H17L31 18Z" />
      <rect x="20" y="28" width="22" height="30" rx="2" />
      <rect x="24" y="33" width="6" height="6" rx="1" fill="#fff" opacity="0.9" />
      <rect x="32" y="33" width="6" height="6" rx="1" fill="#fff" opacity="0.9" />
      <rect x="27" y="44" width="8" height="14" rx="1.5" fill="#fff" />
    </>
  ),
  pin: (
    <>
      <path d="M32 6c-8.3 0-15 6.6-15 14.7C17 31.7 32 56 32 56s15-24.3 15-35.3C47 12.6 40.3 6 32 6Z" />
      <circle cx="32" cy="21" r="5.6" fill="#fff" />
      <ellipse cx="32" cy="59.5" rx="9" ry="2.5" opacity="0.2" />
    </>
  ),
  pins: (
    <>
      {/* outer pins, faded */}
      <path d="M17 15c-5 0-9.1 3.9-9.1 8.8C7.9 30 17 43 17 43s9.1-13 9.1-19.2C26.1 18.9 22 15 17 15Z" opacity="0.35" />
      <circle cx="17" cy="23.5" r="3.2" fill="#fff" opacity="0.75" />
      <path d="M47 15c-5 0-9.1 3.9-9.1 8.8C37.9 30 47 43 47 43s9.1-13 9.1-19.2C56.1 18.9 52 15 47 15Z" opacity="0.35" />
      <circle cx="47" cy="23.5" r="3.2" fill="#fff" opacity="0.75" />
      {/* front pin */}
      <path d="M32 8c-6.4 0-11.6 5-11.6 11.3C20.4 27.6 32 46 32 46s11.6-18.4 11.6-26.7C43.6 13 38.4 8 32 8Z" />
      <circle cx="32" cy="19.5" r="4.5" fill="#fff" />
      <ellipse cx="32" cy="49.5" rx="8" ry="2.2" opacity="0.2" />
    </>
  ),
  entirePlace: (
    <>
      <path d="M32 8 58 26H6L32 8Z" />
      <rect x="14" y="26" width="36" height="30" rx="2" />
      <rect x="27" y="41" width="10" height="15" rx="1.5" fill="#fff" />
    </>
  ),
  privateRoom: (
    <>
      <path d="M32 8 58 26H6L32 8Z" />
      <rect x="14" y="26" width="36" height="30" rx="2" opacity="0.28" />
      <rect x="18.5" y="38" width="9" height="18" rx="1.5" />
    </>
  ),
};

export default function PropertyScopeIcon({ variant = "single", size = 64, className = "" }) {
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
      {GLYPHS[variant] || GLYPHS.single}
    </svg>
  );
}
