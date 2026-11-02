/** Clean product style illustration of the counter kit, drawn in brand tones. No photos, nothing borrowed. */
export function KitIllustration({ className = "" }: { className?: string }) {
  const ink = "#1A1A17", shell = "#2B2B27", shade = "#3D3D38", light = "#F3EFDD", screen = "#FDFBEF", accent = "#5C5319", gold = "#C2B34A";
  return (
    <svg viewBox="0 0 760 360" className={className} role="img" aria-label="Square Register with cash drawer, receipt printer, barcode scanner and Brother label printer">
      <ellipse cx="380" cy="330" rx="340" ry="14" fill="#E6E2CF" />
      {/* cash drawer */}
      <rect x="250" y="236" width="260" height="70" rx="6" fill={shell} />
      <rect x="250" y="236" width="260" height="10" rx="4" fill={shade} />
      <rect x="276" y="268" width="208" height="8" rx="4" fill={shade} />
      <circle cx="380" cy="272" r="7" fill={light} />
      {/* register, seller screen */}
      <rect x="320" y="120" width="120" height="112" rx="6" fill={shade} />
      <rect x="300" y="96" width="160" height="116" rx="10" fill={shell} />
      <rect x="310" y="106" width="140" height="96" rx="6" fill={screen} />
      <rect x="320" y="118" width="60" height="8" rx="2" fill={accent} />
      <rect x="320" y="134" width="120" height="6" rx="2" fill="#D6D1BC" />
      <rect x="320" y="148" width="120" height="6" rx="2" fill="#D6D1BC" />
      <rect x="320" y="162" width="80" height="6" rx="2" fill="#D6D1BC" />
      <rect x="320" y="180" width="120" height="14" rx="7" fill={accent} />
      <text x="380" y="190.5" fontSize="9" fontWeight="700" textAnchor="middle" fill={screen} fontFamily="Montserrat, Helvetica, sans-serif">Charge £145</text>
      {/* customer display */}
      <rect x="356" y="160" width="88" height="70" rx="8" fill={shell} />
      <rect x="362" y="166" width="76" height="58" rx="5" fill={screen} />
      <text x="400" y="190" fontSize="12" fontWeight="700" textAnchor="middle" fill={ink} fontFamily="Montserrat, Helvetica, sans-serif">£145.00</text>
      <rect x="376" y="200" width="48" height="12" rx="6" fill={gold} />
      <text x="400" y="209" fontSize="7" fontWeight="700" textAnchor="middle" fill={ink} fontFamily="Helvetica, sans-serif">Tap to pay</text>
      {/* receipt printer */}
      <rect x="120" y="226" width="96" height="80" rx="8" fill={shell} />
      <rect x="132" y="236" width="72" height="10" rx="3" fill={shade} />
      <rect x="144" y="196" width="48" height="44" rx="2" fill={screen} />
      <rect x="152" y="206" width="32" height="3" fill="#D6D1BC" /><rect x="152" y="214" width="32" height="3" fill="#D6D1BC" /><rect x="152" y="222" width="20" height="3" fill="#D6D1BC" />
      {/* label printer */}
      <rect x="540" y="238" width="104" height="68" rx="8" fill={shell} />
      <rect x="552" y="228" width="80" height="18" rx="6" fill={shade} />
      <rect x="560" y="258" width="64" height="36" rx="2" fill={screen} />
      <rect x="566" y="266" width="30" height="8" fill={ink} />
      <text x="618" y="274" fontSize="8" fontWeight="800" textAnchor="end" fill={ink} fontFamily="Montserrat, Helvetica, sans-serif">B14</text>
      <text x="566" y="286" fontSize="6" fill={ink} fontFamily="Courier, monospace">B14 0372</text>
      {/* scanner */}
      <path d="M672 300 l16 -60 a8 8 0 0 1 16 2 l-10 58 z" fill={shell} />
      <rect x="676" y="222" width="38" height="26" rx="8" fill={shade} />
      <rect x="708" y="230" width="10" height="10" rx="2" fill="#C44A3B" />
      <path d="M640 236 L700 236" stroke="#C44A3B" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* included badge */}
      <g transform="translate(40 40)">
        <rect x="0" y="0" width="150" height="46" rx="23" fill={accent} />
        <text x="75" y="20" fontSize="10" fontWeight="700" textAnchor="middle" fill={light} fontFamily="Helvetica, sans-serif" letterSpacing="1.5">INCLUDED</text>
        <text x="75" y="36" fontSize="11" fontWeight="600" textAnchor="middle" fill={light} fontFamily="Helvetica, sans-serif">with your subscription</text>
      </g>
    </svg>
  );
}
