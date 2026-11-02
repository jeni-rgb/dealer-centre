/** The Dealer Centre mark: a D with pixels drifting off its spine. Olive on cream by default. */
export function Mark({ size = 28, color = "#5C5319", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d="M46 10 H52 A40 40 0 0 1 52 90 H46 V72 A22 22 0 0 0 46 28 Z" fill={color} />
      <rect x="22" y="36" width="24" height="28" fill={color} />
      <rect x="22" y="10" width="12" height="12" fill={color} />
      <rect x="8" y="24" width="12" height="12" fill={color} />
      <rect x="22" y="78" width="12" height="12" fill={color} />
      <rect x="8" y="64" width="12" height="12" fill={color} />
    </svg>
  );
}

export function Logo({ size = 28, color = "#5C5319", text = "#1A1A17", className = "" }: { size?: number; color?: string; text?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} color={color} />
      <span className="wordmark" style={{ color: text, fontSize: size * 0.5 }}>Dealer<br />Centre</span>
    </span>
  );
}
