/** Contador digital: ao vivo (simulação) + bancada isolada para testar limites. */
import { useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import {
  AND,
  NOT,
  type Bit,
} from '../../engine/logic/gates'
import {
  bitsToString,
  counterDecrement,
  counterIncrement,
  decrementEnable,
  formatBinary,
  fromBits,
  incrementEnable,
  initialCounter,
  type CounterState,
} from '../../engine/logic/counter'
import { BinaryCounter } from '../digital/BinaryCounter'
import { SevenSegment } from '../digital/SevenSegment'
import { Button, cx } from '../ui/primitives'

export function LiveCounter() {
  const counter = useSimulation((s) => s.sim.counter)
  const value = fromBits(counter.bits)
  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-sky-500/20 bg-graphite-900/60 p-4">
        <BinaryCounter bits={counter.bits} previous={counter.previous} pulse={counter.pulses} size="lg" />
        <div className="flex items-center gap-3">
          <SevenSegment bits={counter.bits} size={96} />
          <div className="text-xs text-slate-400">
            <div>
              Último pulso: <span className="font-mono text-slate-200">{bitsToString(counter.previous)} → {bitsToString(counter.bits)}</span>
            </div>
            <div>
              Pulsos aplicados: <span className="font-mono text-slate-200">{counter.pulses}</span>
            </div>
            <div className="mt-1 text-[11px] text-yellow-300/80">Bits com contorno amarelo mudaram (Qᵢ ⊕ Qᵢ′ = 1).</div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-700/60">
        <table className="w-full border-collapse text-center font-mono text-sm">
          <thead>
            <tr className="bg-graphite-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2">Decimal</th>
              <th>Q3</th>
              <th>Q2</th>
              <th>Q1</th>
              <th>Q0</th>
              <th className="hidden sm:table-cell">Significado</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }, (_, n) => {
              const bits = formatBinary(n).split('')
              const cur = n === value
              return (
                <tr key={n} className={cx('border-t border-slate-800 transition-colors', cur ? 'bg-sky-500/20 text-white' : 'text-slate-400')}>
                  <td className="py-1 font-bold">{n}</td>
                  {bits.map((b, i) => (
                    <td key={i} className={b === '1' ? 'font-bold text-sky-300' : ''}>
                      {b}
                    </td>
                  ))}
                  <td className="hidden text-left font-sans text-[11px] sm:table-cell">{n === 0 ? 'vazio' : n === 8 ? 'lotado (Q3 = 1)' : `${n} vaga${n > 1 ? 's' : ''} ocupada${n > 1 ? 's' : ''}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CounterBench() {
  const [c, setC] = useState<CounterState>(() => initialCounter(0))
  const [msg, setMsg] = useState<string>('Bancada isolada: os pulsos aqui não alteram o estacionamento.')
  const [q3, q2, q1, q0] = c.bits
  const en: Bit = incrementEnable(c.bits)
  const c1 = AND(q0, en)
  const c2 = AND(q1, c1)
  const c3 = AND(q2, c2)
  const enDec = decrementEnable(c.bits)

  const inc = () => {
    const r = counterIncrement(c)
    setC(r.counter)
    setMsg(r.applied ? `INC: ${bitsToString(c.bits)} → ${bitsToString(r.counter.bits)}` : 'Pulso bloqueado: EN_INC = NOT Q3 = 0 (contador em 8, sem overflow).')
  }
  const dec = () => {
    const r = counterDecrement(c)
    setC(r.counter)
    setMsg(r.applied ? `DEC: ${bitsToString(c.bits)} → ${bitsToString(r.counter.bits)}` : 'Pulso bloqueado: EN_DEC = Q3+Q2+Q1+Q0 = 0 (contador em 0, sem underflow).')
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-graphite-900/60 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <BinaryCounter bits={c.bits} previous={c.previous} pulse={c.pulses} />
        <SevenSegment bits={c.bits} size={70} color="#38bdf8" />
        <div className="flex gap-2">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={inc}>
            INC
          </Button>
          <Button variant="secondary" icon={<Minus className="h-4 w-4" />} onClick={dec}>
            DEC
          </Button>
          <Button
            variant="ghost"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => {
              setC(initialCounter(0))
              setMsg('Bancada zerada (R).')
            }}
            aria-label="Zerar bancada"
          />
        </div>
      </div>
      <p className={cx('mt-3 rounded-lg px-3 py-2 font-mono text-xs', msg.startsWith('Pulso bloqueado') ? 'bg-red-500/10 text-red-200' : 'bg-white/5 text-slate-300')}>{msg}</p>
      <div className="mt-3 grid gap-2 font-mono text-[11.5px] text-slate-400 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 p-2">
          <div className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Incremento em cascata (próximo pulso)</div>
          <div>EN_INC = NOT Q3 = {en}</div>
          <div>
            C1 = Q0·EN = {c1} · C2 = Q1·C1 = {c2} · C3 = Q2·C2 = {c3}
          </div>
          <div>Qᵢ′ = Qᵢ ⊕ Cᵢ</div>
        </div>
        <div className="rounded-lg border border-slate-800 p-2">
          <div className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Decremento em cascata</div>
          <div>EN_DEC = Q3+Q2+Q1+Q0 = {enDec}</div>
          <div>
            B1 = Q̄0·EN = {AND(NOT(q0), enDec)} · B2 = Q̄1·B1 = {AND(NOT(q1), AND(NOT(q0), enDec))}
          </div>
          <div>
            Qᵢ′ = Qᵢ ⊕ Bᵢ · Q3 atual = {q3}
          </div>
        </div>
      </div>
    </div>
  )
}
