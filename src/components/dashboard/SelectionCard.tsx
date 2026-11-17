/** Informações do veículo ou vaga selecionados (via clique na cena 3D ou no mapa). */
import { useShallow } from 'zustand/react/shallow'
import { Car, LogOut, MapPin, X } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { useUi } from '../../store/uiStore'
import { PHASE_LABEL } from '../../engine/simulation/derived'
import { Button, Pill, cx } from '../ui/primitives'

const STATUS_TONE = { FREE: 'green', RESERVED: 'yellow', OCCUPIED: 'red' } as const
const STATUS_LABEL = { FREE: 'Livre', RESERVED: 'Reservada', OCCUPIED: 'Ocupada' } as const

export function SelectionCard({ floating }: { floating?: boolean }) {
  const selection = useUi((s) => s.selection)
  const select = useUi((s) => s.select)
  const removeVehicle = useSimulation((s) => s.removeVehicle)
  const paused = useSimulation((s) => s.sim.paused)

  const vehicle = useSimulation(
    useShallow((s) => {
      if (selection?.kind !== 'vehicle') return null
      const v = s.sim.vehicles.find((x) => x.id === selection.id)
      return v ? { id: v.id, label: v.label, plate: v.plate, color: v.color, model: v.model, phase: v.phase, spotId: v.spotId, exitRequested: v.exitRequested } : null
    }),
  )
  const spot = useSimulation(
    useShallow((s) => {
      const id = selection?.kind === 'spot' ? selection.id : vehicle?.spotId
      const sp = id ? s.sim.spots.find((x) => x.id === id) : null
      return sp ? { id: sp.id, status: sp.status } : null
    }),
  )

  if (!selection || (selection.kind === 'vehicle' && !vehicle)) return null

  const canExit = vehicle && vehicle.phase === 'PARKED' && !vehicle.exitRequested && !paused
  return (
    <div className={cx('rounded-2xl border border-sky-500/30 p-3', floating ? 'glass shadow-2xl shadow-black/50' : 'bg-graphite-900/70')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10" style={{ background: vehicle ? `${vehicle.color}33` : 'rgba(56,189,248,0.12)' }}>
          {vehicle ? <Car className="h-5 w-5" style={{ color: vehicle.color === '#1f2937' ? '#cbd5e1' : vehicle.color }} /> : <MapPin className="h-5 w-5 text-sky-300" />}
        </div>
        <div className="min-w-0 flex-1">
          {vehicle ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{vehicle.label}</span>
                <span className="rounded border border-slate-500 bg-slate-100 px-1.5 font-mono text-[11px] font-bold text-slate-900">{vehicle.plate}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {PHASE_LABEL[vehicle.phase]} · modelo {vehicle.model} · vaga <span className="font-mono text-slate-200">{vehicle.spotId ?? '—'}</span>
              </div>
            </>
          ) : (
            spot && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Vaga {spot.id}</span>
                  <Pill tone={STATUS_TONE[spot.status]}>{STATUS_LABEL[spot.status]}</Pill>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{spot.status === 'FREE' ? 'Disponível para a próxima entrada autorizada.' : 'Reservada para um veículo em manobra de entrada.'}</div>
              </>
            )
          )}
        </div>
        <button type="button" onClick={() => select(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Fechar seleção">
          <X className="h-4 w-4" />
        </button>
      </div>
      {vehicle && (
        <div className="mt-3">
          <Button variant="danger" className="w-full" icon={<LogOut className="h-4 w-4" />} disabled={!canExit} onClick={() => removeVehicle(vehicle.id)}>
            {vehicle.exitRequested ? 'Saída já solicitada' : 'Solicitar saída'}
          </Button>
          {!canExit && !vehicle.exitRequested && (
            <p className="mt-1.5 text-center text-[11px] text-slate-500">
              {paused ? 'Simulação pausada.' : 'Disponível quando o veículo estiver estacionado.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
