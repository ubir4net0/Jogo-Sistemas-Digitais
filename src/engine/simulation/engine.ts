/**
 * SimulationEngine — motor determinístico da simulação.
 *
 * Princípios:
 *  • Fonte única de verdade: `SimState` contém veículos, vagas, sensores,
 *    cancelas, contador e as duas máquinas de estados.
 *  • Estado imutável: toda ação é uma função pura (estado, entrada) → estado.
 *  • Tempo único: todo movimento, temporizador e animação de cancela avança
 *    apenas dentro de `tick(dt)`. Não há setTimeout — por isso um reset ou uma
 *    pausa nunca deixam "callbacks antigos" alterando o estado novo.
 *  • A camada 3D apenas LÊ a pose de cada veículo; não decide regras.
 */
import { castDraft, produce, type Draft } from 'immer'
import { toBit, type Bit } from '../logic/gates'
import { capacityFull, entryAuthorized, exitAuthorized, explainEntryDecision } from '../logic/authorization'
import {
  CAPACITY,
  bitsToString,
  counterDecrement,
  counterIncrement,
  counterValue,
  initialCounter,
} from '../logic/counter'
import { ENTRY_FSM, EXIT_FSM, nextState, type EntryEvent, type ExitEvent } from '../fsm/fsm'
import { bodyCorners, boundsOf, normalizeAngle, pointAt, rectsOverlap, tangentAt } from './geometry'
import {
  CAR_LENGTH,
  CAR_WIDTH,
  MAX_QUEUE,
  SENSOR_ZONES,
  SPAWN_CLEAR_X,
  SPAWN_POSE,
  STREET,
  approachStopLeg,
  createSpots,
  entryPassLeg,
  exitPassLegs,
  leaveSpotLegs,
  queueLeg,
  rejectLegs,
  toSpotLegs,
} from './layout'
import type {
  ArrivalTag,
  CarModel,
  EventLevel,
  GateState,
  Leg,
  SimState,
  Signals,
  Spot,
  Vehicle,
} from './types'

type D = Draft<SimState>
type DV = Draft<Vehicle>

export const SUBSTEP = 1 / 60
export const MAX_FRAME_DT = 0.25
export const MAX_EVENTS = 150
const MAX_HISTORY = 14

export const ACCEL = 2.6
export const DECEL = 3.0
const MIN_CREEP = 0.35
/** Velocidade angular da cancela: abre/fecha em ~1,3 s. */
export const GATE_RATE = 1 / 1.3

/** Temporizadores das máquinas de estados (segundos de simulação). */
export const DWELL = {
  detected: 0.6,
  checking: 0.9,
  granted: 0.6,
  denied: 1.5,
  completed: 0.9,
  exitDetected: 0.5,
  exitChecking: 0.8,
  exitGranted: 0.5,
  exitCompleted: 0.7,
} as const

const PALETTE = ['#e23d3d', '#2f6fed', '#f1f5f9', '#f2b705', '#17a673', '#ff7a1a', '#7c8794', '#1f2937', '#8b5cf6', '#0ea5e9']
const MODELS: CarModel[] = ['sedan', 'hatch', 'suv']
const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

export interface InitOptions {
  epoch?: number
  speed?: number
  seed?: number
}

export function emptySignals(): Signals {
  return { SE: 0, SS: 0, L: 0, M: 0, P: 0, PS: 0, R: 0, CE: 0, CS: 0, ENTRADA_AUTORIZADA: 0, SAIDA_AUTORIZADA: 0 }
}

export function createInitialState(opts: InitOptions = {}): SimState {
  return {
    epoch: opts.epoch ?? 0,
    simTime: 0,
    paused: false,
    speed: opts.speed ?? 1,
    maintenance: false,
    vehicles: [],
    spots: createSpots(),
    gates: { entry: { phase: 'CLOSED', angle: 0 }, exit: { phase: 'CLOSED', angle: 0 } },
    entry: {
      state: 'IDLE',
      since: 0,
      vehicleId: null,
      passDispatched: false,
      rejectDispatched: false,
      lastDecision: null,
      history: [],
    },
    exit: { state: 'IDLE', since: 0, vehicleId: null, passDispatched: false, history: [] },
    counter: initialCounter(0),
    counterChangedAt: -1,
    signals: emptySignals(),
    pulses: { R: -1, CE: -1 },
    entryQueue: [],
    entryTarget: null,
    pendingArrivals: 0,
    exitQueue: [],
    aisleLock: null,
    auto: {
      enabled: false,
      arrivalInterval: 6,
      departureInterval: 9,
      nextArrival: 0,
      nextDeparture: 0,
      seed: opts.seed ?? 20261117,
    },
    events: [],
    eventSeq: 0,
    notice: null,
    nextVehicleNumber: 1,
    stats: { entered: 0, exited: 0, denied: 0 },
  }
}

// ───────────────────────────── utilidades ─────────────────────────────

function log(d: D, level: EventLevel, message: string, now: number): void {
  d.eventSeq += 1
  d.events.unshift({ id: d.eventSeq, wall: now, simTime: d.simTime, level, message })
  if (d.events.length > MAX_EVENTS) d.events.length = MAX_EVENTS
}

function notify(d: D, level: EventLevel, text: string): void {
  d.eventSeq += 1
  d.notice = { id: d.eventSeq, level, text }
}

const findVehicle = (d: D, id: string | null): DV | undefined =>
  id === null ? undefined : d.vehicles.find((v) => v.id === id)

const findSpot = (d: D, id: string | null): Draft<Spot> | undefined =>
  id === null ? undefined : d.spots.find((s) => s.id === id)

export const occupiedCount = (s: { spots: readonly Spot[] }): number =>
  s.spots.reduce((n, sp) => n + (sp.status === 'OCCUPIED' ? 1 : 0), 0)

export const reservedCount = (s: { spots: readonly Spot[] }): number =>
  s.spots.reduce((n, sp) => n + (sp.status === 'RESERVED' ? 1 : 0), 0)

export const freeCount = (s: { spots: readonly Spot[] }): number => CAPACITY - occupiedCount(s) - reservedCount(s)

function rand(d: D): number {
  const a = (d.auto.seed + 0x6d2b79f5) | 0
  d.auto.seed = a
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function makePlate(n: number): string {
  const l = (i: number) => PLATE_LETTERS[i % PLATE_LETTERS.length]
  return `${l(n * 7 + 3)}${l(n * 13 + 5)}${l(n * 3 + 11)}${(n * 7) % 10}${l(n * 5 + 1)}${String((n * 37 + 11) % 100).padStart(2, '0')}`
}

function createVehicle(d: D, phase: Vehicle['phase'], pose: Vehicle['pose']): DV {
  const n = d.nextVehicleNumber
  d.nextVehicleNumber += 1
  const v: Vehicle = {
    id: `car-${d.epoch}-${n}`,
    label: `CAR-${String(n).padStart(3, '0')}`,
    plate: makePlate(n),
    color: PALETTE[(n - 1) % PALETTE.length],
    model: MODELS[(n * 2 + Math.floor(n / 3)) % MODELS.length],
    phase,
    pose: { ...pose },
    velocity: 0,
    odometer: 0,
    legs: [],
    legIndex: 0,
    legDist: 0,
    stopTag: null,
    spotId: null,
    queueSlot: null,
    exitRequested: false,
    holdsAisle: false,
    createdAt: d.simTime,
    parkedAt: null,
  }
  d.vehicles.push(castDraft(v))
  return d.vehicles[d.vehicles.length - 1]
}

function setLegs(v: DV, legs: Leg[]): void {
  v.legs = castDraft(legs)
  v.legIndex = 0
  v.legDist = 0
  v.stopTag = null
  if (legs.length) v.phase = legs[0].phase
}

const isStoppedAt = (v: DV | undefined, tag: ArrivalTag): boolean =>
  !!v && v.legs.length === 0 && v.stopTag === tag

function entryTransition(d: D, event: EntryEvent, now: number): boolean {
  const r = nextState(ENTRY_FSM, d.entry.state, event)
  if (!r.ok) return false
  d.entry.state = r.to
  d.entry.since = d.simTime
  d.entry.history.unshift({ from: r.from, to: r.to, event, at: d.simTime, wall: now })
  if (d.entry.history.length > MAX_HISTORY) d.entry.history.length = MAX_HISTORY
  return true
}

function exitTransition(d: D, event: ExitEvent, now: number): boolean {
  const r = nextState(EXIT_FSM, d.exit.state, event)
  if (!r.ok) return false
  d.exit.state = r.to
  d.exit.since = d.simTime
  d.exit.history.unshift({ from: r.from, to: r.to, event, at: d.simTime, wall: now })
  if (d.exit.history.length > MAX_HISTORY) d.exit.history.length = MAX_HISTORY
  return true
}

function acquireAisle(d: D, v: DV): boolean {
  if (d.aisleLock !== null && d.aisleLock !== v.id) return false
  d.aisleLock = v.id
  v.holdsAisle = true
  return true
}

function releaseAisle(d: D, v: DV): void {
  if (d.aisleLock === v.id) d.aisleLock = null
  v.holdsAisle = false
}

function applyCounter(d: D, dir: 'inc' | 'dec', now: number): void {
  const before = d.counter.bits
  const r = dir === 'inc' ? counterIncrement(d.counter) : counterDecrement(d.counter)
  if (!r.applied) {
    log(d, 'danger', `Pulso de ${dir === 'inc' ? 'incremento' : 'decremento'} bloqueado pela lógica de habilitação`, now)
    return
  }
  d.counter = castDraft(r.counter)
  d.counterChangedAt = d.simTime
  log(
    d,
    'logic',
    `Contador ${dir === 'inc' ? 'incrementado' : 'decrementado'}: ${bitsToString(before)} → ${bitsToString(r.counter.bits)} (${counterValue(r.counter)})`,
    now,
  )
}

// ───────────────────────────── sensores ─────────────────────────────

export function vehicleBounds(v: Pick<Vehicle, 'pose'>) {
  return boundsOf(bodyCorners(v.pose, CAR_LENGTH, CAR_WIDTH))
}

function zoneOccupied(vehicles: readonly Vehicle[], zone: keyof typeof SENSOR_ZONES): Bit {
  const z = SENSOR_ZONES[zone]
  for (const v of vehicles) if (rectsOverlap(vehicleBounds(v), z)) return 1
  return 0
}

/** Calcula todos os sinais digitais a partir do estado físico atual. */
export function computeSignals(s: SimState): Signals {
  const SE = zoneOccupied(s.vehicles, 'SE')
  const SS = zoneOccupied(s.vehicles, 'SS')
  const P = zoneOccupied(s.vehicles, 'P')
  const PS = zoneOccupied(s.vehicles, 'PS')
  const L = capacityFull(occupiedCount(s), reservedCount(s))
  const M = toBit(s.maintenance)
  const CS = toBit(s.exit.vehicleId !== null)
  const R = toBit(s.simTime < s.pulses.R)
  const CE = toBit(s.simTime < s.pulses.CE)
  return {
    SE,
    SS,
    L,
    M,
    P,
    PS,
    R,
    CE,
    CS,
    ENTRADA_AUTORIZADA: entryAuthorized({ SE, L, M }),
    SAIDA_AUTORIZADA: exitAuthorized({ SS, CS }),
  }
}

// ───────────────────────────── movimento ─────────────────────────────

function sampleLeg(leg: Leg, d: number): Vehicle['pose'] {
  const p = pointAt(leg.line, d)
  const t = tangentAt(leg.line, d)
  return { x: p.x, z: p.z, heading: normalizeAngle(leg.reverse ? t + Math.PI : t) }
}

interface Arrival {
  id: string
  tag: ArrivalTag
}

function advanceVehicle(v: DV, dt: number, arrivals: Arrival[]): void {
  if (v.legIndex >= v.legs.length) {
    v.velocity = 0
    return
  }
  const legs = v.legs as Leg[]
  const leg = legs[v.legIndex]
  let toStop = leg.line.length - v.legDist
  if (!leg.stopAtEnd) {
    for (let j = v.legIndex + 1; j < legs.length; j++) {
      toStop += legs[j].line.length
      if (legs[j].stopAtEnd) break
    }
  }
  const target = Math.min(leg.maxSpeed, Math.sqrt(2 * DECEL * Math.max(0, toStop)))
  v.velocity = v.velocity < target ? Math.min(target, v.velocity + ACCEL * dt) : target
  v.velocity = Math.max(v.velocity, MIN_CREEP)

  let step = v.velocity * dt
  let lastLeg = leg
  while (step > 0 && v.legIndex < legs.length) {
    const cur = legs[v.legIndex]
    lastLeg = cur
    v.phase = cur.phase
    const left = cur.line.length - v.legDist
    const sign = cur.reverse ? -1 : 1
    if (step < left) {
      v.legDist += step
      v.odometer += step * sign
      step = 0
    } else {
      v.legDist = cur.line.length
      v.odometer += left * sign
      step -= left
      if (cur.tag) arrivals.push({ id: v.id, tag: cur.tag })
      if (cur.stopAtEnd) {
        v.velocity = 0
        step = 0
      }
      if (v.legIndex + 1 < legs.length) {
        v.legIndex += 1
        v.legDist = 0
      } else {
        v.legIndex = legs.length
      }
      if (cur.stopAtEnd) break
    }
  }

  if (v.legIndex < legs.length) {
    v.pose = sampleLeg(legs[v.legIndex], v.legDist)
  } else {
    v.pose = sampleLeg(lastLeg, lastLeg.line.length)
    v.legs = []
    v.legIndex = 0
    v.legDist = 0
    v.velocity = 0
  }
}

function handleArrival(d: D, a: Arrival, now: number, removed: Set<string>): void {
  const v = findVehicle(d, a.id)
  if (!v) return
  switch (a.tag) {
    case 'QUEUE_SLOT':
    case 'ENTRY_STOP':
    case 'HOLD':
    case 'REJECT_STOP':
      v.stopTag = a.tag
      if (v.legs.length === 0) v.phase = 'WAITING'
      break
    case 'PARKED': {
      v.stopTag = 'PARKED'
      v.phase = 'PARKED'
      v.parkedAt = d.simTime
      v.queueSlot = null
      const spot = findSpot(d, v.spotId)
      if (spot && spot.status === 'RESERVED' && spot.vehicleId === v.id) {
        spot.status = 'OCCUPIED'
        d.stats.entered += 1
        log(d, 'success', `${v.label} estacionou na vaga ${spot.id} — vaga OCUPADA`, now)
        applyCounter(d, 'inc', now)
        if (occupiedCount(d) === CAPACITY) log(d, 'danger', 'Estacionamento lotado (8/8) — L = 1', now)
      }
      releaseAisle(d, v)
      break
    }
    case 'EXIT_STOP':
      v.stopTag = 'EXIT_STOP'
      v.phase = 'WAITING'
      releaseAisle(d, v)
      break
    case 'REJECT_CLEAR':
      if (d.entry.state === 'ACCESS_DENIED' && d.entry.vehicleId === v.id) {
        entryTransition(d, 'VEHICLE_CLEARED', now)
        log(d, 'info', 'Área de entrada liberada — controlador de entrada em IDLE', now)
        d.entry.vehicleId = null
        d.entryTarget = null
        d.entry.rejectDispatched = false
      }
      break
    case 'GONE':
      v.phase = 'COMPLETED'
      removed.add(v.id)
      break
  }
}

// ───────────────────────────── despacho ─────────────────────────────

function spawnPending(d: D, now: number): void {
  if (d.pendingArrivals <= 0) return
  const blocked = d.vehicles.some(
    (v) => Math.abs(v.pose.z - STREET.farLaneZ) < 1.5 && v.pose.x < SPAWN_CLEAR_X,
  )
  if (blocked) return
  d.pendingArrivals -= 1
  const v = createVehicle(d, 'APPROACHING', SPAWN_POSE)
  d.entryQueue.push(v.id)
  log(d, 'info', `${v.label} (${v.plate}) chegou à via de acesso`, now)
}

function manageEntryQueue(d: D): void {
  if (d.entry.state === 'IDLE' && d.entryTarget === null && d.entryQueue.length > 0) {
    const id = d.entryQueue.shift() as string
    const v = findVehicle(d, id)
    if (v) {
      d.entryTarget = id
      v.queueSlot = 0
      setLegs(v, [approachStopLeg(v.pose.x)])
    }
  }
  d.entryQueue.forEach((id, i) => {
    const v = findVehicle(d, id)
    const slot = Math.min(i + 1, MAX_QUEUE)
    if (v && v.queueSlot !== slot) {
      v.queueSlot = slot
      setLegs(v, [queueLeg(v.pose.x, slot)])
    }
  })
}

function dispatchEntry(d: D, now: number): void {
  const v = findVehicle(d, d.entry.vehicleId)
  if (!v) return
  // Travessia da cancela: somente com a cancela totalmente aberta.
  if (d.entry.state === 'GATE_OPEN' && !d.entry.passDispatched && isStoppedAt(v, 'ENTRY_STOP')) {
    const spot = findSpot(d, v.spotId)
    if (!spot) return
    d.entry.passDispatched = true
    v.queueSlot = null
    if (acquireAisle(d, v)) {
      setLegs(v, [entryPassLeg(false), ...toSpotLegs(spot)])
    } else {
      setLegs(v, [entryPassLeg(true)])
      log(d, 'warning', `${v.label} aguardando corredor interno livre`, now)
    }
    return
  }
  // Espera interna: segue para a vaga quando o corredor estiver livre.
  if (isStoppedAt(v, 'HOLD') && d.aisleLock === null) {
    const spot = findSpot(d, v.spotId)
    if (spot && acquireAisle(d, v)) setLegs(v, toSpotLegs(spot))
  }
}

// ───────────────────────────── máquinas de estados ─────────────────────────────

function reserveSpot(d: D, v: DV): Draft<Spot> | undefined {
  const spot = d.spots.find((s) => s.status === 'FREE')
  if (!spot) return undefined
  spot.status = 'RESERVED'
  spot.vehicleId = v.id
  v.spotId = spot.id
  return spot
}

function stepEntryFsm(d: D, prev: Signals, now: number): void {
  const s = d.signals
  const t = d.simTime - d.entry.since
  const v = findVehicle(d, d.entry.vehicleId)
  const gate = d.gates.entry

  switch (d.entry.state) {
    case 'IDLE':
      if (prev.SE === 0 && s.SE === 1 && d.entryTarget !== null) {
        const target = findVehicle(d, d.entryTarget)
        entryTransition(d, 'SE_RISE', now)
        d.entry.vehicleId = d.entryTarget
        d.entry.passDispatched = false
        d.entry.rejectDispatched = false
        log(d, 'logic', `Sensor de entrada detectou ${target?.label ?? 'veículo'} (SE: 0 → 1)`, now)
      }
      break
    case 'VEHICLE_DETECTED':
      if (t >= DWELL.detected && entryTransition(d, 'CHECK', now)) {
        log(d, 'info', 'Verificação de capacidade iniciada', now)
      }
      break
    case 'CHECKING_CAPACITY':
      if (t >= DWELL.checking && v && isStoppedAt(v, 'ENTRY_STOP')) {
        const inputs = { SE: s.SE, L: s.L, M: s.M }
        const result = entryAuthorized(inputs)
        const reason = explainEntryDecision(inputs)
        let spotId: string | null = null
        if (result === 1) {
          const spot = reserveSpot(d, v)
          if (spot) {
            spotId = spot.id
            entryTransition(d, 'AUTH_OK', now)
            log(d, 'logic', `ENTRADA_AUTORIZADA = SE·L̄·M̄ = ${s.SE}·${1 - s.L}·${1 - s.M} = 1`, now)
            log(d, 'success', `Entrada autorizada — vaga ${spot.id} reservada para ${v.label}`, now)
          }
        }
        if (spotId === null) {
          entryTransition(d, 'AUTH_FAIL', now)
          d.stats.denied += 1
          log(d, 'logic', `ENTRADA_AUTORIZADA = SE·L̄·M̄ = ${s.SE}·${1 - s.L}·${1 - s.M} = 0`, now)
          log(d, 'danger', `${reason} (${v.label})`, now)
          notify(d, 'danger', reason)
        }
        d.entry.lastDecision = { ...inputs, result: spotId ? 1 : 0, vehicleId: v.id, spotId, reason, wall: now }
      }
      break
    case 'ACCESS_GRANTED':
      if (t >= DWELL.granted && entryTransition(d, 'OPEN_CMD', now)) {
        gate.phase = 'OPENING'
        log(d, 'info', 'Semáforo de entrada VERDE — comando de abertura da cancela', now)
      }
      break
    case 'ACCESS_DENIED':
      if (t >= DWELL.denied && !d.entry.rejectDispatched && v && isStoppedAt(v, 'ENTRY_STOP')) {
        d.entry.rejectDispatched = true
        v.queueSlot = null
        setLegs(v, rejectLegs())
        log(d, 'warning', `${v.label} orientado a retornar pela via`, now)
      }
      break
    case 'GATE_OPENING':
      if (gate.phase === 'OPEN' && entryTransition(d, 'GATE_OPENED', now)) {
        log(d, 'info', 'Cancela de entrada ABERTA', now)
      }
      break
    case 'GATE_OPEN':
      if (prev.P === 0 && s.P === 1 && entryTransition(d, 'P_RISE', now)) {
        log(d, 'logic', `${v?.label ?? 'Veículo'} atravessando a cancela (P: 0 → 1)`, now)
      }
      break
    case 'VEHICLE_PASSING':
      if (prev.P === 1 && s.P === 0 && entryTransition(d, 'P_FALL', now)) {
        gate.phase = 'CLOSING'
        log(d, 'logic', 'Passagem confirmada (P: 1 → 0) — fechando cancela de entrada', now)
      }
      break
    case 'GATE_CLOSING':
      if (prev.P === 0 && s.P === 1) {
        if (entryTransition(d, 'P_RISE', now)) {
          gate.phase = 'OPENING'
          log(d, 'warning', 'Obstáculo na passagem — cancela reaberta por segurança', now)
        }
      } else if (gate.phase === 'CLOSED' && entryTransition(d, 'GATE_CLOSED', now)) {
        log(d, 'info', `Cancela de entrada FECHADA — ${v?.label ?? 'veículo'} seguindo para a vaga`, now)
      }
      break
    case 'PARKING':
      if (v && v.phase === 'PARKED') entryTransition(d, 'PARKED', now)
      else if (!v) entryTransition(d, 'PARKED', now)
      break
    case 'COMPLETED':
      if (t >= DWELL.completed && entryTransition(d, 'DONE', now)) {
        d.entry.vehicleId = null
        d.entryTarget = null
        d.entry.passDispatched = false
      }
      break
  }
}

function stepExitFsm(d: D, prev: Signals, now: number): void {
  const s = d.signals
  const t = d.simTime - d.exit.since
  const gate = d.gates.exit
  const v = findVehicle(d, d.exit.vehicleId)

  switch (d.exit.state) {
    case 'IDLE': {
      while (d.exitQueue.length && d.aisleLock === null) {
        const id = d.exitQueue[0]
        const cand = findVehicle(d, id)
        if (!cand || cand.phase !== 'PARKED') {
          d.exitQueue.shift()
          continue
        }
        const spot = findSpot(d, cand.spotId)
        if (!spot) {
          d.exitQueue.shift()
          continue
        }
        d.exitQueue.shift()
        acquireAisle(d, cand)
        d.exit.vehicleId = cand.id
        d.exit.passDispatched = false
        setLegs(cand, leaveSpotLegs(spot))
        exitTransition(d, 'EXIT_START', now)
        log(d, 'info', `${cand.label} deixando a vaga ${spot.id} (CS = 1)`, now)
        break
      }
      break
    }
    case 'LEAVING_SPOT':
      if (prev.SS === 0 && s.SS === 1 && exitTransition(d, 'SS_RISE', now)) {
        log(d, 'logic', `Sensor de saída detectou ${v?.label ?? 'veículo'} (SS: 0 → 1)`, now)
      }
      break
    case 'VEHICLE_DETECTED':
      if (t >= DWELL.exitDetected && exitTransition(d, 'CHECK', now)) {
        log(d, 'info', 'Verificação de saída iniciada', now)
      }
      break
    case 'CHECKING':
      if (t >= DWELL.exitChecking && v && isStoppedAt(v, 'EXIT_STOP')) {
        const result = exitAuthorized({ SS: s.SS, CS: s.CS })
        if (result === 1 && exitTransition(d, 'AUTH_OK', now)) {
          log(d, 'logic', `SAIDA_AUTORIZADA = SS·CS = ${s.SS}·${s.CS} = 1`, now)
          log(d, 'success', `Saída autorizada para ${v.label}`, now)
        }
      }
      break
    case 'ACCESS_GRANTED':
      if (t >= DWELL.exitGranted && exitTransition(d, 'OPEN_CMD', now)) {
        gate.phase = 'OPENING'
        log(d, 'info', 'Semáforo de saída VERDE — comando de abertura da cancela', now)
      }
      break
    case 'GATE_OPENING':
      if (gate.phase === 'OPEN' && exitTransition(d, 'GATE_OPENED', now)) {
        log(d, 'info', 'Cancela de saída ABERTA', now)
      }
      break
    case 'GATE_OPEN':
      if (!d.exit.passDispatched && v && isStoppedAt(v, 'EXIT_STOP')) {
        d.exit.passDispatched = true
        setLegs(v, exitPassLegs())
      }
      if (prev.PS === 0 && s.PS === 1 && exitTransition(d, 'PS_RISE', now)) {
        log(d, 'logic', `${v?.label ?? 'Veículo'} atravessando a cancela de saída (PS: 0 → 1)`, now)
      }
      break
    case 'VEHICLE_PASSING':
      if (prev.PS === 1 && s.PS === 0 && exitTransition(d, 'PS_FALL', now)) {
        gate.phase = 'CLOSING'
        const spot = v ? findSpot(d, v.spotId) : undefined
        if (v && spot && spot.vehicleId === v.id) {
          spot.status = 'FREE'
          spot.vehicleId = null
          v.spotId = null
          d.stats.exited += 1
          log(d, 'success', `Passagem de saída confirmada (PS: 1 → 0) — vaga ${spot.id} LIBERADA`, now)
          applyCounter(d, 'dec', now)
        }
      }
      break
    case 'GATE_CLOSING':
      if (prev.PS === 0 && s.PS === 1) {
        if (exitTransition(d, 'PS_RISE', now)) {
          gate.phase = 'OPENING'
          log(d, 'warning', 'Obstáculo na saída — cancela reaberta por segurança', now)
        }
      } else if (gate.phase === 'CLOSED' && exitTransition(d, 'GATE_CLOSED', now)) {
        log(d, 'info', 'Cancela de saída FECHADA', now)
      }
      break
    case 'COMPLETED':
      if (t >= DWELL.exitCompleted && exitTransition(d, 'DONE', now)) {
        d.exit.vehicleId = null
        d.exit.passDispatched = false
      }
      break
  }
}

function updateGate(g: Draft<GateState>, dt: number): void {
  if (g.phase === 'OPENING') {
    g.angle = Math.min(1, g.angle + dt * GATE_RATE)
    if (g.angle >= 1) g.phase = 'OPEN'
  } else if (g.phase === 'CLOSING') {
    g.angle = Math.max(0, g.angle - dt * GATE_RATE)
    if (g.angle <= 0) g.phase = 'CLOSED'
  }
}

// ───────────────────────────── modo automático ─────────────────────────────

function autoSchedule(d: D, now: number): void {
  if (!d.auto.enabled) return
  if (d.simTime >= d.auto.nextArrival) {
    d.auto.nextArrival = d.simTime + d.auto.arrivalInterval * (0.6 + 0.8 * rand(d))
    const targetHasSpot = d.entryTarget !== null && findVehicle(d, d.entryTarget)?.spotId != null
    const pipeline = d.pendingArrivals + d.entryQueue.length + (d.entryTarget !== null && !targetHasSpot ? 1 : 0)
    const queueRoom = d.pendingArrivals + d.entryQueue.length < MAX_QUEUE
    if (!d.maintenance && queueRoom && freeCount(d) - pipeline > 0) {
      requestEntryDraft(d, now, 'auto')
    }
  }
  if (d.simTime >= d.auto.nextDeparture) {
    d.auto.nextDeparture = d.simTime + d.auto.departureInterval * (0.6 + 0.8 * rand(d))
    const parked = d.vehicles.filter((v) => v.phase === 'PARKED' && !v.exitRequested)
    const occupied = occupiedCount(d)
    if (parked.length > 0 && (occupied >= 6 || rand(d) < 0.7)) {
      const pick = parked[Math.floor(rand(d) * parked.length)]
      requestExitDraft(d, pick.id, now, 'auto')
    }
  }
}

// ───────────────────────────── ações (comandos) ─────────────────────────────

function requestEntryDraft(d: D, now: number, source: 'manual' | 'auto'): boolean {
  if (d.paused) {
    notify(d, 'warning', 'Simulação pausada — retome para adicionar veículos.')
    return false
  }
  if (d.pendingArrivals + d.entryQueue.length >= MAX_QUEUE) {
    notify(d, 'warning', `Via de acesso cheia: no máximo ${MAX_QUEUE} veículos aguardando.`)
    log(d, 'warning', 'Comando de entrada recusado: via de acesso cheia', now)
    return false
  }
  d.pendingArrivals += 1
  d.pulses.CE = d.simTime + 0.6
  log(d, 'info', source === 'auto' ? 'Modo automático: novo veículo a caminho (CE = 1)' : 'Comando de entrada (CE = 1): veículo a caminho', now)
  if (d.maintenance) notify(d, 'warning', 'Modo manutenção ativo: a lógica irá negar a entrada (M = 1).')
  else if (freeCount(d) === 0) notify(d, 'warning', 'Sem vagas: a lógica irá negar a entrada (L = 1).')
  return true
}

function requestExitDraft(d: D, vehicleId: string | null, now: number, source: 'manual' | 'auto'): boolean {
  if (d.paused) {
    notify(d, 'warning', 'Simulação pausada — retome para retirar veículos.')
    return false
  }
  let v: DV | undefined
  if (vehicleId === null) {
    v = d.vehicles
      .filter((x) => x.phase === 'PARKED' && !x.exitRequested)
      .sort((a, b) => (a.parkedAt ?? 0) - (b.parkedAt ?? 0))[0]
    if (!v) {
      const msg =
        occupiedCount(d) === 0
          ? 'Estacionamento vazio — não há veículo para retirar.'
          : 'Todos os veículos estacionados já possuem saída solicitada.'
      notify(d, 'warning', msg)
      log(d, 'warning', `Comando de saída recusado: ${msg}`, now)
      return false
    }
  } else {
    v = findVehicle(d, vehicleId)
    if (!v) {
      notify(d, 'warning', 'Veículo não encontrado.')
      return false
    }
    if (v.exitRequested) {
      notify(d, 'warning', `A saída de ${v.label} já foi solicitada.`)
      return false
    }
    if (v.phase !== 'PARKED') {
      notify(d, 'warning', `${v.label} não está estacionado — aguarde o fim da manobra.`)
      return false
    }
  }
  v.exitRequested = true
  d.exitQueue.push(v.id)
  const pos = d.exitQueue.length
  log(
    d,
    'info',
    `${source === 'auto' ? 'Modo automático: s' : 'S'}aída solicitada para ${v.label} (vaga ${v.spotId})${pos > 1 ? ` — posição ${pos} na fila` : ''}`,
    now,
  )
  return true
}

export function requestEntry(state: SimState, now: number): SimState {
  return produce(state, (d) => {
    requestEntryDraft(d, now, 'manual')
  })
}

export function requestExit(state: SimState, vehicleId: string | null, now: number): SimState {
  return produce(state, (d) => {
    requestExitDraft(d, vehicleId, now, 'manual')
  })
}

export function setMaintenance(state: SimState, on: boolean, now: number): SimState {
  if (state.maintenance === on) return state
  return produce(state, (d) => {
    d.maintenance = on
    d.signals.M = toBit(on)
    if (on) {
      log(d, 'warning', 'MODO MANUTENÇÃO ATIVADO (M = 1) — novas entradas bloqueadas, saídas permitidas', now)
      if (d.entry.state !== 'IDLE' && d.entry.state !== 'ACCESS_DENIED' && d.entry.state !== 'VEHICLE_DETECTED' && d.entry.state !== 'CHECKING_CAPACITY') {
        log(d, 'info', 'Operação de entrada já autorizada será concluída por segurança', now)
      }
      notify(d, 'warning', 'Modo manutenção ativado: entradas bloqueadas.')
    } else {
      log(d, 'success', 'Modo manutenção desativado (M = 0)', now)
      notify(d, 'success', 'Modo manutenção desativado.')
    }
  })
}

export function setPaused(state: SimState, paused: boolean, now: number): SimState {
  if (state.paused === paused) return state
  return produce(state, (d) => {
    d.paused = paused
    log(d, paused ? 'warning' : 'success', paused ? 'Simulação PAUSADA' : 'Simulação RETOMADA', now)
  })
}

export function setAuto(state: SimState, enabled: boolean, now: number): SimState {
  if (state.auto.enabled === enabled) return state
  return produce(state, (d) => {
    d.auto.enabled = enabled
    if (enabled) {
      d.auto.nextArrival = d.simTime + 0.5
      d.auto.nextDeparture = d.simTime + d.auto.departureInterval
    }
    log(d, 'info', enabled ? 'Modo AUTOMÁTICO ativado' : 'Modo MANUAL ativado', now)
  })
}

export function setAutoConfig(
  state: SimState,
  cfg: Partial<Pick<SimState['auto'], 'arrivalInterval' | 'departureInterval'>>,
): SimState {
  return produce(state, (d) => {
    if (cfg.arrivalInterval !== undefined) d.auto.arrivalInterval = Math.min(30, Math.max(2, cfg.arrivalInterval))
    if (cfg.departureInterval !== undefined) d.auto.departureInterval = Math.min(40, Math.max(2, cfg.departureInterval))
  })
}

export function setSpeed(state: SimState, speed: number): SimState {
  const s = Math.min(4, Math.max(0.25, speed))
  if (s === state.speed) return state
  return produce(state, (d) => {
    d.speed = s
  })
}

export function clearNotice(state: SimState, id: number): SimState {
  if (!state.notice || state.notice.id !== id) return state
  return produce(state, (d) => {
    d.notice = null
  })
}

/** Reinicialização: novo estado inicial, nova época, pulso R = 1. */
export function resetSimulation(state: SimState, now: number): SimState {
  const fresh = createInitialState({ epoch: state.epoch + 1, speed: state.speed })
  return produce(fresh, (d) => {
    d.pulses.R = 0.6
    d.signals.R = 1
    log(d, 'warning', 'Sistema reinicializado (R = 1): veículos, cancelas, sensores e contador zerados', now)
  })
}

/** Utilitário de cenários: posiciona veículos já estacionados (estado inicial). */
export function withParkedVehicles(state: SimState, spotIds: readonly string[], now: number): SimState {
  return produce(state, (d) => {
    for (const id of spotIds) {
      const spot = findSpot(d, id)
      if (!spot || spot.status !== 'FREE') continue
      const v = createVehicle(d, 'PARKED', { x: spot.x, z: spot.z, heading: spot.heading })
      v.spotId = spot.id
      v.stopTag = 'PARKED'
      v.parkedAt = d.simTime
      spot.status = 'OCCUPIED'
      spot.vehicleId = v.id
      const r = counterIncrement(d.counter)
      d.counter = castDraft(r.counter)
    }
    d.counter = { ...d.counter, previous: d.counter.bits }
    Object.assign(d.signals, computeSignals(d as SimState))
    log(d, 'info', `Cenário: ${spotIds.length} veículo(s) estacionado(s) — contador ${bitsToString(d.counter.bits)}`, now)
  })
}

export function vehicleIdAtSpot(state: SimState, spotId: string): string | null {
  return state.spots.find((s) => s.id === spotId)?.vehicleId ?? null
}

// ───────────────────────────── tick ─────────────────────────────

function substep(d: D, dt: number, now: number): void {
  d.simTime += dt
  autoSchedule(d, now)
  spawnPending(d, now)
  manageEntryQueue(d)
  dispatchEntry(d, now)

  const arrivals: Arrival[] = []
  for (const v of d.vehicles) advanceVehicle(v, dt, arrivals)
  const removed = new Set<string>()
  for (const a of arrivals) handleArrival(d, a, now, removed)
  if (removed.size) {
    d.vehicles = d.vehicles.filter((v) => !removed.has(v.id))
    d.entryQueue = d.entryQueue.filter((id) => !removed.has(id))
    d.exitQueue = d.exitQueue.filter((id) => !removed.has(id))
  }

  updateGate(d.gates.entry, dt)
  updateGate(d.gates.exit, dt)

  const prev: Signals = { ...d.signals }
  const next = computeSignals(d as SimState)
  for (const k of Object.keys(next) as (keyof Signals)[]) d.signals[k] = next[k]

  stepEntryFsm(d, prev, now)
  stepExitFsm(d, prev, now)
  // Sinais dependentes das máquinas (CS, L) podem ter mudado nesta etapa.
  const after = computeSignals(d as SimState)
  for (const k of Object.keys(after) as (keyof Signals)[]) d.signals[k] = after[k]
}

/**
 * Avança a simulação. `realDt` é o tempo real decorrido (s); ele é
 * multiplicado pela velocidade e fracionado em subpassos de 1/60 s.
 */
export function tick(state: SimState, realDt: number, now: number): SimState {
  if (state.paused || realDt <= 0) return state
  const total = Math.min(realDt, MAX_FRAME_DT) * state.speed
  return produce(state, (d) => {
    let remaining = total
    while (remaining > 1e-9) {
      const dt = Math.min(SUBSTEP, remaining)
      substep(d, dt, now)
      remaining -= dt
    }
  })
}

/** Avança um tempo longo (útil em testes): executa ticks de 1/60 s. */
export function runFor(state: SimState, seconds: number, now = 0, onStep?: (s: SimState) => void): SimState {
  let s = state
  const frames = Math.ceil(seconds / SUBSTEP)
  for (let i = 0; i < frames; i++) {
    s = tick(s, SUBSTEP / s.speed, now)
    onStep?.(s)
  }
  return s
}

// ───────────────────────────── invariantes ─────────────────────────────

/** Regras de consistência que devem valer em QUALQUER instante. */
export function checkInvariants(s: SimState): string[] {
  const errors: string[] = []
  const occ = occupiedCount(s)
  const res = reservedCount(s)
  if (counterValue(s.counter) !== occ) errors.push(`contador ${counterValue(s.counter)} ≠ vagas ocupadas ${occ}`)
  if (occ + res > CAPACITY) errors.push(`ocupadas + reservadas = ${occ + res} > ${CAPACITY}`)
  if (counterValue(s.counter) < 0 || counterValue(s.counter) > CAPACITY) errors.push('contador fora da faixa')
  const owners = new Set<string>()
  for (const sp of s.spots) {
    if (sp.status === 'FREE' && sp.vehicleId !== null) errors.push(`${sp.id} livre com veículo`)
    if (sp.status !== 'FREE') {
      if (sp.vehicleId === null) errors.push(`${sp.id} ${sp.status} sem veículo`)
      else {
        if (owners.has(sp.vehicleId)) errors.push(`veículo ${sp.vehicleId} em duas vagas`)
        owners.add(sp.vehicleId)
        const v = s.vehicles.find((x) => x.id === sp.vehicleId)
        if (!v) errors.push(`${sp.id} aponta para veículo inexistente`)
        else if (v.spotId !== sp.id) errors.push(`${sp.id} ↔ ${v.label} inconsistentes`)
      }
    }
  }
  if (s.aisleLock !== null && !s.vehicles.some((v) => v.id === s.aisleLock)) errors.push('trava do corredor órfã')
  if (s.entryQueue.length > MAX_QUEUE) errors.push('fila de entrada acima do limite')
  return errors
}
