/**
 * Lógica combinacional de autorização do estacionamento.
 *
 *   ENTRADA_AUTORIZADA = SE · L̄ · M̄      (SE AND NOT L AND NOT M)
 *   SAIDA_AUTORIZADA   = SS · CS          (SS AND CS)
 *   L                  = (ocupadas + reservadas) ≥ 8
 *
 * A tabela-verdade exibida na interface é gerada por ESTA mesma função.
 */
import { AND, NOT, OR, toBit, type Bit } from './gates'
import { CAPACITY, toBits } from './counter'

export interface EntryInputs {
  /** Sensor de entrada: há veículo parado diante da cancela de entrada. */
  SE: Bit
  /** Lotado: não há vaga livre (considerando ocupadas + reservadas). */
  L: Bit
  /** Modo manutenção ativo. */
  M: Bit
}

export function entryAuthorized({ SE, L, M }: EntryInputs): Bit {
  return AND(SE, NOT(L), NOT(M))
}

export interface ExitInputs {
  /** Sensor de saída: há veículo diante da cancela de saída. */
  SS: Bit
  /** Comando de saída válido para o veículo detectado. */
  CS: Bit
}

export function exitAuthorized({ SS, CS }: ExitInputs): Bit {
  return AND(SS, CS)
}

/**
 * Comparador de capacidade. Como a capacidade é 8 = 1000₂, a condição
 * "ocupadas + reservadas ≥ 8" equivale ao bit Q3 da soma (saturada em 8).
 */
export function capacityFull(occupied: number, reserved: number): Bit {
  const committed = Math.min(CAPACITY, Math.max(0, occupied + reserved))
  const viaBit = toBits(committed)[0]
  if (viaBit !== toBit(committed >= CAPACITY)) throw new Error('Comparador inconsistente')
  return viaBit
}

/** Indicador "sistema em operação" (amarelo): OR das duas máquinas ocupadas. */
export const systemBusy = (entryBusy: Bit, exitBusy: Bit): Bit => OR(entryBusy, exitBusy)

export interface EntryTruthRow extends EntryInputs {
  index: number
  ENTRADA_AUTORIZADA: Bit
}

/** Gera as 8 combinações de SE, L e M usando `entryAuthorized`. */
export function entryTruthTable(): EntryTruthRow[] {
  const rows: EntryTruthRow[] = []
  for (let i = 0; i < 8; i++) {
    const SE = ((i >> 2) & 1) as Bit
    const L = ((i >> 1) & 1) as Bit
    const M = (i & 1) as Bit
    rows.push({ index: i, SE, L, M, ENTRADA_AUTORIZADA: entryAuthorized({ SE, L, M }) })
  }
  return rows
}

export const truthRowIndex = ({ SE, L, M }: EntryInputs): number => SE * 4 + L * 2 + M

export function explainEntryDecision({ SE, L, M }: EntryInputs): string {
  if (SE === 0) return 'Nenhum veículo no sensor de entrada (SE = 0).'
  if (M === 1 && L === 1) return 'Entrada negada: modo manutenção ativo e estacionamento sem vagas.'
  if (M === 1) return 'Entrada negada: modo manutenção ativo (M = 1).'
  if (L === 1) return 'Entrada negada: estacionamento lotado (L = 1).'
  return 'Entrada autorizada: veículo detectado, há vaga e o sistema está operacional.'
}
