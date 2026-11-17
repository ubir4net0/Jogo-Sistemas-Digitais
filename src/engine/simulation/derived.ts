/** Valores derivados (funções puras) consumidos pela interface e pela cena 3D. */
import { CAPACITY, counterValue } from '../logic/counter'
import { systemBusy } from '../logic/authorization'
import { toBit } from '../logic/gates'
import { occupiedCount, reservedCount } from './engine'
import type { GateDisplayState, SimState, VehiclePhase } from './types'

export type SystemStatus = 'AVAILABLE' | 'FULL' | 'BUSY' | 'STOPPED'

export function systemStatus(s: SimState): SystemStatus {
  if (s.paused) return 'STOPPED'
  if (occupiedCount(s) + reservedCount(s) >= CAPACITY) return 'FULL'
  const busy = systemBusy(toBit(s.entry.state !== 'IDLE'), toBit(s.exit.state !== 'IDLE'))
  if (busy === 1) return 'BUSY'
  return 'AVAILABLE'
}

export const STATUS_META: Record<SystemStatus, { label: string; tone: 'green' | 'red' | 'yellow' | 'gray'; hint: string }> = {
  AVAILABLE: { label: 'Disponível', tone: 'green', hint: 'Há vagas e nenhuma operação em curso.' },
  FULL: { label: 'Lotado', tone: 'red', hint: 'Ocupadas + reservadas = 8. Entradas são negadas (L = 1).' },
  BUSY: { label: 'Operação em andamento', tone: 'yellow', hint: 'Uma máquina de estados está fora de IDLE.' },
  STOPPED: { label: 'Sistema parado', tone: 'gray', hint: 'Simulação pausada.' },
}

export function gateDisplay(s: SimState, which: 'entry' | 'exit'): GateDisplayState {
  const g = s.gates[which]
  if (which === 'entry' && g.phase === 'CLOSED' && (s.maintenance || s.signals.L === 1)) return 'BLOCKED'
  return g.phase
}

export const GATE_LABEL: Record<GateDisplayState, string> = {
  CLOSED: 'Fechada',
  OPENING: 'Abrindo',
  OPEN: 'Aberta',
  CLOSING: 'Fechando',
  BLOCKED: 'Bloqueada',
}

export const PHASE_LABEL: Record<VehiclePhase, string> = {
  APPROACHING: 'Aproximando',
  WAITING: 'Aguardando',
  ENTERING: 'Entrando',
  MOVING_TO_SPOT: 'Indo para a vaga',
  PARKING: 'Estacionando',
  PARKED: 'Estacionado',
  LEAVING_SPOT: 'Saindo da vaga',
  MOVING_TO_EXIT: 'Indo para a saída',
  EXITING: 'Saindo',
  REJECTED: 'Retornando (recusado)',
  COMPLETED: 'Concluído',
}

export type LightColor = 'red' | 'yellow' | 'green'

export function entryLight(s: SimState): LightColor {
  switch (s.entry.state) {
    case 'GATE_OPEN':
    case 'VEHICLE_PASSING':
      return 'green'
    case 'VEHICLE_DETECTED':
    case 'CHECKING_CAPACITY':
    case 'ACCESS_GRANTED':
    case 'GATE_OPENING':
      return 'yellow'
    default:
      return 'red'
  }
}

export function exitLight(s: SimState): LightColor {
  switch (s.exit.state) {
    case 'GATE_OPEN':
    case 'VEHICLE_PASSING':
      return 'green'
    case 'VEHICLE_DETECTED':
    case 'CHECKING':
    case 'ACCESS_GRANTED':
    case 'GATE_OPENING':
      return 'yellow'
    default:
      return 'red'
  }
}

export interface Kpis {
  total: number
  occupied: number
  reserved: number
  free: number
  percent: number
  moving: number
  waiting: number
  counter: number
}

export function kpis(s: SimState): Kpis {
  const occupied = occupiedCount(s)
  const reserved = reservedCount(s)
  const moving = s.vehicles.filter((v) => v.legs.length > 0 && v.phase !== 'PARKED').length
  return {
    total: CAPACITY,
    occupied,
    reserved,
    free: CAPACITY - occupied - reserved,
    percent: Math.round((occupied / CAPACITY) * 100),
    moving,
    waiting: s.entryQueue.length + s.pendingArrivals,
    counter: counterValue(s.counter),
  }
}

export function formatClock(wall: number): string {
  const d = new Date(wall)
  return d.toLocaleTimeString('pt-BR', { hour12: false })
}
