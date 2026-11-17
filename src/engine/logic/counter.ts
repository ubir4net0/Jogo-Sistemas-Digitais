/**
 * Contador binário de 4 bits (Q3 Q2 Q1 Q0) — simulação COMPORTAMENTAL de um
 * circuito sequencial síncrono.
 *
 * O incremento e o decremento são calculados como num somador/subtrator em
 * cascata (ripple), usando as portas XOR, AND, NOT e OR. Não há flip-flops
 * físicos: o "registrador" é apenas o estado imutável da simulação.
 *
 * Faixa válida: 0 (0000) até 8 (1000) — a capacidade do estacionamento.
 */
import { AND, NOT, OR, XOR, type Bit } from './gates'

export const COUNTER_BITS = 4
export const CAPACITY = 8

/** Ordem de exibição: [Q3, Q2, Q1, Q0] (MSB → LSB). */
export type Bits4 = readonly [Bit, Bit, Bit, Bit]

export function toBits(value: number): Bits4 {
  if (!Number.isInteger(value) || value < 0 || value > 15) {
    throw new RangeError(`Valor ${value} não representável em 4 bits`)
  }
  return [((value >> 3) & 1) as Bit, ((value >> 2) & 1) as Bit, ((value >> 1) & 1) as Bit, (value & 1) as Bit]
}

export function fromBits(bits: Bits4): number {
  return bits[0] * 8 + bits[1] * 4 + bits[2] * 2 + bits[3]
}

export function bitsToString(bits: Bits4): string {
  return bits.join('')
}

export const formatBinary = (value: number): string => bitsToString(toBits(value))

/** Incrementador em cascata: Qi' = Qi XOR Ci ; Ci+1 = Qi AND Ci ; C0 = EN. */
export function rippleIncrement(bits: Bits4, enable: Bit): Bits4 {
  const [q3, q2, q1, q0] = bits
  const c0 = enable
  const n0 = XOR(q0, c0)
  const c1 = AND(q0, c0)
  const n1 = XOR(q1, c1)
  const c2 = AND(q1, c1)
  const n2 = XOR(q2, c2)
  const c3 = AND(q2, c2)
  const n3 = XOR(q3, c3)
  return [n3, n2, n1, n0]
}

/** Decrementador em cascata: Qi' = Qi XOR Bi ; Bi+1 = NOT(Qi) AND Bi ; B0 = EN. */
export function rippleDecrement(bits: Bits4, enable: Bit): Bits4 {
  const [q3, q2, q1, q0] = bits
  const b0 = enable
  const n0 = XOR(q0, b0)
  const b1 = AND(NOT(q0), b0)
  const n1 = XOR(q1, b1)
  const b2 = AND(NOT(q1), b1)
  const n2 = XOR(q2, b2)
  const b3 = AND(NOT(q2), b2)
  const n3 = XOR(q3, b3)
  return [n3, n2, n1, n0]
}

/**
 * Habilitação do incremento: como a capacidade é 8 = 1000₂, o contador está
 * cheio exatamente quando Q3 = 1. Portanto EN_INC = NOT Q3 (impede overflow).
 */
export const incrementEnable = (bits: Bits4): Bit => NOT(bits[0])

/** Habilitação do decremento: EN_DEC = Q3 OR Q2 OR Q1 OR Q0 (impede underflow). */
export const decrementEnable = (bits: Bits4): Bit => OR(bits[0], bits[1], bits[2], bits[3])

export interface CounterState {
  bits: Bits4
  /** Valor anterior — usado para destacar os bits que mudaram (XOR). */
  previous: Bits4
  /** Número de pulsos de clock efetivamente aplicados. */
  pulses: number
}

export const initialCounter = (value = 0): CounterState => ({
  bits: toBits(value),
  previous: toBits(value),
  pulses: 0,
})

export interface CounterStepResult {
  counter: CounterState
  /** false quando o pulso foi bloqueado pela lógica de habilitação. */
  applied: boolean
}

export function counterIncrement(counter: CounterState): CounterStepResult {
  const en = incrementEnable(counter.bits)
  if (en === 0) return { counter, applied: false }
  return {
    counter: { bits: rippleIncrement(counter.bits, en), previous: counter.bits, pulses: counter.pulses + 1 },
    applied: true,
  }
}

export function counterDecrement(counter: CounterState): CounterStepResult {
  const en = decrementEnable(counter.bits)
  if (en === 0) return { counter, applied: false }
  return {
    counter: { bits: rippleDecrement(counter.bits, en), previous: counter.bits, pulses: counter.pulses + 1 },
    applied: true,
  }
}

export const counterValue = (counter: CounterState): number => fromBits(counter.bits)

/** Máscara de bits alterados: Δi = Qi(anterior) XOR Qi(atual). */
export function changedBits(previous: Bits4, current: Bits4): Bits4 {
  return [
    XOR(previous[0], current[0]),
    XOR(previous[1], current[1]),
    XOR(previous[2], current[2]),
    XOR(previous[3], current[3]),
  ]
}
