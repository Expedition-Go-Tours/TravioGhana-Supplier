const PATTERN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect width="200" height="200" fill="#f1f3f6"/>
  <g fill="#dce0e6">
    <circle cx="25" cy="30" r="2.5"/>
    <circle cx="100" cy="20" r="2"/>
    <circle cx="175" cy="35" r="2.5"/>
    <circle cx="60" cy="80" r="2"/>
    <circle cx="140" cy="70" r="3"/>
    <circle cx="30" cy="130" r="2"/>
    <circle cx="110" cy="120" r="2.5"/>
    <circle cx="180" cy="140" r="2"/>
    <circle cx="80" cy="180" r="2.5"/>
    <circle cx="160" cy="170" r="2"/>
    <circle cx="50" cy="160" r="1.5"/>
    <circle cx="130" cy="180" r="1.5"/>
    <circle cx="90" cy="40" r="1.5"/>
    <circle cx="170" cy="100" r="1.5"/>
    <circle cx="50" cy="100" r="1.5"/>
  </g>
  <g stroke="#dce0e6" stroke-width="2" stroke-linecap="round" fill="none">
    <path d="M185 65 h12"/>
    <path d="M40 50 h10"/>
    <path d="M120 150 h14"/>
    <path d="M75 120 h10"/>
    <path d="M150 45 h10"/>
    <path d="M25 185 h12"/>
    <path d="M165 185 h10"/>
  </g>
  <g stroke="#dce0e6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M95 95 l6 6 l6 -6"/>
    <path d="M45 145 l5 5 l5 -5"/>
    <path d="M145 130 l6 6 l6 -6"/>
    <path d="M65 40 l5 5 l5 -5"/>
    <path d="M130 85 l5 5 l5 -5"/>
    <path d="M100 170 l6 6 l6 -6"/>
  </g>
</svg>`;

export const CHAT_BG_STYLE = {
  backgroundColor: "#f1f3f6",
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(PATTERN_SVG)}")`,
  backgroundRepeat: "repeat",
  backgroundSize: "200px 200px",
};
