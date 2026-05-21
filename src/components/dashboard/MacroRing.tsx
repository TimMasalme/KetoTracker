interface MacroRingProps {
  label: string
  current: number
  target: number
  unit: string
  color: string
  invertColor?: boolean  // true for carbs: low=green, high=red
}

export default function MacroRing({ label, current, target, unit, color, invertColor }: MacroRingProps) {
  const pct = Math.round((current / target) * 100)
  const over = current > target

  // For the ring visual: cap at 100% fill, but show actual % in text
  const ringFill = Math.min(100, pct)

  // Color logic:
  // invertColor (carbs): low=green, high=red
  // normal: over 100% = red, else use brand color
  let strokeColor: string
  if (invertColor) {
    if (pct <= 50) strokeColor = '#3d6b4f'       // dark green
    else if (pct <= 80) strokeColor = '#c49a2a'  // yellow/gold
    else if (pct <= 100) strokeColor = '#e07b39' // orange
    else strokeColor = '#b03a2e'                  // red
  } else {
    strokeColor = over ? '#b03a2e' : color
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Ring SVG */}
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0e9d8" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={`${ringFill} ${100 - ringFill}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium font-mono text-charcoal-900">
          {pct}%
        </span>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-charcoal-900">
          {current}<span className="font-normal text-cream-400">/{target}{unit}</span>
        </div>
        <div className="text-[10px] text-cream-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}
