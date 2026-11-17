/**
 * Tabela-verdade de ENTRADA_AUTORIZADA gerada pela MESMA função usada pelo
 * controlador (`entryTruthTable` → `entryAuthorized`).
 */
import { useMemo } from 'react'
import { entryTruthTable, truthRowIndex, type EntryInputs } from '../../engine/logic/authorization'
import { cx } from '../ui/primitives'

export function TruthTable({ live, latched, compact }: { live: EntryInputs; latched?: EntryInputs | null; compact?: boolean }) {
  const rows = useMemo(() => entryTruthTable(), [])
  const liveIdx = truthRowIndex(live)
  const latchedIdx = latched ? truthRowIndex(latched) : -1
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60">
      <table className="w-full border-collapse text-center font-mono text-sm">
        <thead>
          <tr className="bg-graphite-800 text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-2 py-2 font-semibold">SE</th>
            <th className="px-2 py-2 font-semibold">L</th>
            <th className="px-2 py-2 font-semibold">M</th>
            <th className="px-2 py-2 font-semibold text-sky-300">{compact ? 'AUT' : 'ENTRADA_AUTORIZADA'}</th>
            {!compact && <th className="px-2 py-2 font-semibold">Situação</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isLive = r.index === liveIdx
            const isLatched = r.index === latchedIdx
            return (
              <tr
                key={r.index}
                className={cx(
                  'border-t border-slate-800 transition-colors duration-200',
                  isLive ? 'bg-sky-500/20 text-white' : isLatched ? 'bg-yellow-500/10 text-slate-100' : 'text-slate-400',
                )}
              >
                <td className="px-2 py-1.5">{r.SE}</td>
                <td className="px-2 py-1.5">{r.L}</td>
                <td className="px-2 py-1.5">{r.M}</td>
                <td className={cx('px-2 py-1.5 font-bold', r.ENTRADA_AUTORIZADA ? 'text-emerald-400' : 'text-red-400/80')}>{r.ENTRADA_AUTORIZADA}</td>
                {!compact && (
                  <td className="px-2 py-1.5 text-left font-sans text-[11px]">
                    {isLive && <span className="mr-1 rounded bg-sky-500/30 px-1.5 py-0.5 font-semibold text-sky-200">AO VIVO</span>}
                    {isLatched && <span className="mr-1 rounded bg-yellow-500/25 px-1.5 py-0.5 font-semibold text-yellow-200">ÚLTIMA DECISÃO</span>}
                    {!isLive && !isLatched && (r.SE === 0 ? 'sem veículo' : r.M ? 'manutenção' : r.L ? 'lotado' : 'libera entrada')}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
