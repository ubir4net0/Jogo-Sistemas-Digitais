/**
 * Diagrama de blocos da arquitetura lógica, com realimentações:
 *  contador → comparador → L → lógica combinacional, e
 *  fim de curso das cancelas → máquina de estados.
 * Blocos e conexões acendem conforme os sinais reais da simulação.
 */
import { useId } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useSimulation } from '../../store/simulationStore'
import { bitsToString, counterValue } from '../../engine/logic/counter'
import { occupiedCount, reservedCount } from '../../engine/simulation/engine'

interface BlockProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  lines: string[]
  on: boolean
  accent?: string
}

function Block({ x, y, w, h, title, lines, on, accent = '#38bdf8' }: BlockProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {on && <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={16} fill="none" stroke={accent} strokeOpacity={0.35} strokeWidth={6} />}
      <rect width={w} height={h} rx={12} fill={on ? 'rgba(47,140,255,0.14)' : '#111821'} stroke={on ? accent : '#2e3f55'} strokeWidth={1.6} />
      <text x={w / 2} y={24} textAnchor="middle" fontSize={11.5} fontWeight={800} letterSpacing={1.2} fill={on ? '#e0f2fe' : '#cbd5e1'}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={14} y={50 + i * 20} fontSize={11.5} fontFamily="ui-monospace, monospace" fill={on ? '#bae6fd' : '#7c8da3'}>
          {l}
        </text>
      ))}
    </g>
  )
}

function Arrow({ d, on, label, lx, ly, dashed, marker }: { d: string; on: boolean; label: string; lx: number; ly: number; dashed?: boolean; marker: string }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={on ? '#38bdf8' : '#3b4a5e'}
        strokeWidth={on ? 2.6 : 1.8}
        strokeDasharray={dashed ? '6 5' : undefined}
        className={on && !dashed ? 'wire-active' : undefined}
        markerEnd={`url(#${marker}-${on ? 'on' : 'off'})`}
      />
      <text x={lx} y={ly} fontSize={10.5} textAnchor="middle" fill={on ? '#7dd3fc' : '#64748b'} fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  )
}

export function BlockDiagram() {
  const m = useId().replace(/:/g, '')
  const s = useSimulation(
    useShallow((st) => {
      const sim = st.sim
      return {
        ...sim.signals,
        entry: sim.entry.state,
        exit: sim.exit.state,
        gE: sim.gates.entry.phase,
        gX: sim.gates.exit.phase,
        bits: bitsToString(sim.counter.bits),
        count: counterValue(sim.counter),
        occ: occupiedCount(sim),
        res: reservedCount(sim),
        recentCount: sim.simTime - sim.counterChangedAt < 1.6 && sim.counterChangedAt >= 0,
      }
    }),
  )
  const sensorsOn = s.SE + s.SS + s.P + s.PS > 0
  const cmdOn = s.CE + s.CS + s.M + s.R > 0
  const combOn = s.ENTRADA_AUTORIZADA + s.SAIDA_AUTORIZADA > 0
  const fsmOn = s.entry !== 'IDLE' || s.exit !== 'IDLE'
  const actOn = s.gE !== 'CLOSED' || s.gX !== 'CLOSED'

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-graphite-950/70 grid-bg">
      <svg viewBox="0 0 1100 480" className="h-auto w-full min-w-[720px]" role="img" aria-label="Diagrama de blocos do sistema digital do estacionamento">
        <defs>
          {(['on', 'off'] as const).map((k) => (
            <marker key={k} id={`${m}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={k === 'on' ? '#38bdf8' : '#3b4a5e'} />
            </marker>
          ))}
        </defs>

        {/* Conexões */}
        <Arrow marker={m} d="M220 95 H298" on={s.SE + s.SS > 0} label="SE, SS" lx={259} ly={86} />
        <Arrow marker={m} d="M125 40 V16 H695 V38" on={s.P + s.PS > 0} label="P, PS (passagem confirmada)" lx={410} ly={11} />
        <Arrow marker={m} d="M220 330 H256 V160 H298" on={s.M + s.CS > 0} label="M, CS" lx={238} ly={322} />
        <Arrow marker={m} d="M125 420 V452 H560 V170 H588" on={s.CE + s.R > 0} label="CE, R" lx={340} ly={446} />
        <Arrow marker={m} d="M510 115 H588" on={combOn} label="AUT_E, AUT_S" lx={549} ly={106} />
        <Arrow marker={m} d="M800 105 H878" on={actOn} label="abrir / fechar" lx={839} ly={96} />
        <Arrow marker={m} d="M880 165 H802" on={actOn} label="fim de curso" lx={841} ly={182} dashed />
        <Arrow marker={m} d="M705 190 V288" on={s.recentCount} label="INC / DEC" lx={745} ly={244} />
        <Arrow marker={m} d="M800 345 H878" on={s.count > 0} label="Q3..Q0" lx={839} ly={336} />
        <Arrow marker={m} d="M590 345 H512" on={s.count > 0} label="ocupadas" lx={551} ly={336} dashed />
        <Arrow marker={m} d="M640 190 V250 H470 V288" on={s.res > 0} label="reservas" lx={555} ly={244} dashed />
        <Arrow marker={m} d="M400 290 V192" on={s.L === 1} label="L (realimentação)" lx={350} ly={242} dashed />

        {/* Blocos */}
        <Block x={30} y={40} w={190} h={150} title="SENSORES DIGITAIS" on={sensorsOn} accent="#facc15" lines={[`SE = ${s.SE}   SS = ${s.SS}`, `P  = ${s.P}   PS = ${s.PS}`, 'laços indutivos', 'barreiras ópticas']} />
        <Block x={30} y={270} w={190} h={150} title="COMANDOS" on={cmdOn} accent="#facc15" lines={[`CE = ${s.CE}   CS = ${s.CS}`, `M  = ${s.M}   R  = ${s.R}`, 'painel do operador', 'modo automático']} />
        <Block x={300} y={40} w={210} h={150} title="LÓGICA COMBINACIONAL" on={combOn} lines={[`SE·L̄·M̄ = ${s.ENTRADA_AUTORIZADA}`, `SS·CS  = ${s.SAIDA_AUTORIZADA}`, 'portas AND / NOT', 'saída imediata']} />
        <Block x={300} y={290} w={210} h={110} title="COMPARADOR (≥ 8)" on={s.L === 1} accent="#ef4444" lines={[`ocup ${s.occ} + res ${s.res}`, `L = ${s.L}`]} />
        <Block x={590} y={40} w={210} h={150} title="MÁQUINAS DE ESTADOS" on={fsmOn} lines={[`E: ${s.entry}`.slice(0, 24), `S: ${s.exit}`.slice(0, 24), 'circuito sequencial', 'temporizadores']} />
        <Block x={590} y={290} w={210} h={110} title="CONTADOR 4 BITS" on={s.recentCount} lines={[`Q3..Q0 = ${s.bits}`, `decimal = ${s.count}`]} />
        <Block x={880} y={40} w={190} h={150} title="ATUADORES" on={actOn} accent="#22c55e" lines={[`entrada: ${s.gE}`, `saída:   ${s.gX}`, 'motores das cancelas', 'semáforos']} />
        <Block x={880} y={290} w={190} h={110} title="DECODIF. + DISPLAY" on={s.count > 0} accent="#ef4444" lines={['BCD → 7 segmentos', `exibe: ${s.count}`]} />
      </svg>
    </div>
  )
}
