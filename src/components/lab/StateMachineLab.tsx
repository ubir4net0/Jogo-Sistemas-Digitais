import { useState } from 'react'
import { useSimulation } from '../../store/simulationStore'
import { ENTRY_FSM, EXIT_FSM, edgesOf } from '../../engine/fsm/fsm'
import { formatClock } from '../../engine/simulation/derived'
import { ENTRY_LAYOUT, EXIT_LAYOUT, FsmDiagram } from '../digital/FsmDiagram'
import { Segmented, cx } from '../ui/primitives'

export function StateMachineLab() {
  const [which, setWhich] = useState<'entry' | 'exit'>('entry')
  const entry = useSimulation((s) => s.sim.entry)
  const exit = useSimulation((s) => s.sim.exit)
  const isEntry = which === 'entry'
  const def = isEntry ? ENTRY_FSM : EXIT_FSM
  const ctl = isEntry ? entry : exit
  const edges = edgesOf(def as typeof ENTRY_FSM)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Segmented
            ariaLabel="Máquina de estados"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'entry', label: 'FSM de entrada' },
              { value: 'exit', label: 'FSM de saída' },
            ]}
          />
        </div>
        <div className="text-sm">
          <span className="text-slate-400">Estado atual: </span>
          <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-mono font-bold text-sky-200">{ctl.state}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-graphite-950/70 p-2 grid-bg">
        <div className="min-w-[680px]">
          {isEntry ? (
            <FsmDiagram def={ENTRY_FSM} layout={ENTRY_LAYOUT} active={entry.state} recent={entry.history} />
          ) : (
            <FsmDiagram def={EXIT_FSM} layout={EXIT_LAYOUT} active={exit.state} recent={exit.history} />
          )}
        </div>
      </div>
      <p className="text-sm text-slate-400">{(def.descriptions as Record<string, string>)[ctl.state]}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          <div className="bg-graphite-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tabela de transição δ(estado, evento)</div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full border-collapse font-mono text-[11.5px]">
              <tbody>
                {edges.map((e) => {
                  const hot = ctl.state === e.from
                  return (
                    <tr key={`${e.from}-${e.event}`} className={cx('border-t border-slate-800', hot ? 'bg-sky-500/10 text-slate-100' : 'text-slate-400')}>
                      <td className="px-2 py-1">{e.from}</td>
                      <td className="px-2 py-1 text-yellow-300/80">{(def.eventLabels as Record<string, string>)[e.event as string]}</td>
                      <td className="px-2 py-1">→ {e.to}</td>
                    </tr>
                  )
                })}
                <tr className="border-t border-slate-800 text-slate-500">
                  <td className="px-2 py-1">qualquer</td>
                  <td className="px-2 py-1 text-red-300/80">R</td>
                  <td className="px-2 py-1">→ IDLE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          <div className="bg-graphite-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Transições recentes (ao vivo)</div>
          {ctl.history.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nenhuma transição ainda. Adicione ou retire um veículo na aba Simulação.</p>
          ) : (
            <ol className="max-h-72 overflow-y-auto">
              {ctl.history.map((h, i) => (
                <li key={`${h.at}-${i}`} className={cx('flex flex-wrap items-center gap-x-2 border-t border-slate-800 px-3 py-1.5 font-mono text-[11.5px]', i === 0 ? 'text-slate-100' : 'text-slate-500')}>
                  <span className="text-slate-600">{formatClock(h.wall)}</span>
                  <span>{h.from}</span>
                  <span className="text-yellow-400/90">—{(def.eventLabels as Record<string, string>)[h.event as string]}→</span>
                  <span className={i === 0 ? 'text-sky-300' : ''}>{h.to}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
