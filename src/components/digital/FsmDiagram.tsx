/**
 * Diagrama de estados (SVG) gerado a partir da tabela de transição da FSM.
 * O estado ativo é destacado e as últimas transições ficam marcadas.
 */
import { useId, useMemo } from 'react'
import { edgesOf, type FsmDefinition } from '../../engine/fsm/fsm'

type Pos = Record<string, [number, number]>
type Route = Record<string, [number, number][]>

const W = 168
const H = 54

export const ENTRY_LAYOUT: { pos: Pos; routes: Route } = {
  pos: {
    IDLE: [100, 70],
    VEHICLE_DETECTED: [290, 70],
    CHECKING_CAPACITY: [480, 70],
    ACCESS_GRANTED: [670, 70],
    GATE_OPENING: [880, 70],
    ACCESS_DENIED: [480, 215],
    GATE_OPEN: [880, 215],
    VEHICLE_PASSING: [880, 360],
    GATE_CLOSING: [670, 360],
    PARKING: [480, 360],
    COMPLETED: [290, 360],
  },
  routes: {
    'COMPLETED>IDLE': [
      [100, 360],
      [100, 70],
    ],
    'ACCESS_DENIED>IDLE': [
      [100, 215],
      [100, 70],
    ],
    'GATE_CLOSING>GATE_OPENING': [
      [700, 215],
      [850, 70],
    ],
  },
}

export const EXIT_LAYOUT: { pos: Pos; routes: Route } = {
  pos: {
    IDLE: [100, 70],
    LEAVING_SPOT: [290, 70],
    VEHICLE_DETECTED: [480, 70],
    CHECKING: [670, 70],
    ACCESS_GRANTED: [880, 70],
    GATE_OPENING: [880, 215],
    GATE_OPEN: [880, 360],
    VEHICLE_PASSING: [670, 360],
    GATE_CLOSING: [480, 360],
    COMPLETED: [290, 360],
  },
  routes: {
    'COMPLETED>IDLE': [
      [100, 360],
      [100, 70],
    ],
    'GATE_CLOSING>GATE_OPENING': [
      [520, 215],
      [850, 215],
    ],
  },
}

/** Ponto na borda do retângulo do estado na direção de (tx, ty). */
function border(cx: number, cy: number, tx: number, ty: number): [number, number] {
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return [cx, cy]
  const sx = Math.abs(dx) / (W / 2)
  const sy = Math.abs(dy) / (H / 2)
  const s = Math.max(sx, sy)
  return [cx + dx / s, cy + dy / s]
}

export function FsmDiagram<S extends string, E extends string>({
  def,
  layout,
  active,
  recent,
}: {
  def: FsmDefinition<S, E>
  layout: { pos: Pos; routes: Route }
  active: S
  recent: { from: S; to: S; event: E }[]
}) {
  const markerId = useId().replace(/:/g, '')
  const edges = useMemo(() => edgesOf(def), [def])
  const lastEdge = recent[0]
  const recentStates = new Set(recent.slice(0, 4).map((r) => r.from))

  return (
    <svg viewBox="0 0 980 430" className="h-auto w-full" role="img" aria-label={`Diagrama de estados: ${def.name}. Estado ativo ${active}`}>
      <defs>
        <marker id={`a-${markerId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#475569" />
        </marker>
        <marker id={`h-${markerId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#facc15" />
        </marker>
      </defs>
      {edges.map((e) => {
        const key = `${e.from}>${e.to}`
        const a = layout.pos[e.from]
        const b = layout.pos[e.to]
        if (!a || !b) return null
        const via = layout.routes[key] ?? []
        const first = via[0] ?? b
        const last = via[via.length - 1] ?? a
        const start = border(a[0], a[1], first[0], first[1])
        const end = border(b[0], b[1], last[0], last[1])
        const pts = [start, ...via, end]
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
        const hot = lastEdge && lastEdge.from === e.from && lastEdge.to === e.to
        const mid = pts.length > 2 ? pts[1] : [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
        return (
          <g key={key}>
            <path d={d} fill="none" stroke={hot ? '#facc15' : '#3b4a5e'} strokeWidth={hot ? 2.6 : 1.6} markerEnd={`url(#${hot ? 'h' : 'a'}-${markerId})`} />
            <g transform={`translate(${mid[0]} ${mid[1]})`}>
              <rect x={-30} y={-9} width={60} height={16} rx={4} fill="#0b0f14" opacity={0.92} />
              <text y={3} textAnchor="middle" fontSize={10} fontFamily="ui-monospace, monospace" fill={hot ? '#fde047' : '#94a3b8'}>
                {def.eventLabels[e.event]}
              </text>
            </g>
          </g>
        )
      })}
      {def.states.map((s) => {
        const p = layout.pos[s]
        if (!p) return null
        const isActive = s === active
        const wasRecent = recentStates.has(s)
        return (
          <g key={s} transform={`translate(${p[0] - W / 2} ${p[1] - H / 2})`}>
            {isActive && <rect x={-5} y={-5} width={W + 10} height={H + 10} rx={16} fill="none" stroke="#38bdf8" strokeOpacity={0.45} strokeWidth={6} />}
            <rect
              width={W}
              height={H}
              rx={12}
              fill={isActive ? 'rgba(47,140,255,0.28)' : wasRecent ? 'rgba(250,204,21,0.07)' : '#111821'}
              stroke={isActive ? '#38bdf8' : wasRecent ? 'rgba(250,204,21,0.45)' : '#2e3f55'}
              strokeWidth={isActive ? 2.4 : 1.4}
            />
            <text x={W / 2} y={22} textAnchor="middle" fontSize={11.5} fontWeight={700} fontFamily="ui-monospace, monospace" fill={isActive ? '#e0f2fe' : '#cbd5e1'}>
              {s}
            </text>
            <text x={W / 2} y={40} textAnchor="middle" fontSize={10.5} fill={isActive ? '#bae6fd' : '#64748b'}>
              {def.labels[s]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
