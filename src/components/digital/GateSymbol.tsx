/** Símbolos ANSI/IEEE das portas lógicas em SVG (largura ≈ 60, altura 40). */
import type { GateName } from '../../engine/logic/gates'

const ON = '#38bdf8'
const OFF = '#475569'

export function GateSymbol({ type, x, y, active, scale = 1, label = true }: { type: GateName; x: number; y: number; active: boolean; scale?: number; label?: boolean }) {
  const stroke = active ? ON : OFF
  const fill = active ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.85)'
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {type === 'AND' && <path d="M0 0 H24 A20 20 0 0 1 24 40 H0 Z" fill={fill} stroke={stroke} strokeWidth={2} />}
      {(type === 'OR' || type === 'XOR') && (
        <path d="M2 0 Q16 20 2 40 Q34 40 50 20 Q34 0 2 0 Z" fill={fill} stroke={stroke} strokeWidth={2} />
      )}
      {type === 'XOR' && <path d="M-5 0 Q9 20 -5 40" fill="none" stroke={stroke} strokeWidth={2} />}
      {type === 'NOT' && (
        <>
          <path d="M0 4 L34 20 L0 36 Z" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx={39} cy={20} r={4.5} fill={fill} stroke={stroke} strokeWidth={2} />
        </>
      )}
      {label && (
        <text x={type === 'NOT' ? 13 : 20} y={24} fontSize={9} fontWeight={700} textAnchor="middle" fill={active ? '#e0f2fe' : '#94a3b8'} fontFamily="ui-monospace, monospace">
          {type}
        </text>
      )}
    </g>
  )
}

/** Fio com cor de acordo com o nível lógico (1 = azul animado). */
export function Wire({ d, on, dashed }: { d: string; on: boolean; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={on ? ON : OFF}
      strokeWidth={on ? 2.6 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed && !on ? '5 4' : undefined}
      className={on ? 'wire-active' : undefined}
    />
  )
}
