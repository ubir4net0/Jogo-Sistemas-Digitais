/**
 * Circuito lógico de autorização. Modo "Ao vivo" lê os sinais reais da
 * simulação; modo "Manual" usa entradas locais isoladas (não altera o
 * estacionamento). Em ambos, a saída é calculada pelas MESMAS funções.
 */
import { useState } from 'react'
import { Radio, Hand } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSimulation } from '../../store/simulationStore'
import { NOT, AND, type Bit } from '../../engine/logic/gates'
import { entryAuthorized, exitAuthorized } from '../../engine/logic/authorization'
import { occupiedCount, reservedCount } from '../../engine/simulation/engine'
import { GateSymbol, Wire } from '../digital/GateSymbol'
import { Segmented, cx } from '../ui/primitives'

type Inputs = { SE: Bit; L: Bit; M: Bit; SS: Bit; CS: Bit }

function InputNode({ x, y, name, value, sub }: { x: number; y: number; name: string; value: Bit; sub?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={-20} width={104} height={40} rx={10} fill={value ? 'rgba(250,204,21,0.15)' : '#111821'} stroke={value ? '#facc15' : '#334155'} strokeWidth={1.6} />
      <circle cx={18} cy={0} r={7} fill={value ? '#facc15' : '#1e293b'} stroke={value ? '#fde68a' : '#475569'} />
      <text x={34} y={5} fontSize={15} fontWeight={700} fill="#e2e8f0" fontFamily="ui-monospace, monospace">
        {name}
      </text>
      <text x={92} y={5} fontSize={15} fontWeight={800} textAnchor="end" fill={value ? '#fde047' : '#64748b'} fontFamily="ui-monospace, monospace">
        {value}
      </text>
      {sub && (
        <text x={0} y={34} fontSize={10.5} fill="#64748b">
          {sub}
        </text>
      )}
    </g>
  )
}

function OutputNode({ x, y, name, value, sub }: { x: number; y: number; name: string; value: Bit; sub: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={-26} width={210} height={52} rx={12} fill={value ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)'} stroke={value ? '#22c55e' : '#ef4444'} strokeWidth={1.8} />
      <circle cx={20} cy={0} r={9} fill={value ? '#22c55e' : '#7f1d1d'} style={{ filter: value ? 'drop-shadow(0 0 6px #22c55e)' : undefined }} />
      <text x={38} y={-3} fontSize={12.5} fontWeight={700} fill="#e2e8f0" fontFamily="ui-monospace, monospace">
        {name} = {value}
      </text>
      <text x={38} y={14} fontSize={10.5} fill={value ? '#86efac' : '#fca5a5'}>
        {sub}
      </text>
    </g>
  )
}

export function LogicCircuit() {
  const [mode, setMode] = useState<'live' | 'manual'>('live')
  const [manual, setManual] = useState<Inputs>({ SE: 1, L: 0, M: 0, SS: 0, CS: 0 })
  const live = useSimulation(
    useShallow((s) => ({
      SE: s.sim.signals.SE,
      L: s.sim.signals.L,
      M: s.sim.signals.M,
      SS: s.sim.signals.SS,
      CS: s.sim.signals.CS,
      occ: occupiedCount(s.sim),
      res: reservedCount(s.sim),
    })),
  )
  const v: Inputs = mode === 'live' ? live : manual
  const nL = NOT(v.L)
  const nM = NOT(v.M)
  const andSE_nL = AND(v.SE, nL)
  const entry = entryAuthorized(v)
  const exit = exitAuthorized(v)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Segmented
            ariaLabel="Fonte dos sinais"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'live', label: 'Ao vivo (simulação)' },
              { value: 'manual', label: 'Manual (isolado)' },
            ]}
          />
        </div>
        <span className={cx('flex items-center gap-1.5 text-xs', mode === 'live' ? 'text-sky-300' : 'text-amber-300')}>
          {mode === 'live' ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Hand className="h-3.5 w-3.5" />}
          {mode === 'live' ? 'Lendo sensores do estacionamento em tempo real' : 'Entradas locais — o estacionamento não é afetado'}
        </span>
      </div>
      {mode === 'manual' && (
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(manual) as (keyof Inputs)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setManual((m) => ({ ...m, [k]: NOT(m[k]) }))}
              className={cx('rounded-lg border px-3 py-1.5 font-mono text-sm font-bold transition-colors', manual[k] ? 'border-yellow-400/60 bg-yellow-500/20 text-yellow-100' : 'border-slate-600 bg-graphite-800 text-slate-400')}
              aria-pressed={manual[k] === 1}
            >
              {k} = {manual[k]}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-graphite-950/70 grid-bg">
        <svg viewBox="0 0 900 430" className="h-auto w-full min-w-[640px]" role="img" aria-label={`Circuito: ENTRADA_AUTORIZADA = ${entry}, SAIDA_AUTORIZADA = ${exit}`}>
          <text x={16} y={22} fontSize={11} fill="#64748b" fontWeight={700} letterSpacing={2}>
            ENTRADA — ENTRADA_AUTORIZADA = SE · L̄ · M̄
          </text>
          {/* Fios */}
          <Wire d="M124 70 H470 V125 H540" on={v.SE === 1} />
          <Wire d="M124 150 H330" on={v.L === 1} />
          <Wire d="M374 150 H540" on={nL === 1} />
          <Wire d="M124 235 H330" on={v.M === 1} />
          <Wire d="M374 235 H500 V175 H540" on={nM === 1} />
          <Wire d="M628 150 H676" on={entry === 1} />
          <InputNode x={20} y={70} name="SE" value={v.SE} sub="laço indutivo da entrada" />
          <InputNode x={20} y={150} name="L" value={v.L} sub={mode === 'live' ? `ocup. ${live.occ} + res. ${live.res} ≥ 8 ?` : 'lotado (comparador)'} />
          <InputNode x={20} y={235} name="M" value={v.M} sub="modo manutenção" />
          <GateSymbol type="NOT" x={330} y={130} active={nL === 1} />
          <GateSymbol type="NOT" x={330} y={215} active={nM === 1} />
          <text x={392} y={142} fontSize={11} fontFamily="ui-monospace, monospace" fill={nL ? '#7dd3fc' : '#64748b'}>
            L̄ = {nL}
          </text>
          <text x={392} y={227} fontSize={11} fontFamily="ui-monospace, monospace" fill={nM ? '#7dd3fc' : '#64748b'}>
            M̄ = {nM}
          </text>
          <GateSymbol type="AND" x={540} y={110} scale={2} active={entry === 1} label={false} />
          <text x={575} y={155} fontSize={12} fontWeight={700} textAnchor="middle" fill={entry ? '#e0f2fe' : '#94a3b8'} fontFamily="ui-monospace, monospace">
            AND
          </text>
          <text x={584} y={100} fontSize={10} textAnchor="middle" fill="#64748b" fontFamily="ui-monospace, monospace">
            SE·L̄ = {andSE_nL}
          </text>
          <OutputNode x={676} y={150} name="ENTRADA_AUT" value={entry} sub={entry ? '→ FSM: ACCESS_GRANTED' : '→ FSM: ACCESS_DENIED / aguarda'} />

          <line x1={16} x2={884} y1={292} y2={292} stroke="#1e293b" strokeDasharray="4 6" />
          <text x={16} y={318} fontSize={11} fill="#64748b" fontWeight={700} letterSpacing={2}>
            SAÍDA — SAIDA_AUTORIZADA = SS · CS
          </text>
          <Wire d="M124 345 H540" on={v.SS === 1} />
          <Wire d="M124 400 H470 V375 H540" on={v.CS === 1} />
          <Wire d="M606 360 H676" on={exit === 1} />
          <InputNode x={20} y={345} name="SS" value={v.SS} />
          <InputNode x={20} y={400} name="CS" value={v.CS} />
          <GateSymbol type="AND" x={540} y={330} scale={1.5} active={exit === 1} label={false} />
          <text x={565} y={364} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={exit ? '#e0f2fe' : '#94a3b8'} fontFamily="ui-monospace, monospace">
            AND
          </text>
          <OutputNode x={676} y={360} name="SAIDA_AUT" value={exit} sub={exit ? '→ FSM saída: ACCESS_GRANTED' : '→ aguarda SS e CS'} />
        </svg>
      </div>
    </div>
  )
}
