import { describe, expect, it } from 'vitest'
import { AND, NOT, OR, XOR, gateTruthTable, type Bit } from '../src/engine/logic/gates'
import {
  bitsToString,
  changedBits,
  counterDecrement,
  counterIncrement,
  counterValue,
  decrementEnable,
  formatBinary,
  fromBits,
  incrementEnable,
  initialCounter,
  rippleDecrement,
  rippleIncrement,
  toBits,
} from '../src/engine/logic/counter'
import {
  SEGMENT_NAMES,
  SEGMENT_TABLE,
  decodeSevenSegment,
  decodeValue,
  segmentsForDigit,
} from '../src/engine/logic/sevenSegment'
import {
  capacityFull,
  entryAuthorized,
  entryTruthTable,
  exitAuthorized,
  systemBusy,
  truthRowIndex,
} from '../src/engine/logic/authorization'

const B: Bit[] = [0, 1]

describe('Portas lógicas', () => {
  it('AND', () => {
    expect(AND(0, 0)).toBe(0)
    expect(AND(0, 1)).toBe(0)
    expect(AND(1, 0)).toBe(0)
    expect(AND(1, 1)).toBe(1)
    expect(AND(1, 1, 1)).toBe(1)
    expect(AND(1, 1, 0)).toBe(0)
  })
  it('OR', () => {
    expect(OR(0, 0)).toBe(0)
    expect(OR(0, 1)).toBe(1)
    expect(OR(1, 0)).toBe(1)
    expect(OR(1, 1)).toBe(1)
    expect(OR(0, 0, 0, 1)).toBe(1)
  })
  it('NOT', () => {
    expect(NOT(0)).toBe(1)
    expect(NOT(1)).toBe(0)
  })
  it('XOR', () => {
    expect(XOR(0, 0)).toBe(0)
    expect(XOR(0, 1)).toBe(1)
    expect(XOR(1, 0)).toBe(1)
    expect(XOR(1, 1)).toBe(0)
  })
  it('AND/OR exigem ao menos duas entradas', () => {
    expect(() => AND(1)).toThrow()
    expect(() => OR(1)).toThrow()
  })
  it('leis de De Morgan valem para todas as combinações', () => {
    for (const a of B)
      for (const b of B) {
        expect(NOT(AND(a, b))).toBe(OR(NOT(a), NOT(b)))
        expect(NOT(OR(a, b))).toBe(AND(NOT(a), NOT(b)))
        expect(XOR(a, b)).toBe(OR(AND(a, NOT(b)), AND(NOT(a), b)))
      }
  })
  it('tabelas-verdade das portas são geradas pelas próprias funções', () => {
    expect(gateTruthTable('AND').map((r) => r.y)).toEqual([0, 0, 0, 1])
    expect(gateTruthTable('OR').map((r) => r.y)).toEqual([0, 1, 1, 1])
    expect(gateTruthTable('XOR').map((r) => r.y)).toEqual([0, 1, 1, 0])
    expect(gateTruthTable('NOT').map((r) => r.y)).toEqual([1, 0])
  })
})

describe('Conversão binária (4 bits)', () => {
  const expected = ['0000', '0001', '0010', '0011', '0100', '0101', '0110', '0111', '1000']
  it('representa 0 a 8 corretamente', () => {
    expected.forEach((bin, n) => {
      expect(formatBinary(n)).toBe(bin)
      expect(fromBits(toBits(n))).toBe(n)
    })
  })
  it('rejeita valores não representáveis', () => {
    expect(() => toBits(-1)).toThrow(RangeError)
    expect(() => toBits(16)).toThrow(RangeError)
    expect(() => toBits(2.5)).toThrow(RangeError)
  })
  it('incrementador e decrementador em cascata equivalem a ±1', () => {
    for (let n = 0; n < 15; n++) expect(fromBits(rippleIncrement(toBits(n), 1))).toBe(n + 1)
    for (let n = 1; n < 16; n++) expect(fromBits(rippleDecrement(toBits(n), 1))).toBe(n - 1)
    expect(bitsToString(rippleIncrement(toBits(5), 0))).toBe('0101')
  })
})

describe('Contador sequencial 0–8', () => {
  it('conta de 0 até 8 e satura (sem overflow)', () => {
    let c = initialCounter(0)
    for (let n = 1; n <= 8; n++) {
      const r = counterIncrement(c)
      expect(r.applied).toBe(true)
      c = r.counter
      expect(counterValue(c)).toBe(n)
    }
    expect(bitsToString(c.bits)).toBe('1000')
    expect(incrementEnable(c.bits)).toBe(0)
    const blocked = counterIncrement(c)
    expect(blocked.applied).toBe(false)
    expect(counterValue(blocked.counter)).toBe(8)
  })
  it('decrementa até 0 e bloqueia underflow', () => {
    let c = initialCounter(3)
    c = counterDecrement(c).counter
    c = counterDecrement(c).counter
    c = counterDecrement(c).counter
    expect(counterValue(c)).toBe(0)
    expect(decrementEnable(c.bits)).toBe(0)
    const r = counterDecrement(c)
    expect(r.applied).toBe(false)
    expect(counterValue(r.counter)).toBe(0)
  })
  it('registra o valor anterior e destaca bits alterados via XOR', () => {
    const c = counterIncrement(initialCounter(7)).counter
    expect(bitsToString(c.previous)).toBe('0111')
    expect(bitsToString(c.bits)).toBe('1000')
    expect(bitsToString(changedBits(c.previous, c.bits))).toBe('1111')
    expect(bitsToString(changedBits(toBits(2), toBits(3)))).toBe('0001')
  })
})

describe('Display de 7 segmentos', () => {
  it('mapeia corretamente os dígitos 0–8', () => {
    const lit = (n: number) =>
      SEGMENT_NAMES.filter((s) => segmentsForDigit(n)[s] === 1).join('')
    expect(lit(0)).toBe('abcdef')
    expect(lit(1)).toBe('bc')
    expect(lit(2)).toBe('abdeg')
    expect(lit(3)).toBe('abcdg')
    expect(lit(4)).toBe('bcfg')
    expect(lit(5)).toBe('acdfg')
    expect(lit(6)).toBe('acdefg')
    expect(lit(7)).toBe('abc')
    expect(lit(8)).toBe('abcdefg')
  })
  it('decodificador por portas lógicas coincide com a tabela (0–9)', () => {
    for (let n = 0; n <= 9; n++) expect(decodeSevenSegment(toBits(n))).toEqual(SEGMENT_TABLE[n])
  })
  it('decodeValue usa o mesmo decodificador', () => {
    expect(decodeValue(8)).toEqual(SEGMENT_TABLE[8])
    expect(() => segmentsForDigit(10)).toThrow(RangeError)
  })
})

describe('Autorização de entrada (SE · L̄ · M̄)', () => {
  it('tabela-verdade completa com 8 combinações', () => {
    const table = entryTruthTable()
    expect(table).toHaveLength(8)
    const authorized = table.filter((r) => r.ENTRADA_AUTORIZADA === 1)
    expect(authorized).toHaveLength(1)
    expect(authorized[0]).toMatchObject({ SE: 1, L: 0, M: 0 })
    table.forEach((r) => {
      expect(r.ENTRADA_AUTORIZADA).toBe(AND(r.SE, NOT(r.L), NOT(r.M)))
      expect(truthRowIndex(r)).toBe(r.index)
    })
  })
  it('casos individuais', () => {
    expect(entryAuthorized({ SE: 1, L: 0, M: 0 })).toBe(1)
    expect(entryAuthorized({ SE: 0, L: 0, M: 0 })).toBe(0)
    expect(entryAuthorized({ SE: 1, L: 1, M: 0 })).toBe(0)
    expect(entryAuthorized({ SE: 1, L: 0, M: 1 })).toBe(0)
  })
  it('saída = SS · CS', () => {
    expect(exitAuthorized({ SS: 1, CS: 1 })).toBe(1)
    expect(exitAuthorized({ SS: 1, CS: 0 })).toBe(0)
    expect(exitAuthorized({ SS: 0, CS: 1 })).toBe(0)
  })
  it('L considera vagas ocupadas + reservadas', () => {
    expect(capacityFull(0, 0)).toBe(0)
    expect(capacityFull(7, 0)).toBe(0)
    expect(capacityFull(7, 1)).toBe(1)
    expect(capacityFull(8, 0)).toBe(1)
    expect(capacityFull(6, 2)).toBe(1)
  })
  it('indicador de operação é um OR', () => {
    expect(systemBusy(0, 0)).toBe(0)
    expect(systemBusy(1, 0)).toBe(1)
    expect(systemBusy(0, 1)).toBe(1)
  })
})
