import type { Bit } from '../logic/gates'
import type { CounterState } from '../logic/counter'
import type { EntryEvent, EntryState, ExitEvent, ExitState } from '../fsm/fsm'
import type { Polyline, Pose } from './geometry'

export type VehiclePhase =
  | 'APPROACHING'
  | 'WAITING'
  | 'ENTERING'
  | 'MOVING_TO_SPOT'
  | 'PARKING'
  | 'PARKED'
  | 'LEAVING_SPOT'
  | 'MOVING_TO_EXIT'
  | 'EXITING'
  | 'REJECTED'
  | 'COMPLETED'

export type ArrivalTag =
  | 'QUEUE_SLOT'
  | 'ENTRY_STOP'
  | 'HOLD'
  | 'PARKED'
  | 'EXIT_STOP'
  | 'REJECT_STOP'
  | 'REJECT_CLEAR'
  | 'GONE'

/** Trecho de trajetória percorrido em um único sentido (frente ou ré). */
export interface Leg {
  readonly line: Polyline
  readonly reverse: boolean
  /** Se verdadeiro, o veículo desacelera até parar no final do trecho. */
  readonly stopAtEnd: boolean
  readonly maxSpeed: number
  readonly phase: VehiclePhase
  readonly tag?: ArrivalTag
}

export type CarModel = 'sedan' | 'hatch' | 'suv'

export interface Vehicle {
  readonly id: string
  readonly label: string
  readonly plate: string
  readonly color: string
  readonly model: CarModel
  phase: VehiclePhase
  pose: Pose
  velocity: number
  /** Distância percorrida com sinal (ré negativa) — gira as rodas. */
  odometer: number
  legs: Leg[]
  legIndex: number
  legDist: number
  /** Último ponto de parada alcançado. */
  stopTag: ArrivalTag | null
  /** Vaga reservada ou ocupada pelo veículo. */
  spotId: string | null
  /** Posição na fila de aproximação (0 = parado no sensor de entrada). */
  queueSlot: number | null
  exitRequested: boolean
  holdsAisle: boolean
  createdAt: number
  parkedAt: number | null
}

export type SpotStatus = 'FREE' | 'RESERVED' | 'OCCUPIED'

export interface Spot {
  readonly id: string
  readonly index: number
  readonly row: 'top' | 'bottom'
  readonly x: number
  readonly z: number
  /** Orientação do veículo estacionado (de frente para o fundo da vaga). */
  readonly heading: number
  status: SpotStatus
  vehicleId: string | null
}

export type GatePhase = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING'
export type GateDisplayState = GatePhase | 'BLOCKED'

export interface GateState {
  phase: GatePhase
  /** 0 = fechada (haste horizontal), 1 = totalmente aberta. */
  angle: number
}

export interface Signals {
  SE: Bit
  SS: Bit
  L: Bit
  M: Bit
  P: Bit
  PS: Bit
  R: Bit
  CE: Bit
  CS: Bit
  ENTRADA_AUTORIZADA: Bit
  SAIDA_AUTORIZADA: Bit
}

export type SignalName = keyof Signals

export interface FsmTransitionRecord<S extends string, E extends string> {
  from: S
  to: S
  event: E
  at: number
  wall: number
}

export interface EntryDecision {
  SE: Bit
  L: Bit
  M: Bit
  result: Bit
  vehicleId: string
  spotId: string | null
  reason: string
  wall: number
}

export interface EntryController {
  state: EntryState
  since: number
  vehicleId: string | null
  passDispatched: boolean
  rejectDispatched: boolean
  lastDecision: EntryDecision | null
  history: FsmTransitionRecord<EntryState, EntryEvent>[]
}

export interface ExitController {
  state: ExitState
  since: number
  vehicleId: string | null
  passDispatched: boolean
  history: FsmTransitionRecord<ExitState, ExitEvent>[]
}

export type EventLevel = 'info' | 'success' | 'warning' | 'danger' | 'logic'

export interface LogEvent {
  id: number
  wall: number
  simTime: number
  level: EventLevel
  message: string
}

export interface Notice {
  id: number
  level: EventLevel
  text: string
}

export interface AutoConfig {
  enabled: boolean
  /** Intervalo médio entre chegadas (s de simulação). */
  arrivalInterval: number
  /** Intervalo médio entre saídas (s de simulação). */
  departureInterval: number
  nextArrival: number
  nextDeparture: number
  seed: number
}

export interface Stats {
  entered: number
  exited: number
  denied: number
}

export interface SimState {
  /** Incrementado a cada reinicialização: invalida qualquer referência antiga. */
  epoch: number
  simTime: number
  paused: boolean
  speed: number
  maintenance: boolean
  vehicles: Vehicle[]
  spots: Spot[]
  gates: { entry: GateState; exit: GateState }
  entry: EntryController
  exit: ExitController
  counter: CounterState
  counterChangedAt: number
  signals: Signals
  pulses: { R: number; CE: number }
  /** Veículos na via de acesso aguardando a vez (ordem FIFO). */
  entryQueue: string[]
  /** Veículo que segue para / está no sensor de entrada. */
  entryTarget: string | null
  /** Chegadas solicitadas aguardando espaço livre no início da via. */
  pendingArrivals: number
  /** Pedidos de saída aguardando (FIFO). */
  exitQueue: string[]
  /** Exclusão mútua do corredor interno: id do veículo que o utiliza. */
  aisleLock: string | null
  auto: AutoConfig
  events: LogEvent[]
  eventSeq: number
  notice: Notice | null
  nextVehicleNumber: number
  stats: Stats
}
