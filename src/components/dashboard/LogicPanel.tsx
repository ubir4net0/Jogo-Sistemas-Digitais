import { Cpu, GitBranch, Sigma, Table2 } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { ENTRY_FSM, EXIT_FSM } from '../../engine/fsm/fsm'
import { formatClock } from '../../engine/simulation/derived'
import { NOT } from '../../engine/logic/gates'
import { SIGNAL_INFO, INPUT_SIGNALS } from '../digital/signalInfo'
import { TruthTable } from '../digital/TruthTable'
import { BitLed, Panel, cx } from '../ui/primitives'

export function SignalsGrid() {
  const signals = useSimulation((s) => s.sim.signals)
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {INPUT_SIGNALS.map((n) => {
        const info = SIGNAL_INFO[n]
        const v = signals[n]
        return (
          <div key={n} className={cx('flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5', v ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-slate-700/50 bg-graphite-900/60')} title={info.description}>
            <BitLed value={v} tone={n === 'L' ? 'red' : n === 'M' ? 'yellow' : n === 'R' ? 'red' : 'yellow'} />
            <span className="w-8 font-mono text-sm font-bold text-slate-100">{n}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-400">{info.title}</span>
            <span className={cx('font-mono text-base font-bold', v ? 'text-yellow-300' : 'text-slate-600')}>{v}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ExpressionCard() {
  const s = useSimulation((st) => st.sim.signals)
  const decision = useSimulation((st) => st.sim.entry.lastDecision)
  const out = s.ENTRADA_AUTORIZADA
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-500/25 bg-graphite-900/70 p-3">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Autorização de entrada (combinacional)</div>
        <div className="font-mono text-[13px] text-slate-200">
          ENTRADA_AUTORIZADA = SE · L̄ · M̄
        </div>
        <div className="mt-1 font-mono text-[13px]">
          <span className="text-slate-500">= </span>
          <span className="text-yellow-300">{s.SE}</span>
          <span className="text-slate-500"> · </span>
          <span className="text-yellow-300">{NOT(s.L)}</span>
          <span className="text-slate-500"> · </span>
          <span className="text-yellow-300">{NOT(s.M)}</span>
          <span className="text-slate-500"> = </span>
          <span className={cx('rounded px-1.5 font-bold', out ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/15 text-red-300')}>{out}</span>
        </div>
        <div className="mt-2 font-mono text-[12px] text-slate-400">
          SAIDA_AUTORIZADA = SS · CS = {s.SS} · {s.CS} = <span className={s.SAIDA_AUTORIZADA ? 'text-emerald-300' : 'text-slate-500'}>{s.SAIDA_AUTORIZADA}</span>
        </div>
      </div>
      {decision && (
        <div className={cx('rounded-xl border p-3 text-xs', decision.result ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')}>
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
            <span>Última decisão registrada</span>
            <span className="font-mono normal-case">{formatClock(decision.wall)}</span>
          </div>
          <div className="font-mono text-slate-200">
            SE={decision.SE} L={decision.L} M={decision.M} → <span className={decision.result ? 'text-emerald-300' : 'text-red-300'}>{decision.result}</span>
            {decision.spotId && <span className="text-slate-400"> · vaga {decision.spotId}</span>}
          </div>
          <div className="mt-1 text-slate-400">{decision.reason}</div>
        </div>
      )}
    </div>
  )
}

export function FsmStatus() {
  const entry = useSimulation((s) => s.sim.entry)
  const exit = useSimulation((s) => s.sim.exit)
  const blocks = [
    { def: ENTRY_FSM, state: entry.state, history: entry.history },
    { def: EXIT_FSM, state: exit.state, history: exit.history },
  ] as const
  return (
    <div className="space-y-3">
      {blocks.map((b) => (
        <div key={b.def.id} className="rounded-xl border border-slate-700/50 bg-graphite-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-300">{b.def.name}</span>
            <span className={cx('rounded-md px-2 py-0.5 font-mono text-[11px] font-bold', b.state === 'IDLE' ? 'bg-slate-700/60 text-slate-300' : 'bg-sky-500/20 text-sky-200')}>{b.state}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">{(b.def.descriptions as Record<string, string>)[b.state]}</p>
          {b.history.length > 0 && (
            <ol className="mt-2 space-y-0.5 border-t border-slate-800 pt-2">
              {b.history.slice(0, 5).map((h, i) => (
                <li key={`${h.at}-${i}`} className={cx('flex items-center gap-1.5 font-mono text-[10.5px]', i === 0 ? 'text-slate-200' : 'text-slate-500')}>
                  <span className="tabular-nums text-slate-600">{formatClock(h.wall)}</span>
                  <span className="truncate">{h.from}</span>
                  <span className="text-yellow-400/80">—{(b.def.eventLabels as Record<string, string>)[h.event]}→</span>
                  <span className="truncate">{h.to}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}

export function LogicPanel() {
  const s = useSimulation((st) => st.sim.signals)
  const decision = useSimulation((st) => st.sim.entry.lastDecision)
  const entryState = useSimulation((st) => st.sim.entry.state)
  const latchedVisible = entryState !== 'IDLE' && decision
  return (
    <div className="space-y-3">
      <Panel title="Sinais digitais" icon={<Cpu className="h-4 w-4" />}>
        <SignalsGrid />
      </Panel>
      <Panel title="Expressões lógicas" icon={<Sigma className="h-4 w-4" />}>
        <ExpressionCard />
      </Panel>
      <Panel title="Tabela-verdade" icon={<Table2 className="h-4 w-4" />}>
        <TruthTable compact live={{ SE: s.SE, L: s.L, M: s.M }} latched={latchedVisible ? decision : null} />
        <p className="mt-2 text-[11px] text-slate-500">
          Azul: combinação atual dos sinais. Amarelo: combinação que gerou a última decisão do controlador.
        </p>
      </Panel>
      <Panel title="Máquinas de estados" icon={<GitBranch className="h-4 w-4" />}>
        <FsmStatus />
      </Panel>
    </div>
  )
}
