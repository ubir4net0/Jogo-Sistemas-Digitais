/**
 * Display de 7 segmentos desenhado em SVG. Os segmentos acesos vêm do
 * decodificador combinacional (portas lógicas) — `decodeSevenSegment`.
 */
import { decodeSevenSegment, SEGMENT_NAMES, type SegmentName } from '../../engine/logic/sevenSegment'
import type { Bits4 } from '../../engine/logic/counter'

const hseg = (x1: number, x2: number, y: number) =>
  `${x1 + 4},${y - 4} ${x2 - 4},${y - 4} ${x2},${y} ${x2 - 4},${y + 4} ${x1 + 4},${y + 4} ${x1},${y}`
const vseg = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + 4},${y1 + 4} ${x + 4},${y2 - 4} ${x},${y2} ${x - 4},${y2 - 4} ${x - 4},${y1 + 4}`

const POINTS: Record<SegmentName, string> = {
  a: hseg(11, 53, 8),
  b: vseg(56, 11, 50),
  c: vseg(56, 54, 93),
  d: hseg(11, 53, 96),
  e: vseg(8, 54, 93),
  f: vseg(8, 11, 50),
  g: hseg(11, 53, 52),
}

const LABEL_POS: Record<SegmentName, [number, number]> = {
  a: [32, 22],
  b: [46, 31],
  c: [46, 75],
  d: [32, 86],
  e: [18, 75],
  f: [18, 31],
  g: [32, 64],
}

export function SevenSegment({
  bits,
  size = 72,
  color = '#ef4444',
  showLabels = false,
  className,
}: {
  bits: Bits4
  size?: number
  color?: string
  showLabels?: boolean
  className?: string
}) {
  const seg = decodeSevenSegment(bits)
  return (
    <svg viewBox="0 0 64 104" width={size * 0.62} height={size} className={className} role="img" aria-label="Display de sete segmentos">
      <rect x="0" y="0" width="64" height="104" rx="6" fill="#07090d" />
      <g transform="skewX(-5) translate(4 0)">
        {SEGMENT_NAMES.map((name) => (
          <polygon
            key={name}
            points={POINTS[name]}
            fill={seg[name] ? color : '#1a1f27'}
            style={{
              filter: seg[name] ? `drop-shadow(0 0 3px ${color})` : undefined,
              transition: 'fill 150ms ease',
            }}
          />
        ))}
        {showLabels &&
          SEGMENT_NAMES.map((name) => (
            <text key={name} x={LABEL_POS[name][0]} y={LABEL_POS[name][1]} fontSize="8" textAnchor="middle" fill={seg[name] ? '#fff' : '#64748b'} fontFamily="monospace" fontWeight="700">
              {name}
            </text>
          ))}
      </g>
    </svg>
  )
}
