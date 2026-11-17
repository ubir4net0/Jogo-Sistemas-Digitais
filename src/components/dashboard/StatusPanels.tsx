import { useShallow } from 'zustand/react/shallow'
import { motion } from 'motion/react'
import { Activity, Binary, Bot, Construction, DoorClosed, DoorOpen, Gauge, PauseCircle } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { GATE_LABEL, STATUS_META, gateDisplay, kpis, systemStatus } from '../../engine/simulation/derived'
import { ENTRY_FSM, EXIT_FSM } from '../../engine/fsm/fsm'
import { bitsToString } from '../../engine/logic/counter'
import type { GateDisplayState } from '../../engine/simulation/types'
import { BinaryCounter } from '../digital/BinaryCounter'
import { SevenSegment } from '../digital/SevenSegment'
import { Pill, cx, type Tone } from '../ui/primitives'

export function StatusHeader() {
  const status = useSimulation((s) => systemStatus(s.sim))
  const maintenance = useSimulation((s) => s.sim.maintenance)
  const auto = useSimulation((s) => s.sim.auto.enabled)
  const meta = STATUS_META[status]
  const toneClass: Record<typeof meta.tone, string> = {
    green: 'from-emerald-500/20 border-emerald-500/40 text-emerald-200',
    red: 'from-red-500/25 border-red-500/45 text-red-200',
    yellow: 'from-yellow-500/20 border-yellow-500/40 text-yellow-100',
    gray: 'from-slate-500/20 border-slate-500/40 text-slate-200',
  }
  const dot: Record<typeof meta.tone, string> = {
    green: 'bg-emerald-400 led-glow-green',
    red: 'bg-red-500 led-glow-red',
    yellow: 'bg-yellow-400 led-glow-yellow',
    gray: 'bg-slate-400',
  }
  return (
    <div className={cx('rounded-2xl border bg-gradient-to-r to-transparent p-4', toneClass[meta.tone])} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={cx('h-4 w-4 shrink-0 rounded-full', dot[meta.tone], status === 'BUSY' && 'animate-pulse')} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Status do sistema</div>
          <div className="truncate text-lg font-bold leading-tight">{meta.label}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {maintenance && (
            <Pill tone="orange" pulse>
              <Construction className="h-3 w-3" /> Manutenção
            </Pill>
          )}
          <Pill tone={auto ? 'blue' : 'gray'}>
            {auto ? <Bot className="h-3 w-3" /> : null}
            {auto ? 'Automático' : 'Manual'}
          </Pill>
        </div>
      </div>
      <p className="mt-2 text-xs opacity-75">{meta.hint}</p>
    </div>
  )
}

function Kpi({ label, value, tone, sub }: { label: string; value: string | number; tone?: Tone; sub?: string }) {
  const color: Record<Tone, string> = {
    green: 'text-emerald-300',
    red: 'text-red-300',
    yellow: 'text-yellow-300',
    blue: 'text-sky-300',
    gray: 'text-slate-100',
    orange: 'text-orange-300',
  }
  return (
    <div className="rounded-xl border border-slate-700/50 bg-graphite-900/70 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cx('font-mono text-2xl font-bold tabular-nums', color[tone ?? 'gray'])}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  )
}

export function KpiGrid() {
  const k = useSimulation(useShallow((s) => kpis(s.sim)))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Total" value={k.total} />
        <Kpi label="Livres" value={k.free} tone="green" />
        <Kpi label="Ocupadas" value={k.occupied} tone="red" />
        <Kpi label="Reservadas" value={k.reserved} tone="yellow" />
        <Kpi label="Em movimento" value={k.moving} tone="blue" />
        <Kpi label="Na via" value={k.waiting} sub="aguardando" />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" /> Ocupação
          </span>
          <span className="font-mono font-semibold text-slate-200">{k.percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-graphite-900" role="progressbar" aria-valuenow={k.percent} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className={cx('h-full rounded-full', k.percent >= 100 ? 'bg-red-500' : k.percent >= 75 ? 'bg-amber-400' : 'bg-emerald-400')}
            animate={{ width: `${k.percent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    </div>
  )
}

export function CounterCard() {
  const counter = useSimulation((s) => s.sim.counter)
  return (
    <div className="rounded-2xl border border-sky-500/20 bg-graphite-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          <Binary className="h-3.5 w-3.5 text-sky-400" /> Contador 4 bits
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          anterior {bitsToString(counter.previous)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <BinaryCounter bits={counter.bits} previous={counter.previous} pulse={counter.pulses} />
        <div className="flex flex-col items-center">
          <SevenSegment bits={counter.bits} size={78} />
          <span className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">7 segmentos</span>
        </div>
      </div>
    </div>
  )
}

const GATE_TONE: Record<GateDisplayState, Tone> = {
  CLOSED: 'red',
  OPENING: 'yellow',
  OPEN: 'green',
  CLOSING: 'yellow',
  BLOCKED: 'orange',
}

export function GatesCard() {
  const entryGate = useSimulation((s) => gateDisplay(s.sim, 'entry'))
  const exitGate = useSimulation((s) => gateDisplay(s.sim, 'exit'))
  const entryState = useSimulation((s) => s.sim.entry.state)
  const exitState = useSimulation((s) => s.sim.exit.state)
  const sensors = useSimulation((s) => s.sim.signals.SE + s.sim.signals.SS + s.sim.signals.P + s.sim.signals.PS)
  const paused = useSimulation((s) => s.sim.paused)
  const rows = [
    { label: 'Cancela de entrada', gate: entryGate, fsm: ENTRY_FSM.labels[entryState], state: entryState },
    { label: 'Cancela de saída', gate: exitGate, fsm: EXIT_FSM.labels[exitState], state: exitState },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-graphite-900/60 px-3 py-2">
          {r.gate === 'OPEN' || r.gate === 'OPENING' ? <DoorOpen className="h-5 w-5 text-emerald-400" /> : <DoorClosed className="h-5 w-5 text-slate-400" />}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-200">{r.label}</div>
            <div className="truncate font-mono text-[10.5px] text-slate-500" title={r.state}>
              FSM: {r.state}
            </div>
          </div>
          <Pill tone={GATE_TONE[r.gate]}>{GATE_LABEL[r.gate]}</Pill>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-graphite-900/60 px-3 py-2 text-xs">
        <span className="flex items-center gap-2 text-slate-300">
          <Activity className="h-4 w-4 text-yellow-400" /> Sensores ativos
        </span>
        <span className="font-mono font-bold text-yellow-300">{sensors} / 4</span>
      </div>
      {paused && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-500/40 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
          <PauseCircle className="h-4 w-4" /> Simulação pausada — temporizadores e movimentos congelados.
        </div>
      )}
    </div>
  )
}
