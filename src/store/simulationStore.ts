/**
 * Store central (Zustand) — envolve o motor puro e expõe comandos para a UI.
 * Este é o ÚNICO lugar onde o estado da simulação é armazenado.
 */
import { create } from 'zustand'
import {
  clearNotice,
  createInitialState,
  requestEntry,
  requestExit,
  resetSimulation,
  setAuto,
  setAutoConfig,
  setMaintenance,
  setPaused,
  setSpeed,
  tick,
} from '../engine/simulation/engine'
import { scenarioById, type ScenarioId } from '../engine/simulation/scenarios'
import type { SimState } from '../engine/simulation/types'

interface SimulationStore {
  sim: SimState
  activeScenario: ScenarioId | null
  tick: (realDt: number) => void
  addVehicle: () => void
  removeVehicle: (vehicleId: string | null) => void
  setMaintenance: (on: boolean) => void
  setPaused: (paused: boolean) => void
  setAuto: (enabled: boolean) => void
  setAutoConfig: (cfg: { arrivalInterval?: number; departureInterval?: number }) => void
  setSpeed: (speed: number) => void
  reset: () => void
  loadScenario: (id: ScenarioId) => void
  dismissNotice: (id: number) => void
}

export const useSimulation = create<SimulationStore>((set, get) => ({
  sim: createInitialState(),
  activeScenario: null,
  tick: (realDt) => {
    const cur = get().sim
    const next = tick(cur, realDt, Date.now())
    if (next !== cur) set({ sim: next })
  },
  addVehicle: () => set((s) => ({ sim: requestEntry(s.sim, Date.now()) })),
  removeVehicle: (id) => set((s) => ({ sim: requestExit(s.sim, id, Date.now()) })),
  setMaintenance: (on) => set((s) => ({ sim: setMaintenance(s.sim, on, Date.now()) })),
  setPaused: (p) => set((s) => ({ sim: setPaused(s.sim, p, Date.now()) })),
  setAuto: (on) => set((s) => ({ sim: setAuto(s.sim, on, Date.now()) })),
  setAutoConfig: (cfg) => set((s) => ({ sim: setAutoConfig(s.sim, cfg) })),
  setSpeed: (speed) => set((s) => ({ sim: setSpeed(s.sim, speed) })),
  reset: () => set((s) => ({ sim: resetSimulation(s.sim, Date.now()), activeScenario: null })),
  loadScenario: (id) =>
    set((s) => ({ sim: scenarioById(id).apply(s.sim, Date.now()), activeScenario: id })),
  dismissNotice: (id) => set((s) => ({ sim: clearNotice(s.sim, id) })),
}))

/** Acesso não reativo (usado dentro de useFrame, sem re-renderizar o React). */
export const getSim = (): SimState => useSimulation.getState().sim
