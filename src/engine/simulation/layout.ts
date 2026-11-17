/**
 * Planta do estacionamento: coordenadas de vagas, sensores, cancelas e as
 * rotas geométricas percorridas pelos veículos. Tudo em metros no plano XZ.
 *
 *            z = -9.5  ┌──────────────── muro norte ────────────────┐
 *                      │   V01    V02    V03    V04   (vagas topo)   │
 *            z =  0    │ ↑ ════ corredor (sentido único → leste) ══ ↓ │
 *                      │ │  V05    V06    V07    V08 (vagas baixo)  │ │
 *            z =  8    └─┤ENTRADA├──────── cabine ────────┤ SAÍDA ├─┘
 *                        │ x=-11 │                         │ x=11  │
 *            z ≈ 13.3  ← ← ← ← faixa oeste (retorno de recusados) ← ← ←
 *            z ≈ 15.7  → → → → faixa leste (chegada / partida) → → → →
 */
import { PathBuilder, polyline, rect, type Polyline, type Rect, type Vec2 } from './geometry'
import type { ArrivalTag, Leg, Spot, VehiclePhase } from './types'

export const CAR_LENGTH = 4.2
export const CAR_WIDTH = 1.9

export const LOT = { minX: -13.5, maxX: 13.5, minZ: -9.5, maxZ: 8 } as const

export const ENTRY_LANE_X = -11
export const EXIT_LANE_X = 11
export const GATE_LINE_Z = 8
export const LANE_HALF_WIDTH = 1.6

export const AISLE_Z = 0
export const STREET = { minZ: 12, maxZ: 17.4, nearLaneZ: 13.3, farLaneZ: 15.7 } as const

export const SPOT_WIDTH = 3.3
export const SPOT_LENGTH = 5.3
export const SPOT_ROW_Z = { top: -4.85, bottom: 4.85 } as const
export const SPOT_XS = [-4.95, -1.65, 1.65, 4.95] as const

/** Pontos de parada importantes. */
export const ENTRY_STOP: Vec2 = { x: ENTRY_LANE_X, z: 10.7 }
export const ENTRY_HOLD: Vec2 = { x: ENTRY_LANE_X, z: 3.0 }
export const EXIT_STOP: Vec2 = { x: EXIT_LANE_X, z: 5.3 }
export const SPAWN_X = -42
export const DESPAWN_X = 42
/** Posições de espera na via de acesso (fila). Índice 1..3. */
export const QUEUE_SLOT_X = [-11, -17.5, -23, -28.5] as const
export const MAX_QUEUE = QUEUE_SLOT_X.length - 1
/** O início da via deve estar livre antes de criar um novo veículo. */
export const SPAWN_CLEAR_X = -35.5

/** Regiões de detecção dos sensores (laços indutivos / barreiras ópticas). */
export const SENSOR_ZONES: Record<'SE' | 'P' | 'SS' | 'PS', Rect> = {
  SE: rect(ENTRY_LANE_X, 10.0, LANE_HALF_WIDTH * 2, 2.0),
  P: rect(ENTRY_LANE_X, 7.3, LANE_HALF_WIDTH * 2, 2.2),
  SS: rect(EXIT_LANE_X, 6.0, LANE_HALF_WIDTH * 2, 2.0),
  PS: rect(EXIT_LANE_X, 8.7, LANE_HALF_WIDTH * 2, 2.2),
}

export const SPEED = {
  street: 7.5,
  lot: 4.0,
  maneuver: 2.4,
  reverse: 1.7,
  gate: 3.0,
} as const

export function createSpots(): Spot[] {
  const spots: Spot[] = []
  SPOT_XS.forEach((x, i) => {
    spots.push({
      id: `V0${i + 1}`,
      index: i,
      row: 'top',
      x,
      z: SPOT_ROW_Z.top,
      heading: Math.PI,
      status: 'FREE',
      vehicleId: null,
    })
  })
  SPOT_XS.forEach((x, i) => {
    spots.push({
      id: `V0${i + 5}`,
      index: i + 4,
      row: 'bottom',
      x,
      z: SPOT_ROW_Z.bottom,
      heading: 0,
      status: 'FREE',
      vehicleId: null,
    })
  })
  return spots
}

interface LegOptions {
  reverse?: boolean
  stopAtEnd?: boolean
  maxSpeed: number
  phase: VehiclePhase
  tag?: ArrivalTag
}

/**
 * Implementado como classe (objeto não "plano") para que o Immer trate cada
 * trecho como valor opaco e imutável — evita proxies em cada quadro.
 */
class PathLeg implements Leg {
  readonly line: Polyline
  readonly reverse: boolean
  readonly stopAtEnd: boolean
  readonly maxSpeed: number
  readonly phase: VehiclePhase
  readonly tag?: ArrivalTag

  constructor(points: Vec2[], opts: LegOptions) {
    this.line = polyline(points)
    this.reverse = opts.reverse ?? false
    this.stopAtEnd = opts.stopAtEnd ?? true
    this.maxSpeed = opts.maxSpeed
    this.phase = opts.phase
    this.tag = opts.tag
    Object.freeze(this)
  }
}

export function makeLeg(points: Vec2[], opts: LegOptions): Leg {
  return new PathLeg(points, opts)
}

const EAST = Math.PI / 2
const WEST = -Math.PI / 2
const NORTH = Math.PI
const SOUTH = 0

const APPROACH_TURN_X = -14.5
const APPROACH_TURN_R = STREET.farLaneZ - 12.2
const INNER_TURN_R = 2.5
const PARK_TURN_R = 2.8
const UNPARK_TURN_R = 2.8

/** Do ponto atual na faixa leste até uma posição de espera da fila. */
export function queueLeg(fromX: number, slot: number): Leg {
  const x = QUEUE_SLOT_X[slot]
  const pts = new PathBuilder({ x: fromX, z: STREET.farLaneZ }, EAST).lineTo(x, STREET.farLaneZ).build()
  return makeLeg(pts, { maxSpeed: SPEED.street, phase: 'APPROACHING', tag: 'QUEUE_SLOT' })
}

/** Da faixa leste até o sensor de entrada (curva à esquerda para a entrada). */
export function approachStopLeg(fromX: number): Leg {
  const b = new PathBuilder({ x: Math.min(fromX, APPROACH_TURN_X), z: STREET.farLaneZ }, EAST)
  b.lineTo(APPROACH_TURN_X, STREET.farLaneZ)
    .turn('left', APPROACH_TURN_R)
    .lineTo(ENTRY_STOP.x, ENTRY_STOP.z)
  return makeLeg(b.build(), { maxSpeed: SPEED.street * 0.7, phase: 'APPROACHING', tag: 'ENTRY_STOP' })
}

/** Travessia da cancela de entrada até o ponto de espera interno. */
export function entryPassLeg(stopAtHold: boolean): Leg {
  const pts = new PathBuilder(ENTRY_STOP, NORTH).lineTo(ENTRY_HOLD.x, ENTRY_HOLD.z).build()
  return makeLeg(pts, {
    maxSpeed: SPEED.gate,
    phase: 'ENTERING',
    stopAtEnd: stopAtHold,
    tag: stopAtHold ? 'HOLD' : undefined,
  })
}

/** Do ponto de espera interno até a vaga: circulação + manobra. */
export function toSpotLegs(spot: Spot): Leg[] {
  const approachX = spot.x - PARK_TURN_R
  const drive = new PathBuilder(ENTRY_HOLD, NORTH)
    .lineTo(ENTRY_LANE_X, AISLE_Z + INNER_TURN_R)
    .turn('right', INNER_TURN_R)
    .lineTo(approachX, AISLE_Z)
    .build()
  const park = new PathBuilder({ x: approachX, z: AISLE_Z }, EAST)
    .turn(spot.row === 'top' ? 'left' : 'right', PARK_TURN_R)
    .lineTo(spot.x, spot.z)
    .build()
  return [
    makeLeg(drive, { maxSpeed: SPEED.lot, phase: 'MOVING_TO_SPOT', stopAtEnd: false }),
    makeLeg(park, { maxSpeed: SPEED.maneuver, phase: 'PARKING', tag: 'PARKED' }),
  ]
}

/** Saída da vaga (em ré) e circulação até o sensor de saída. */
export function leaveSpotLegs(spot: Spot): Leg[] {
  const top = spot.row === 'top'
  const backZ = top ? -UNPARK_TURN_R : UNPARK_TURN_R
  const reverse = new PathBuilder({ x: spot.x, z: spot.z }, top ? SOUTH : NORTH)
    .lineTo(spot.x, backZ)
    .turn(top ? 'right' : 'left', UNPARK_TURN_R)
    .build()
  const startX = spot.x - UNPARK_TURN_R
  const drive = new PathBuilder({ x: startX, z: AISLE_Z }, EAST)
    .lineTo(EXIT_LANE_X - INNER_TURN_R, AISLE_Z)
    .turn('right', INNER_TURN_R)
    .lineTo(EXIT_STOP.x, EXIT_STOP.z)
    .build()
  return [
    makeLeg(reverse, { reverse: true, maxSpeed: SPEED.reverse, phase: 'LEAVING_SPOT' }),
    makeLeg(drive, { maxSpeed: SPEED.lot, phase: 'MOVING_TO_EXIT', tag: 'EXIT_STOP' }),
  ]
}

/** Travessia da cancela de saída e partida pela faixa leste da rua. */
export function exitPassLegs(): Leg[] {
  const pts = new PathBuilder(EXIT_STOP, SOUTH)
    .lineTo(EXIT_LANE_X, 11.5)
    .turn('left', STREET.farLaneZ - 11.5)
    .lineTo(DESPAWN_X, STREET.farLaneZ)
    .build()
  return [makeLeg(pts, { maxSpeed: SPEED.street, phase: 'EXITING', tag: 'GONE' })]
}

/** Veículo recusado: ré até a faixa oeste e partida em direção oeste. */
export function rejectLegs(): Leg[] {
  const turnR = STREET.nearLaneZ - 11.5
  const back = new PathBuilder(ENTRY_STOP, SOUTH)
    .lineTo(ENTRY_LANE_X, 11.5)
    .turn('left', turnR)
    .lineTo(ENTRY_LANE_X + turnR + 1.7, STREET.nearLaneZ)
    .build()
  const endBack = back[back.length - 1]
  const clear = new PathBuilder(endBack, WEST).lineTo(-18.5, STREET.nearLaneZ).build()
  const away = new PathBuilder({ x: -18.5, z: STREET.nearLaneZ }, WEST).lineTo(-DESPAWN_X, STREET.nearLaneZ).build()
  return [
    makeLeg(back, { reverse: true, maxSpeed: SPEED.reverse, phase: 'REJECTED', tag: 'REJECT_STOP' }),
    makeLeg(clear, { maxSpeed: SPEED.street, phase: 'REJECTED', stopAtEnd: false, tag: 'REJECT_CLEAR' }),
    makeLeg(away, { maxSpeed: SPEED.street, phase: 'REJECTED', tag: 'GONE' }),
  ]
}

export const SPAWN_POSE = { x: SPAWN_X, z: STREET.farLaneZ, heading: EAST }
