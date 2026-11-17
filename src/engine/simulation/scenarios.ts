/**
 * Cenários determinísticos para a apresentação acadêmica. Cada cenário parte
 * de um RESET (nova época) e aplica apenas comandos do próprio motor — ou
 * seja, nada é "forçado" na interface.
 */
import {
  requestEntry,
  requestExit,
  resetSimulation,
  setMaintenance,
  setSpeed,
  vehicleIdAtSpot,
  withParkedVehicles,
} from './engine'
import type { SimState } from './types'

export type ScenarioId = 'empty' | 'entry' | 'partial' | 'full' | 'exit' | 'maintenance' | 'logic'

export interface Scenario {
  id: ScenarioId
  number: number
  title: string
  description: string
  expected: string
  /** Aba sugerida para acompanhar o cenário. */
  focus: 'simulation' | 'lab'
  apply: (state: SimState, now: number) => SimState
}

const PARTIAL = ['V01', 'V03', 'V06'] as const
const ALL = ['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08'] as const

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'empty',
    number: 1,
    title: 'Estacionamento vazio',
    description: 'Todas as vagas livres, cancelas fechadas e sensores em 0.',
    expected: 'Contador = 0000 · display 0 · status DISPONÍVEL.',
    focus: 'simulation',
    apply: (s, now) => resetSimulation(s, now),
  },
  {
    id: 'entry',
    number: 2,
    title: 'Entrada de um veículo',
    description: 'Um carro chega, ativa SE, a lógica autoriza, a cancela abre e o carro estaciona.',
    expected: 'SE↑ → AUT = 1 → cancela abre → P↑/P↓ → vaga ocupada → contador 0001.',
    focus: 'simulation',
    apply: (s, now) => requestEntry(resetSimulation(s, now), now),
  },
  {
    id: 'partial',
    number: 3,
    title: 'Parcialmente ocupado',
    description: 'Três carros já estacionados nas vagas V01, V03 e V06.',
    expected: 'Contador = 0011 · 5 vagas disponíveis · L = 0.',
    focus: 'simulation',
    apply: (s, now) => withParkedVehicles(resetSimulation(s, now), PARTIAL, now),
  },
  {
    id: 'full',
    number: 4,
    title: 'Estacionamento lotado',
    description: 'Oito carros estacionados. Um nono veículo tenta entrar.',
    expected: 'Contador = 1000 · L = 1 → ENTRADA_AUTORIZADA = 0 → entrada negada.',
    focus: 'simulation',
    apply: (s, now) => requestEntry(withParkedVehicles(resetSimulation(s, now), ALL, now), now),
  },
  {
    id: 'exit',
    number: 5,
    title: 'Saída de veículo',
    description: 'Com três carros estacionados, o veículo da vaga V03 solicita saída.',
    expected: 'CS = 1 → SS↑ → cancela de saída abre → PS↓ → vaga V03 livre → contador 0011 → 0010.',
    focus: 'simulation',
    apply: (s, now) => {
      const base = withParkedVehicles(resetSimulation(s, now), PARTIAL, now)
      return requestExit(base, vehicleIdAtSpot(base, 'V03'), now)
    },
  },
  {
    id: 'maintenance',
    number: 6,
    title: 'Modo manutenção',
    description: 'M = 1 com vagas livres: o carro que chega é recusado, mas a saída de V06 é permitida.',
    expected: 'ENTRADA_AUTORIZADA = SE·L̄·M̄ = 1·1·0 = 0 · saída concluída normalmente.',
    focus: 'simulation',
    apply: (s, now) => {
      let st = withParkedVehicles(resetSimulation(s, now), PARTIAL, now)
      st = setMaintenance(st, true, now)
      st = requestEntry(st, now)
      return requestExit(st, vehicleIdAtSpot(st, 'V06'), now)
    },
  },
  {
    id: 'logic',
    number: 7,
    title: 'Demonstração da lógica digital',
    description: 'Velocidade reduzida (0,5×) e uma entrada em curso, acompanhada no Laboratório.',
    expected: 'Sinais, portas, tabela-verdade e máquina de estados mudando em tempo real.',
    focus: 'lab',
    apply: (s, now) => {
      let st = withParkedVehicles(resetSimulation(s, now), ['V02', 'V05'], now)
      st = setSpeed(st, 0.5)
      return requestEntry(st, now)
    },
  },
]

export const scenarioById = (id: ScenarioId): Scenario => {
  const sc = SCENARIOS.find((s) => s.id === id)
  if (!sc) throw new Error(`Cenário desconhecido: ${id}`)
  return sc
}
