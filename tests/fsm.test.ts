import { describe, expect, it } from 'vitest'
import {
  ENTRY_FSM,
  EXIT_FSM,
  edgesOf,
  nextState,
  reachableStates,
  type EntryEvent,
  type EntryState,
  type ExitEvent,
} from '../src/engine/fsm/fsm'

describe('FSM de entrada', () => {
  it('percorre o ciclo completo de uma entrada autorizada', () => {
    const events: EntryEvent[] = ['SE_RISE', 'CHECK', 'AUTH_OK', 'OPEN_CMD', 'GATE_OPENED', 'P_RISE', 'P_FALL', 'GATE_CLOSED', 'PARKED', 'DONE']
    const expected: EntryState[] = ['VEHICLE_DETECTED', 'CHECKING_CAPACITY', 'ACCESS_GRANTED', 'GATE_OPENING', 'GATE_OPEN', 'VEHICLE_PASSING', 'GATE_CLOSING', 'PARKING', 'COMPLETED', 'IDLE']
    let s: EntryState = 'IDLE'
    events.forEach((e, i) => {
      const r = nextState(ENTRY_FSM, s, e)
      expect(r.ok).toBe(true)
      s = r.to
      expect(s).toBe(expected[i])
    })
  })
  it('caminho de acesso negado retorna a IDLE quando a área é liberada', () => {
    let s: EntryState = 'IDLE'
    for (const e of ['SE_RISE', 'CHECK', 'AUTH_FAIL'] as EntryEvent[]) s = nextState(ENTRY_FSM, s, e).to
    expect(s).toBe('ACCESS_DENIED')
    expect(nextState(ENTRY_FSM, s, 'OPEN_CMD').ok).toBe(false)
    expect(nextState(ENTRY_FSM, s, 'VEHICLE_CLEARED').to).toBe('IDLE')
  })
  it('rejeita eventos inválidos (cancela não abre sem autorização)', () => {
    expect(nextState(ENTRY_FSM, 'IDLE', 'OPEN_CMD')).toEqual({ ok: false, from: 'IDLE', to: 'IDLE' })
    expect(nextState(ENTRY_FSM, 'VEHICLE_DETECTED', 'AUTH_OK').ok).toBe(false)
    expect(nextState(ENTRY_FSM, 'GATE_OPEN', 'GATE_CLOSED').ok).toBe(false)
    expect(nextState(ENTRY_FSM, 'VEHICLE_PASSING', 'GATE_CLOSED').ok).toBe(false)
  })
  it('reabre a cancela se a passagem for obstruída durante o fechamento', () => {
    expect(nextState(ENTRY_FSM, 'GATE_CLOSING', 'P_RISE').to).toBe('GATE_OPENING')
  })
  it('RESET leva qualquer estado para IDLE', () => {
    for (const s of ENTRY_FSM.states) expect(nextState(ENTRY_FSM, s, 'RESET').to).toBe('IDLE')
  })
  it('todos os estados são alcançáveis e possuem rótulos', () => {
    expect(reachableStates(ENTRY_FSM).size).toBe(ENTRY_FSM.states.length)
    for (const s of ENTRY_FSM.states) {
      expect(ENTRY_FSM.labels[s]).toBeTruthy()
      expect(ENTRY_FSM.descriptions[s]).toBeTruthy()
    }
    for (const e of edgesOf(ENTRY_FSM)) expect(ENTRY_FSM.states).toContain(e.to)
  })
})

describe('FSM de saída', () => {
  it('percorre o ciclo completo de uma saída', () => {
    const events: ExitEvent[] = ['EXIT_START', 'SS_RISE', 'CHECK', 'AUTH_OK', 'OPEN_CMD', 'GATE_OPENED', 'PS_RISE', 'PS_FALL', 'GATE_CLOSED', 'DONE']
    let s = EXIT_FSM.initial
    for (const e of events) {
      const r = nextState(EXIT_FSM, s, e)
      expect(r.ok, `${s} --${e}-->`).toBe(true)
      s = r.to
    }
    expect(s).toBe('IDLE')
  })
  it('não abre a cancela de saída sem detecção', () => {
    expect(nextState(EXIT_FSM, 'IDLE', 'OPEN_CMD').ok).toBe(false)
    expect(nextState(EXIT_FSM, 'LEAVING_SPOT', 'AUTH_OK').ok).toBe(false)
  })
  it('todos os estados são alcançáveis', () => {
    expect(reachableStates(EXIT_FSM).size).toBe(EXIT_FSM.states.length)
  })
})
