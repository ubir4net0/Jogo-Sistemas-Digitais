/** Portas lógicas interativas (ambiente isolado — não afeta a simulação). */
import { useState } from 'react'
import { GATES, NOT, gateTruthTable, type Bit, type GateName } from '../../engine/logic/gates'
import { GateSymbol, Wire } from '../digital/GateSymbol'
import { cx } from '../ui/primitives'

function Toggle({ label, value, onClick }: { label: string; value: Bit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={value === 1}
      className={cx(
        'flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-sm font-bold transition-colors',
        value ? 'border-yellow-400/60 bg-yellow-500/20 text-yellow-100' : 'border-slate-600 bg-graphite-800 text-slate-400 hover:border-slate-500',
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </button>
  )
}

function GateCard({ name }: { name: GateName }) {
  const gate = GATES[name]
  const [a, setA] = useState<Bit>(0)
  const [b, setB] = useState<Bit>(0)
  const y = gate.evaluate(a, b)
  const rows = gateTruthTable(name)
  const unary = gate.arity === 1
  return (
    <div className="panel flex flex-col p-4">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-mono text-lg font-bold text-white">{name}</h4>
        <span className="font-mono text-xs text-sky-300">{gate.expression}</span>
      </div>
      <p className="mb-3 text-xs text-slate-400">{gate.description}</p>
      <div className="flex items-center gap-3">
        <div className="w-16 space-y-2">
          <Toggle label="A" value={a} onClick={() => setA(NOT(a))} />
          {!unary && <Toggle label="B" value={b} onClick={() => setB(NOT(b))} />}
        </div>
        <svg viewBox="0 0 150 60" className="h-16 flex-1" aria-hidden>
          {unary ? (
            <Wire d="M0 30 H50" on={a === 1} />
          ) : (
            <>
              <Wire d="M0 20 H50" on={a === 1} />
              <Wire d="M0 40 H50" on={b === 1} />
            </>
          )}
          <GateSymbol type={name} x={50} y={10} active={y === 1} />
          <Wire d={`M${unary || name === 'AND' ? 94 : 100} 30 H150`} on={y === 1} />
        </svg>
        <div className="flex w-14 flex-col items-center">
          <span className={cx('flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-lg font-bold', y ? 'border-emerald-300 bg-emerald-500/30 text-emerald-100 led-glow-green' : 'border-slate-600 bg-graphite-900 text-slate-500')}>{y}</span>
          <span className="mt-1 text-[10px] text-slate-500">Y</span>
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-center font-mono text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1">A</th>
            {!unary && <th>B</th>}
            <th className="text-sky-300">Y</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const cur = r.a === a && (unary || r.b === b)
            return (
              <tr key={i} className={cx('border-t border-slate-800', cur ? 'bg-sky-500/20 text-white' : 'text-slate-400')}>
                <td className="py-1">{r.a}</td>
                {!unary && <td>{r.b}</td>}
                <td className={r.y ? 'font-bold text-emerald-400' : 'text-red-400/70'}>{r.y}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function GatePlayground() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(['AND', 'OR', 'NOT', 'XOR'] as GateName[]).map((g) => (
        <GateCard key={g} name={g} />
      ))}
    </div>
  )
}
