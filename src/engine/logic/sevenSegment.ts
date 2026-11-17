/**
 * Decodificador BCD → display de 7 segmentos (catodo comum).
 *
 *        a
 *      ┌───┐
 *    f │ g │ b
 *      ├───┤
 *    e │   │ c
 *      └───┘
 *        d
 *
 * Duas implementações equivalentes:
 *  1. `SEGMENT_TABLE` — tabela de consulta (como uma ROM).
 *  2. `decodeSevenSegment` — expressões booleanas minimizadas (mapas de
 *     Karnaugh) construídas com as portas AND/OR/NOT.
 * Os testes garantem que ambas produzem exatamente o mesmo resultado.
 */
import { AND, NOT, OR, type Bit } from './gates'
import { toBits, type Bits4 } from './counter'

export type SegmentName = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'
export const SEGMENT_NAMES: readonly SegmentName[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
export type SegmentState = Record<SegmentName, Bit>

const fromPattern = (pattern: string): SegmentState => {
  const s = {} as SegmentState
  for (const name of SEGMENT_NAMES) s[name] = pattern.includes(name) ? 1 : 0
  return s
}

/** Tabela de consulta para os dígitos decimais 0–9. */
export const SEGMENT_TABLE: Readonly<Record<number, SegmentState>> = {
  0: fromPattern('abcdef'),
  1: fromPattern('bc'),
  2: fromPattern('abdeg'),
  3: fromPattern('abcdg'),
  4: fromPattern('bcfg'),
  5: fromPattern('acdfg'),
  6: fromPattern('acdefg'),
  7: fromPattern('abc'),
  8: fromPattern('abcdefg'),
  9: fromPattern('abcdfg'),
}

export const segmentsForDigit = (digit: number): SegmentState => {
  const s = SEGMENT_TABLE[digit]
  if (!s) throw new RangeError(`Dígito ${digit} fora da faixa 0–9`)
  return s
}

/** Expressões booleanas de cada segmento — A=Q3, B=Q2, C=Q1, D=Q0 (X' = NOT X). */
export const SEGMENT_EXPRESSIONS: Readonly<Record<SegmentName, string>> = {
  a: "A + C + B·D + B'·D'",
  b: "B' + C'·D' + C·D",
  c: "B + C' + D",
  d: "A + B'·D' + B'·C + C·D' + B·C'·D",
  e: "B'·D' + C·D'",
  f: "A + C'·D' + B·C' + B·D'",
  g: "A + B·C' + B'·C + C·D'",
}

/** Decodificador combinacional implementado com portas lógicas. */
export function decodeSevenSegment(bits: Bits4): SegmentState {
  const [A, B, C, D] = bits
  const nB = NOT(B)
  const nC = NOT(C)
  const nD = NOT(D)
  return {
    a: OR(A, C, AND(B, D), AND(nB, nD)),
    b: OR(nB, AND(nC, nD), AND(C, D)),
    c: OR(B, nC, D),
    d: OR(A, AND(nB, nD), AND(nB, C), AND(C, nD), AND(B, nC, D)),
    e: OR(AND(nB, nD), AND(C, nD)),
    f: OR(A, AND(nC, nD), AND(B, nC), AND(B, nD)),
    g: OR(A, AND(B, nC), AND(nB, C), AND(C, nD)),
  }
}

export const decodeValue = (value: number): SegmentState => decodeSevenSegment(toBits(value))
