import { useShallow } from 'zustand/react/shallow'
import {
  Bot,
  CarFront,
  Clapperboard,
  Construction,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  SquareParking,
} from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { useUi } from '../../store/uiStore'
import { MAX_QUEUE } from '../../engine/simulation/layout'
import { SCENARIOS } from '../../engine/simulation/scenarios'
import type { SpotStatus } from '../../engine/simulation/types'
import { Button, Panel, Segmented, cx } from '../ui/primitives'

export function ControlsPanel() {
  const paused = useSimulation((s) => s.sim.paused)
  const maintenance = useSimulation((s) => s.sim.maintenance)
  const auto = useSimulation((s) => s.sim.auto.enabled)
  const speed = useSimulation((s) => s.sim.speed)
  const queueFull = useSimulation((s) => s.sim.pendingArrivals + s.sim.entryQueue.length >= MAX_QUEUE)
  const selection = useUi((s) => s.selection)
  const exitInfo = useSimulation(
    useShallow((s) => {
      const parked = s.sim.vehicles.filter((v) => v.phase === 'PARKED' && !v.exitRequested)
      const sel = selection?.kind === 'vehicle' ? parked.find((v) => v.id === selection.id) : undefined
      return { available: parked.length, selectedId: sel?.id ?? null, selectedLabel: sel?.label ?? null }
    }),
  )
  const a = useSimulation(
    useShallow((s) => ({
      add: s.addVehicle,
      remove: s.removeVehicle,
      setPaused: s.setPaused,
      setAuto: s.setAuto,
      setMaintenance: s.setMaintenance,
      reset: s.reset,
      setSpeed: s.setSpeed,
    })),
  )
  const select = useUi((s) => s.select)

  const addHint = paused ? 'Simulação pausada' : queueFull ? `Via de acesso cheia (máx. ${MAX_QUEUE})` : maintenance ? 'Será negado: manutenção (M = 1)' : null
  const exitHint = paused
    ? 'Simulação pausada'
    : exitInfo.available === 0
      ? 'Nenhum veículo estacionado disponível'
      : exitInfo.selectedLabel
        ? `Retirar ${exitInfo.selectedLabel}`
        : 'Sem seleção: retira o estacionado há mais tempo'

  return (
    <Panel title="Controles do operador" icon={<SlidersHorizontal className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" icon={<CarFront className="h-4 w-4" />} onClick={a.add} disabled={paused || queueFull} title={addHint ?? 'Simula a chegada de um veículo ao sensor de entrada'}>
          Adicionar veículo
        </Button>
        <Button
          variant="danger"
          icon={<LogOut className="h-4 w-4" />}
          onClick={() => {
            a.remove(exitInfo.selectedId)
            if (exitInfo.selectedId) select(null)
          }}
          disabled={paused || exitInfo.available === 0}
          title={exitHint}
        >
          Retirar veículo
        </Button>
        <Button variant={auto ? 'primary' : 'secondary'} icon={<Bot className="h-4 w-4" />} onClick={() => a.setAuto(!auto)} active={auto} aria-pressed={auto}>
          {auto ? 'Parar automático' : 'Modo automático'}
        </Button>
        <Button variant={paused ? 'success' : 'secondary'} icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={() => a.setPaused(!paused)} aria-pressed={paused}>
          {paused ? 'Continuar' : 'Pausar'}
        </Button>
        <Button variant={maintenance ? 'warning' : 'secondary'} icon={<Construction className="h-4 w-4" />} onClick={() => a.setMaintenance(!maintenance)} active={maintenance} aria-pressed={maintenance}>
          {maintenance ? 'Desativar manutenção' : 'Modo manutenção'}
        </Button>
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            a.reset()
            select(null)
          }}
        >
          Reiniciar sistema
        </Button>
      </div>
      <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
        {addHint && <p>• Entrada: {addHint}</p>}
        <p>• Saída: {exitHint}</p>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Velocidade da simulação</div>
        <Segmented
          ariaLabel="Velocidade da simulação"
          value={speed}
          onChange={a.setSpeed}
          options={[
            { value: 0.5, label: '0,5×' },
            { value: 1, label: '1×' },
            { value: 2, label: '2×' },
            { value: 4, label: '4×' },
          ]}
        />
      </div>
      <AutoConfig />
    </Panel>
  )
}

function AutoConfig() {
  const auto = useSimulation(useShallow((s) => ({ enabled: s.sim.auto.enabled, arrival: s.sim.auto.arrivalInterval, departure: s.sim.auto.departureInterval })))
  const setCfg = useSimulation((s) => s.setAutoConfig)
  return (
    <div className={cx('mt-4 rounded-xl border p-3 transition-colors', auto.enabled ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-700/50 bg-graphite-900/50')}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Modo automático — intervalos médios</div>
      {(
        [
          ['Chegadas', 'arrivalInterval', auto.arrival, 2, 20],
          ['Saídas', 'departureInterval', auto.departure, 3, 30],
        ] as const
      ).map(([label, key, value, min, max]) => (
        <label key={key} className="mb-1 block">
          <div className="flex justify-between text-xs text-slate-300">
            <span>{label}</span>
            <span className="font-mono text-sky-300">{value.toFixed(0)} s</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => setCfg({ [key]: Number(e.target.value) })}
            className="w-full accent-sky-500"
            aria-label={`Intervalo médio de ${label.toLowerCase()}`}
          />
        </label>
      ))}
      <p className="text-[11px] text-slate-500">Chegadas só são geradas quando existe vaga prevista — o automático nunca ultrapassa a capacidade.</p>
    </div>
  )
}

const SPOT_STYLE: Record<SpotStatus, string> = {
  FREE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  RESERVED: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-100',
  OCCUPIED: 'border-red-500/45 bg-red-500/15 text-red-100',
}
const SPOT_TEXT: Record<SpotStatus, string> = { FREE: 'Livre', RESERVED: 'Reservada', OCCUPIED: 'Ocupada' }

export function SpotMap() {
  const spots = useSimulation((s) => s.sim.spots)
  const vehicles = useSimulation(useShallow((s) => s.sim.vehicles.map((v) => `${v.id}|${v.label}|${v.exitRequested ? 1 : 0}|${v.phase}`)))
  const selection = useUi((s) => s.selection)
  const select = useUi((s) => s.select)
  const info = new Map(vehicles.map((x) => {
    const [id, label, req, phase] = x.split('|')
    return [id, { label, requested: req === '1', phase }] as const
  }))
  return (
    <Panel title="Mapa de vagas" icon={<SquareParking className="h-4 w-4" />}>
      <div className="grid grid-cols-4 gap-2">
        {spots.map((sp) => {
          const v = sp.vehicleId ? info.get(sp.vehicleId) : undefined
          const isSel = (selection?.kind === 'vehicle' && selection.id === sp.vehicleId) || (selection?.kind === 'spot' && selection.id === sp.id)
          const leaving = v && (v.requested || v.phase !== 'PARKED') && sp.status === 'OCCUPIED'
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => (sp.vehicleId ? select({ kind: 'vehicle', id: sp.vehicleId }) : select({ kind: 'spot', id: sp.id }))}
              className={cx('rounded-xl border px-1.5 py-2 text-center transition-all hover:brightness-125', SPOT_STYLE[sp.status], isSel && 'ring-2 ring-sky-400')}
              aria-label={`Vaga ${sp.id}: ${SPOT_TEXT[sp.status]}${v ? `, ${v.label}` : ''}`}
            >
              <div className="font-mono text-sm font-bold">{sp.id}</div>
              <div className="text-[10px] opacity-80">{leaving ? 'Saindo' : SPOT_TEXT[sp.status]}</div>
              <div className="truncate font-mono text-[9.5px] opacity-70">{v?.label ?? '—'}</div>
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-wider text-slate-600">↑ fundo · corredor · rua ↓</div>
    </Panel>
  )
}

export function ScenariosPanel() {
  const active = useSimulation((s) => s.activeScenario)
  const load = useSimulation((s) => s.loadScenario)
  const setTab = useUi((s) => s.setTab)
  const select = useUi((s) => s.select)
  const setCamera = useUi((s) => s.setCamera)
  return (
    <Panel title="Cenários de demonstração" icon={<Clapperboard className="h-4 w-4" />}>
      <div className="space-y-2">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => {
              select(null)
              load(sc.id)
              if (sc.focus === 'lab') setTab('lab')
              else if (sc.id === 'entry' || sc.id === 'full' || sc.id === 'maintenance') setCamera('entry')
              else if (sc.id === 'exit') setCamera('iso')
            }}
            className={cx(
              'group flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-colors',
              active === sc.id ? 'border-sky-400/60 bg-sky-500/10' : 'border-slate-700/50 bg-graphite-900/50 hover:border-slate-500/60 hover:bg-graphite-800',
            )}
          >
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold', active === sc.id ? 'bg-sky-500 text-white' : 'bg-graphite-700 text-slate-300')}>{sc.number}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-100">{sc.title}</span>
              <span className="block text-[11.5px] leading-snug text-slate-400">{sc.description}</span>
              <span className="mt-0.5 block font-mono text-[10.5px] leading-snug text-sky-300/80">{sc.expected}</span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  )
}
