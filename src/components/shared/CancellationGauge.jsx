export default function CancellationGauge({ value, label, className = "" }) {
  // Configurable gauge geometry
  const CX = 130;
  const CY = 142;
  const R = 92; 

  const clamped = Math.min(Math.max(value, 0), 6);
  const pct = clamped === 0 ? "0" : clamped >= 6 ? "6+" : String(Math.round(clamped));

  // Symmetrical multi-zone tracking logic for the indicator dot
  let finalAngle;
  if (clamped <= 2) {
    finalAngle = 180 - (clamped / 2) * 45;
  } else if (clamped <= 5) {
    finalAngle = 135 - ((clamped - 2) / 3) * 90;
  } else {
    const extra = Math.min(clamped - 5, 1);
    finalAngle = 45 - extra * 45;
  }

  // Helper functions to calculate exact points along the arc radius
  const getX = (angle) => Math.round(CX + R * Math.cos((angle * Math.PI) / 180));
  const getY = (angle) => Math.round(CY - R * Math.sin((angle * Math.PI) / 180));

  // Compute precise track junctions dynamically
  const x180 = getX(180); // Left base (0%)
  const y180 = getY(180);
  const x135 = getX(135); // 2% Junction
  const y135 = getY(135);
  const x45  = getX(45);  // 5% Junction
  const y45  = getY(45);
  const x0   = getX(0);   // Right base (5+%)
  const y0   = getY(0);

  // Indicator dot coordinates and color
  const nx = getX(finalAngle);
  const ny = getY(finalAngle);
  const dotColor = clamped <= 2 ? '#115E59' : clamped <= 5 ? '#0D9488' : '#F43F5E';

  return (
    <svg viewBox="0 0 260 200" className={"w-full " + className} role="img" aria-label={`Cancellation rate: ${pct}%, status: ${label}`}>
      <title>{`Cancellation rate: ${pct}% — ${label}`}</title>
      <style>{`.nd { transition: cx 0.45s ease, cy 0.45s ease; }`}</style>

      {/* Ghost background track */}
      <path 
        d={`M ${x180} ${y180} A ${R} ${R} 0 0 1 ${x0} ${y0}`} 
        fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" 
      />

      {/* Gauge Tracks - Calculated Dynamically */}
      <path 
        d={`M ${x180} ${y180} A ${R} ${R} 0 0 1 ${x135} ${y135}`} 
        fill="none" stroke="#115E59" strokeWidth="10" strokeLinecap="round" 
      />
      <path 
        d={`M ${x135} ${y135} A ${R} ${R} 0 0 1 ${x45} ${y45}`} 
        fill="none" stroke="#CCFBF1" strokeWidth="10" strokeLinecap="round" 
      />
      <path 
        d={`M ${x45} ${y45} A ${R} ${R} 0 0 1 ${x0} ${y0}`} 
        fill="none" stroke="#F43F5E" strokeWidth="10" strokeLinecap="round" 
      />
      
      {/* Indicator Dot */}
      <circle className="nd" cx={nx} cy={ny} r="5" fill={dotColor} stroke="white" strokeWidth="2" />
      
      {/* Central Value & Status Label */}
      <text x="130" y="118" textAnchor="middle" fontSize="44" fontWeight="700" fill="#1e293b" fontFamily="DM Sans, sans-serif">
        {pct}%
      </text>
      <text x="130" y="142" textAnchor="middle" fontSize="15" fontWeight="600" fill="#475569" fontFamily="DM Sans, sans-serif">
        {label}
      </text>
      
      {/* Perimeter Indicator Labels aligned to junctions */}
      <text x={x180} y={y180 + 18} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B" fontFamily="DM Sans, sans-serif">0%</text>
      <text x={x135 + 6} y={y135 + 16} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B" fontFamily="DM Sans, sans-serif">2%</text>
      <text x={x45 - 6} y={y45 + 16} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B" fontFamily="DM Sans, sans-serif">5%</text>
      <text x={x0} y={y0 + 18} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748B" fontFamily="DM Sans, sans-serif">5+%</text>
    </svg>
  );
}