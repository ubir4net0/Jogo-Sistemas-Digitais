import { useSimulation } from '../../store/simulationStore'
import { decodeSevenSegment, SEGMENT_EXPRESSIONS, SEGMENT_NAMES } from '../../engine/logic/sevenSegment'
import { fromBits, toBits } from '../../engine/logic/counter'
import { SevenSegment } from '../digital/SevenSegment'
import { cx } from '../ui/primitives'

export function SevenSegmentLab() {
  const bits = useSimulation((s) => s.sim.counter.bits)
  const value = fromBits(bits)
  const seg = decodeSevenSegment(bits)
  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-red-500/20 bg-graphite-900/60 p-4">
        <SevenSegment bits={bits} size={170} showLabels />
        <div className="font-mono text-xs text-slate-400">
          entrada Q3..Q0 = <span className="text-sky-300">{bits.join('')}</span> → dígito <span className="text-white">{value}</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full min-w-[420px] border-collapse text-center font-mono text-xs">
            <thead>
              <tr className="bg-graphite-800 text-[11px] uppercase text-slate-400">
                <th className="py-2">Nº</th>
                <th>Q3Q2Q1Q0</th>
                {SEGMENT_NAMES.map((n) => (
                  <th key={n}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, n) => {
                const s = decodeSevenSegment(toBits(n))
                const cur = n === value
                return (
                  <tr key={n} className={cx('border-t border-slate-800', cur ? 'bg-sky-500/20 text-white' : 'text-slate-400')}>
                    <td className="py-1 font-bold">{n}</td>
                    <td>{toBits(n).join('')}</td>
                    {SEGMENT_NAMES.map((k) => (
                      <td key={k} className={s[k] ? 'font-bold text-red-400' : 'text-slate-600'}>
                        {s[k]}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SEGMENT_NAMES.map((k) => (
            <div key={k} className={cx('flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px]', seg[k] ? 'border-red-500/40 bg-red-500/10 text-red-100' : 'border-slate-800 text-slate-500')}>
              <span className="font-bold">{k}</span>
              <span className="min-w-0 flex-1 truncate">= {SEGMENT_EXPRESSIONS[k]}</span>
              <span className="font-bold">{seg[k]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">A = Q3, B = Q2, C = Q1, D = Q0 · X′ = NOT X. Expressões obtidas por mapas de Karnaugh e implementadas com portas AND/OR/NOT; os testes comparam o resultado com a tabela de consulta.</p>
      </div>
    </div>
  )
}
