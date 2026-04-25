// Reusable SVG circular gauge
export function CircularGauge({ value = 0, max = 1, color = '#38bdf8', size = 100, strokeWidth = 8, label }) {
  const r = (size / 2) - strokeWidth - 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const text = max === 1 ? `${Math.round(pct * 100)}%` : value?.toFixed(1);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`gauge-glow-${color.replace('#','')}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#e2e8f0"
        fontFamily="Outfit,sans-serif" fontSize={size * 0.15} fontWeight="800">
        {text}
      </text>
      {label && (
        <text x={cx} y={cy + size * 0.2} textAnchor="middle" fill="#475569"
          fontFamily="Inter,sans-serif" fontSize={size * 0.1}>
          {label}
        </text>
      )}
    </svg>
  );
}

// Large main gauge (180px)
export function MainGauge({ score, color }) {
  const r = 75, cx = 90, cy = 90, sw = 14;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, score / 100);

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <defs>
        <filter id="main-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cy})`}
        filter="url(#main-glow)"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}
