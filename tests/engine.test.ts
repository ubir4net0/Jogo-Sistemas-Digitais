import { describe, expect, it } from 'vitest'
import {
  SUBSTEP,
  checkInvariants,
  createInitialState,
  occupiedCount,
  requestEntry,
  requestExit,
  reservedCount,
  resetSimulation,
  setAuto,
  setAutoConfig,
  setMaintenance,
  setPaused,
  setSpeed,
  tick,
  vehicleIdAtSpot,
  withParkedVehicles,
} from '../src/engine/simulation/engine'
import { SCENARIOS, scenarioById } from '../src/engine/simulation/scenarios'
import { bodyCorners, polygonsOverlap } from '../src/engine/simulation/geometry'
import { CAR_LENGTH, CAR_WIDTH, LOT } from '../src/engine/simulation/layout'
import { bitsToString, counterValue } from '../src/engine/logic/counter'
import type { SimState } from '../src/engine/simulation/types'

const ALL = ['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08']

function collisions(s: SimState): string[] {
  const out: string[] = []
  const shapes = s.vehicles.map((v) => ({ v, poly: bodyCorners(v.pose, CAR_LENGTH * 0.97, CAR_WIDTH * 0.95) }))
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++)
      if (polygonsOverlap(shapes[i].poly, shapes[j].poly))
        out.push(`${shapes[i].v.label}(${shapes[i].v.phase}) × ${shapes[j].v.label}(${shapes[j].v.phase}) @t=${s.simTime.toFixed(2)}`)
  return out
}

/** Verificações executadas a CADA quadro da simulação. */
function assertHealthy(s: SimState): void {
  const inv = checkInvariants(s)
  if (inv.length) throw new Error(`Invariante violada @t=${s.simTime.toFixed(2)}: ${inv.join('; ')}`)
  const col = collisions(s)
  if (col.length) throw new Error(`Colisão: ${col.join('; ')}`)
  // Veículo nunca atravessa a cancela fechada.
  for (const v of s.vehicles) {
    const nearEntryGate = Math.abs(v.pose.x - -11) < 1.6 && Math.abs(v.pose.z - LOT.maxZ) < CAR_LENGTH / 2 - 0.1
    if (nearEntryGate && s.gates.entry.angle < 0.95 && v.phase !== 'REJECTED')
      throw new Error(`${v.label} sob a cancela de entrada não aberta (ângulo ${s.gates.entry.angle.toFixed(2)})`)
    const nearExitGate = Math.abs(v.pose.x - 11) < 1.6 && Math.abs(v.pose.z - LOT.maxZ) < CAR_LENGTH / 2 - 0.1
    if (nearExitGate && s.gates.exit.angle < 0.95)
      throw new Error(`${v.label} sob a cancela de saída não aberta (ângulo ${s.gates.exit.angle.toFixed(2)})`)
  }
}

function run(state: SimState, seconds: number, check = true): SimState {
  let s = state
  const frames = Math.ceil(seconds / SUBSTEP)
  for (let i = 0; i < frames; i++) {
    s = tick(s, SUBSTEP / s.speed, 1_000 + i)
    if (check) assertHealthy(s)
  }
  return s
}

function runUntil(state: SimState, pred: (s: SimState) => boolean, maxSeconds = 120): SimState {
  let s = state
  const frames = Math.ceil(maxSeconds / SUBSTEP)
  for (let i = 0; i < frames; i++) {
    if (pred(s)) return s
    s = tick(s, SUBSTEP / s.speed, 1_000 + i)
    assertHealthy(s)
  }
  throw new Error(`Condição não atingida em ${maxSeconds}s (entrada=${s.entry.state}, saída=${s.exit.state})`)
}

const idle = (s: SimState) =>
  s.entry.state === 'IDLE' &&
  s.exit.state === 'IDLE' &&
  s.vehicles.every((v) => v.phase === 'PARKED') &&
  s.pendingArrivals === 0 &&
  s.exitQueue.length === 0

describe('Motor da simulação — entrada', () => {
  it('estado inicial consistente', () => {
    const s = createInitialState()
    expect(s.spots).toHaveLength(8)
    expect(bitsToString(s.counter.bits)).toBe('0000')
    expect(checkInvariants(s)).toEqual([])
  })

  it('entrada com vaga disponível: sensores, FSM, cancela e contador', () => {
    let s = requestEntry(createInitialState(), 0)
    expect(s.pendingArrivals).toBe(1)
    const seen = new Set<string>()
    let sawSE = false
    let sawP = false
    let gateOpened = false
    const frames = Math.ceil(80 / SUBSTEP)
    for (let i = 0; i < frames && !(idle(s) && s.vehicles.length === 1); i++) {
      s = tick(s, SUBSTEP, i)
      assertHealthy(s)
      seen.add(s.entry.state)
      if (s.signals.SE) sawSE = true
      if (s.signals.P) sawP = true
      if (s.gates.entry.phase === 'OPEN') gateOpened = true
      // O contador só muda quando a ocupação é confirmada.
      if (s.vehicles[0]?.phase !== 'PARKED') expect(counterValue(s.counter)).toBe(0)
    }
    expect(sawSE && sawP && gateOpened).toBe(true)
    for (const st of ['VEHICLE_DETECTED', 'CHECKING_CAPACITY', 'ACCESS_GRANTED', 'GATE_OPENING', 'GATE_OPEN', 'VEHICLE_PASSING', 'GATE_CLOSING', 'PARKING', 'COMPLETED'])
      expect(seen.has(st), st).toBe(true)
    expect(s.vehicles).toHaveLength(1)
    expect(s.vehicles[0].phase).toBe('PARKED')
    expect(s.spots[0]).toMatchObject({ id: 'V01', status: 'OCCUPIED', vehicleId: s.vehicles[0].id })
    expect(bitsToString(s.counter.bits)).toBe('0001')
    expect(s.gates.entry.phase).toBe('CLOSED')
    expect(s.entry.lastDecision).toMatchObject({ SE: 1, L: 0, M: 0, result: 1, spotId: 'V01' })
    // O veículo percorreu fisicamente a trajetória até a vaga.
    expect(s.vehicles[0].pose.x).toBeCloseTo(s.spots[0].x, 1)
    expect(s.vehicles[0].pose.z).toBeCloseTo(s.spots[0].z, 1)
    expect(Math.abs(s.vehicles[0].odometer)).toBeGreaterThan(40)
  })

  it('entrada com estacionamento cheio é negada (L = 1)', () => {
    let s = withParkedVehicles(createInitialState(), ALL, 0)
    expect(bitsToString(s.counter.bits)).toBe('1000')
    expect(s.signals.L).toBe(1)
    s = requestEntry(s, 0)
    s = runUntil(s, (x) => x.entry.state === 'ACCESS_DENIED')
    expect(s.entry.lastDecision).toMatchObject({ SE: 1, L: 1, M: 0, result: 0 })
    expect(s.gates.entry.phase).toBe('CLOSED')
    s = runUntil(s, (x) => x.vehicles.length === 8 && x.entry.state === 'IDLE')
    expect(bitsToString(s.counter.bits)).toBe('1000')
    expect(s.stats.denied).toBe(1)
    expect(reservedCount(s)).toBe(0)
  })

  it('entrada durante manutenção é negada mesmo com vagas livres', () => {
    let s = setMaintenance(createInitialState(), true, 0)
    s = requestEntry(s, 0)
    s = runUntil(s, (x) => x.entry.lastDecision !== null)
    expect(s.entry.state).toBe('ACCESS_DENIED')
    expect(s.entry.lastDecision).toMatchObject({ SE: 1, L: 0, M: 1, result: 0 })
    s = runUntil(s, (x) => x.vehicles.length === 0 && x.entry.state === 'IDLE')
    expect(counterValue(s.counter)).toBe(0)
  })

  it('manutenção ativada durante uma entrada já autorizada: operação conclui com segurança', () => {
    let s = requestEntry(createInitialState(), 0)
    s = runUntil(s, (x) => x.entry.state === 'GATE_OPENING')
    s = setMaintenance(s, true, 0)
    s = runUntil(s, (x) => x.entry.state === 'IDLE' && x.vehicles[0]?.phase === 'PARKED')
    expect(counterValue(s.counter)).toBe(1)
    expect(s.signals.ENTRADA_AUTORIZADA).toBe(0)
  })

  it('fila de acesso limita comandos repetidos (cliques rápidos)', () => {
    let s = createInitialState()
    for (let i = 0; i < 10; i++) s = requestEntry(s, 0)
    expect(s.pendingArrivals).toBe(3)
    expect(s.notice?.level).toBe('warning')
    s = runUntil(s, (x) => idle(x) && x.vehicles.length === 3, 200)
    expect(counterValue(s.counter)).toBe(3)
    expect(new Set(s.vehicles.map((v) => v.spotId)).size).toBe(3)
  })
})

describe('Motor da simulação — saída', () => {
  it('saída com estacionamento vazio é recusada', () => {
    const s = requestExit(createInitialState(), null, 0)
    expect(s.exitQueue).toHaveLength(0)
    expect(s.notice?.text).toMatch(/vazio/)
    expect(counterValue(s.counter)).toBe(0)
  })

  it('saída de veículo: libera a vaga e decrementa o contador no evento PS↓', () => {
    let s = withParkedVehicles(createInitialState(), ['V01', 'V03', 'V06'], 0)
    const id = vehicleIdAtSpot(s, 'V03')
    s = requestExit(s, id, 0)
    expect(s.exitQueue).toEqual([id])
    const seen = new Set<string>()
    let decrementedBeforePS = false
    while (s.vehicles.some((v) => v.id === id)) {
      const prevState = s.exit.state
      s = tick(s, SUBSTEP, 0)
      assertHealthy(s)
      seen.add(s.exit.state)
      if (counterValue(s.counter) === 2 && prevState !== 'VEHICLE_PASSING' && !seen.has('GATE_CLOSING')) decrementedBeforePS = true
      if (s.simTime > 90) throw new Error('timeout')
    }
    expect(decrementedBeforePS).toBe(false)
    for (const st of ['LEAVING_SPOT', 'VEHICLE_DETECTED', 'CHECKING', 'ACCESS_GRANTED', 'GATE_OPENING', 'GATE_OPEN', 'VEHICLE_PASSING', 'GATE_CLOSING'])
      expect(seen.has(st), st).toBe(true)
    expect(bitsToString(s.counter.bits)).toBe('0010')
    expect(s.spots.find((sp) => sp.id === 'V03')?.status).toBe('FREE')
    s = runUntil(s, (x) => x.exit.state === 'IDLE')
    expect(s.gates.exit.phase).toBe('CLOSED')
  })

  it('não permite solicitar a saída do mesmo veículo duas vezes', () => {
    let s = withParkedVehicles(createInitialState(), ['V02'], 0)
    const id = vehicleIdAtSpot(s, 'V02')
    s = requestExit(s, id, 0)
    s = requestExit(s, id, 0)
    expect(s.exitQueue).toEqual([id])
    expect(s.notice?.text).toMatch(/já foi solicitada/)
  })

  it('saídas são permitidas em modo manutenção', () => {
    let s = withParkedVehicles(createInitialState(), ['V05'], 0)
    s = setMaintenance(s, true, 0)
    s = requestExit(s, vehicleIdAtSpot(s, 'V05'), 0)
    s = runUntil(s, (x) => x.vehicles.length === 0 && x.exit.state === 'IDLE')
    expect(counterValue(s.counter)).toBe(0)
  })
})

describe('Concorrência, repetição e consistência', () => {
  it('entradas e saídas repetidas mantêm contador = vagas ocupadas', () => {
    let s = createInitialState()
    for (let round = 0; round < 3; round++) {
      s = requestEntry(s, 0)
      s = requestEntry(s, 0)
      s = runUntil(s, (x) => idle(x) && x.vehicles.length === 2, 150)
      expect(counterValue(s.counter)).toBe(2)
      s = requestExit(s, null, 0)
      s = requestExit(s, null, 0)
      s = runUntil(s, (x) => x.vehicles.length === 0 && x.exit.state === 'IDLE', 150)
      expect(counterValue(s.counter)).toBe(0)
    }
    expect(s.stats.entered).toBe(6)
    expect(s.stats.exited).toBe(6)
  })

  it('entrada e saída simultâneas não colidem nem duplicam vagas', () => {
    let s = withParkedVehicles(createInitialState(), ['V01', 'V02', 'V05', 'V06', 'V07'], 0)
    s = requestEntry(s, 0)
    s = requestEntry(s, 0)
    s = requestExit(s, vehicleIdAtSpot(s, 'V01'), 0)
    s = requestExit(s, vehicleIdAtSpot(s, 'V07'), 0)
    s = runUntil(s, (x) => idle(x) && x.vehicles.length === 5, 250)
    expect(counterValue(s.counter)).toBe(5)
    expect(occupiedCount(s)).toBe(5)
  })

  it('reserva impede que dois veículos recebam a mesma vaga (7 ocupadas + 2 chegadas)', () => {
    let s = withParkedVehicles(createInitialState(), ALL.slice(0, 7), 0)
    s = requestEntry(s, 0)
    s = requestEntry(s, 0)
    s = runUntil(s, (x) => x.stats.denied === 1 && x.entry.state === 'IDLE' && idle(x) && x.vehicles.length === 8, 200)
    expect(counterValue(s.counter)).toBe(8)
    expect(s.spots.every((sp) => sp.status === 'OCCUPIED')).toBe(true)
  })

  it('modo automático por longo período: sem colisões, sem overflow, invariantes sempre válidas', () => {
    let s = setAutoConfig(createInitialState({ seed: 42 }), { arrivalInterval: 3, departureInterval: 5 })
    s = setAuto(s, true, 0)
    s = run(s, 600)
    expect(s.stats.entered).toBeGreaterThan(10)
    expect(s.stats.exited).toBeGreaterThan(5)
    expect(counterValue(s.counter)).toBe(occupiedCount(s))
  })

  it('modo automático em velocidade 4× mantém a consistência', () => {
    let s = setSpeed(setAuto(createInitialState({ seed: 7 }), true, 0), 4)
    s = setAutoConfig(s, { arrivalInterval: 2, departureInterval: 3 })
    let t = 0
    for (let i = 0; i < 60 * 120; i++) {
      s = tick(s, 1 / 60, i)
      assertHealthy(s)
      t += 1 / 60
    }
    expect(t).toBeGreaterThan(100)
    expect(s.simTime).toBeGreaterThan(400)
  })
})

describe('Reset e pausa', () => {
  it('reinicialização durante movimentação descarta tudo e não sofre efeitos antigos', () => {
    let s = withParkedVehicles(createInitialState(), ['V01', 'V02'], 0)
    s = requestEntry(s, 0)
    s = requestExit(s, vehicleIdAtSpot(s, 'V01'), 0)
    s = run(s, 6)
    expect(s.vehicles.some((v) => v.velocity > 0)).toBe(true)
    const epoch = s.epoch
    s = resetSimulation(s, 0)
    expect(s.epoch).toBe(epoch + 1)
    expect(s.vehicles).toHaveLength(0)
    expect(s.entry.state).toBe('IDLE')
    expect(s.exit.state).toBe('IDLE')
    expect(s.gates.entry).toEqual({ phase: 'CLOSED', angle: 0 })
    expect(counterValue(s.counter)).toBe(0)
    expect(s.signals.R).toBe(1)
    s = run(s, 20)
    expect(s.vehicles).toHaveLength(0)
    expect(counterValue(s.counter)).toBe(0)
    expect(s.signals.R).toBe(0)
  })

  it('pausa congela tudo e a retomada continua do mesmo ponto', () => {
    let s = requestEntry(createInitialState(), 0)
    s = run(s, 5)
    const paused = setPaused(s, true, 0)
    const after = run(paused, 10)
    expect(after).toBe(paused)
    expect(requestEntry(paused, 0).pendingArrivals).toBe(paused.pendingArrivals)
    let resumed = setPaused(after, false, 0)
    resumed = runUntil(resumed, (x) => idle(x) && x.vehicles.length === 1)
    expect(counterValue(resumed.counter)).toBe(1)
  })
})

describe('Cenários de apresentação', () => {
  it.each(SCENARIOS.map((sc) => [sc.id] as const))('cenário %s é determinístico e consistente', (id) => {
    const sc = scenarioById(id)
    const a = run(sc.apply(createInitialState(), 0), 40)
    const b = run(sc.apply(createInitialState(), 0), 40)
    expect(checkInvariants(a)).toEqual([])
    expect(a.counter).toEqual(b.counter)
    expect(a.vehicles.map((v) => [v.label, v.phase, v.spotId])).toEqual(b.vehicles.map((v) => [v.label, v.phase, v.spotId]))
  })

  it('cenários produzem os valores esperados', () => {
    const base = createInitialState()
    expect(bitsToString(scenarioById('empty').apply(base, 0).counter.bits)).toBe('0000')
    expect(bitsToString(scenarioById('partial').apply(base, 0).counter.bits)).toBe('0011')
    const full = run(scenarioById('full').apply(base, 0), 30)
    expect(bitsToString(full.counter.bits)).toBe('1000')
    expect(full.stats.denied).toBe(1)
    const entry = runUntil(scenarioById('entry').apply(base, 0), (x) => idle(x) && x.vehicles.length === 1)
    expect(bitsToString(entry.counter.bits)).toBe('0001')
    const exit = runUntil(scenarioById('exit').apply(base, 0), (x) => x.exit.state === 'IDLE' && x.vehicles.length === 2)
    expect(bitsToString(exit.counter.bits)).toBe('0010')
    const maint = runUntil(scenarioById('maintenance').apply(base, 0), (x) => idle(x) && x.vehicles.length === 2 && x.stats.denied === 1)
    expect(bitsToString(maint.counter.bits)).toBe('0010')
  })
})
