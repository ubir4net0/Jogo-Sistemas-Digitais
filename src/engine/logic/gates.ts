/**
 * Portas lógicas fundamentais.
 *
 * Todas as funções são puras e operam exclusivamente sobre bits (0 | 1).
 * São utilizadas diretamente pelo controlador do estacionamento (autorização
 * de entrada/saída, contador, decodificador de 7 segmentos) — não são apenas
 * decorativas.
 */

export type Bit = 0 | 1

export const toBit = (value: boolean): Bit => (value ? 1 : 0)
export const isHigh = (bit: Bit): boolean => bit === 1

/** AND — saída 1 somente se TODAS as entradas forem 1. */
export function AND(...inputs: Bit[]): Bit {
  if (inputs.length < 2) throw new Error('AND requer pelo menos duas entradas')
  for (const bit of inputs) if (bit === 0) return 0
  return 1
}

/** OR — saída 1 se AO MENOS UMA entrada for 1. */
export function OR(...inputs: Bit[]): Bit {
  if (inputs.length < 2) throw new Error('OR requer pelo menos duas entradas')
  for (const bit of inputs) if (bit === 1) return 1
  return 0
}

/** NOT — inversor: troca 0 por 1 e 1 por 0. */
export function NOT(a: Bit): Bit {
  return a === 1 ? 0 : 1
}

/** XOR — OU exclusivo: saída 1 quando as entradas são DIFERENTES. */
export function XOR(a: Bit, b: Bit): Bit {
  return a !== b ? 1 : 0
}

export type GateName = 'AND' | 'OR' | 'NOT' | 'XOR'

export interface GateDefinition {
  name: GateName
  arity: 1 | 2
  expression: string
  description: string
  evaluate: (a: Bit, b: Bit) => Bit
}

export const GATES: Record<GateName, GateDefinition> = {
  AND: {
    name: 'AND',
    arity: 2,
    expression: 'Y = A · B',
    description: 'A saída só vai para 1 quando todas as entradas estão em 1.',
    evaluate: (a, b) => AND(a, b),
  },
  OR: {
    name: 'OR',
    arity: 2,
    expression: 'Y = A + B',
    description: 'A saída vai para 1 quando pelo menos uma entrada está em 1.',
    evaluate: (a, b) => OR(a, b),
  },
  NOT: {
    name: 'NOT',
    arity: 1,
    expression: 'Y = Ā',
    description: 'Inversor: a saída é sempre o complemento da entrada.',
    evaluate: (a) => NOT(a),
  },
  XOR: {
    name: 'XOR',
    arity: 2,
    expression: 'Y = A ⊕ B',
    description: 'OU exclusivo: a saída vai para 1 quando as entradas são diferentes.',
    evaluate: (a, b) => XOR(a, b),
  },
}

export interface GateTruthRow {
  a: Bit
  b: Bit
  y: Bit
}

/** Gera a tabela-verdade de uma porta usando a própria função lógica. */
export function gateTruthTable(name: GateName): GateTruthRow[] {
  const gate = GATES[name]
  if (gate.arity === 1) {
    return ([0, 1] as Bit[]).map((a) => ({ a, b: 0 as Bit, y: gate.evaluate(a, 0) }))
  }
  const rows: GateTruthRow[] = []
  for (const a of [0, 1] as Bit[]) for (const b of [0, 1] as Bit[]) rows.push({ a, b, y: gate.evaluate(a, b) })
  return rows
}
