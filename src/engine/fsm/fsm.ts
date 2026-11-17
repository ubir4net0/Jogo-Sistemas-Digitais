/**
 * Máquinas de Estados Finitos (FSM) determinísticas.
 *
 * Cada máquina é definida por uma tabela de transição
 *   δ : (estado, evento) → próximo estado
 * Eventos não previstos na tabela para o estado atual são REJEITADOS (a
 * máquina permanece no mesmo estado), exatamente como num circuito sequencial
 * cujo próximo estado só muda quando a combinação de entradas é válida.
 */

export interface FsmDefinition<S extends string, E extends string> {
  id: string
  name: string
  initial: S
  states: readonly S[]
  /** Tabela de transição. */
  transitions: { readonly [K in S]: Partial<Record<E, S>> }
  /** Eventos válidos em QUALQUER estado (ex.: RESET). */
  global?: Partial<Record<E, S>>
  labels: Record<S, string>
  descriptions: Record<S, string>
  eventLabels: Record<E, string>
}

export interface TransitionResult<S extends string> {
  ok: boolean
  from: S
  to: S
}

export function nextState<S extends string, E extends string>(
  def: FsmDefinition<S, E>,
  current: S,
  event: E,
): TransitionResult<S> {
  const target = def.transitions[current][event] ?? def.global?.[event]
  if (target === undefined) return { ok: false, from: current, to: current }
  return { ok: true, from: current, to: target }
}

export interface FsmEdge<S extends string, E extends string> {
  from: S
  to: S
  event: E
}

/** Lista todas as arestas do diagrama de estados (para visualização e testes). */
export function edgesOf<S extends string, E extends string>(def: FsmDefinition<S, E>): FsmEdge<S, E>[] {
  const edges: FsmEdge<S, E>[] = []
  for (const from of def.states) {
    const row = def.transitions[from]
    for (const event of Object.keys(row) as E[]) {
      const to = row[event]
      if (to !== undefined) edges.push({ from, to, event })
    }
  }
  return edges
}

/** Estados alcançáveis a partir do inicial (busca em largura). */
export function reachableStates<S extends string, E extends string>(def: FsmDefinition<S, E>): Set<S> {
  const seen = new Set<S>([def.initial])
  const queue: S[] = [def.initial]
  while (queue.length) {
    const s = queue.shift() as S
    for (const to of Object.values(def.transitions[s]) as S[]) {
      if (!seen.has(to)) {
        seen.add(to)
        queue.push(to)
      }
    }
  }
  return seen
}

// ───────────────────────────── FSM DE ENTRADA ─────────────────────────────

export const ENTRY_STATES = [
  'IDLE',
  'VEHICLE_DETECTED',
  'CHECKING_CAPACITY',
  'ACCESS_GRANTED',
  'ACCESS_DENIED',
  'GATE_OPENING',
  'GATE_OPEN',
  'VEHICLE_PASSING',
  'GATE_CLOSING',
  'PARKING',
  'COMPLETED',
] as const
export type EntryState = (typeof ENTRY_STATES)[number]

export type EntryEvent =
  | 'SE_RISE' // sensor de entrada 0 → 1
  | 'CHECK' // temporizador: iniciar verificação
  | 'AUTH_OK' // ENTRADA_AUTORIZADA = 1
  | 'AUTH_FAIL' // ENTRADA_AUTORIZADA = 0
  | 'OPEN_CMD' // comando de abertura da cancela
  | 'GATE_OPENED' // fim de curso: cancela aberta
  | 'P_RISE' // sensor de passagem 0 → 1
  | 'P_FALL' // sensor de passagem 1 → 0 (passagem confirmada)
  | 'GATE_CLOSED' // fim de curso: cancela fechada
  | 'PARKED' // veículo confirmado na vaga
  | 'VEHICLE_CLEARED' // veículo recusado deixou a área da entrada
  | 'DONE' // temporizador: ciclo concluído
  | 'RESET'

export const ENTRY_FSM: FsmDefinition<EntryState, EntryEvent> = {
  id: 'entry',
  name: 'Controlador de Entrada',
  initial: 'IDLE',
  states: ENTRY_STATES,
  transitions: {
    IDLE: { SE_RISE: 'VEHICLE_DETECTED' },
    VEHICLE_DETECTED: { CHECK: 'CHECKING_CAPACITY' },
    CHECKING_CAPACITY: { AUTH_OK: 'ACCESS_GRANTED', AUTH_FAIL: 'ACCESS_DENIED' },
    ACCESS_GRANTED: { OPEN_CMD: 'GATE_OPENING' },
    ACCESS_DENIED: { VEHICLE_CLEARED: 'IDLE' },
    GATE_OPENING: { GATE_OPENED: 'GATE_OPEN' },
    GATE_OPEN: { P_RISE: 'VEHICLE_PASSING' },
    VEHICLE_PASSING: { P_FALL: 'GATE_CLOSING' },
    // Segurança: se algo entrar na zona de passagem durante o fechamento, reabre.
    GATE_CLOSING: { GATE_CLOSED: 'PARKING', P_RISE: 'GATE_OPENING' },
    PARKING: { PARKED: 'COMPLETED' },
    COMPLETED: { DONE: 'IDLE' },
  },
  global: { RESET: 'IDLE' },
  labels: {
    IDLE: 'Aguardando',
    VEHICLE_DETECTED: 'Veículo detectado',
    CHECKING_CAPACITY: 'Verificando capacidade',
    ACCESS_GRANTED: 'Acesso autorizado',
    ACCESS_DENIED: 'Acesso negado',
    GATE_OPENING: 'Abrindo cancela',
    GATE_OPEN: 'Cancela aberta',
    VEHICLE_PASSING: 'Veículo passando',
    GATE_CLOSING: 'Fechando cancela',
    PARKING: 'Estacionando',
    COMPLETED: 'Concluído',
  },
  descriptions: {
    IDLE: 'Nenhuma operação de entrada em curso. Aguarda SE = 1.',
    VEHICLE_DETECTED: 'O laço indutivo detectou um veículo (SE: 0 → 1).',
    CHECKING_CAPACITY: 'Avalia ENTRADA_AUTORIZADA = SE · L̄ · M̄.',
    ACCESS_GRANTED: 'Vaga reservada. Semáforo verde e comando de abertura.',
    ACCESS_DENIED: 'Sem vaga ou em manutenção. O veículo é orientado a retornar.',
    GATE_OPENING: 'Motor da cancela acionado até o fim de curso de abertura.',
    GATE_OPEN: 'Cancela aberta. Aguarda o veículo atingir o sensor de passagem.',
    VEHICLE_PASSING: 'Sensor de passagem ativo (P = 1). A cancela não pode fechar.',
    GATE_CLOSING: 'Passagem confirmada (P: 1 → 0). Cancela fechando.',
    PARKING: 'Veículo circulando até a vaga reservada.',
    COMPLETED: 'Vaga ocupada e contador incrementado.',
  },
  eventLabels: {
    SE_RISE: 'SE↑',
    CHECK: 't > t₁',
    AUTH_OK: 'AUT = 1',
    AUTH_FAIL: 'AUT = 0',
    OPEN_CMD: 'abrir',
    GATE_OPENED: 'fim de curso',
    P_RISE: 'P↑',
    P_FALL: 'P↓',
    GATE_CLOSED: 'fechada',
    PARKED: 'na vaga',
    VEHICLE_CLEARED: 'área livre',
    DONE: 't > t₂',
    RESET: 'R',
  },
}

// ───────────────────────────── FSM DE SAÍDA ──────────────────────────────

export const EXIT_STATES = [
  'IDLE',
  'LEAVING_SPOT',
  'VEHICLE_DETECTED',
  'CHECKING',
  'ACCESS_GRANTED',
  'GATE_OPENING',
  'GATE_OPEN',
  'VEHICLE_PASSING',
  'GATE_CLOSING',
  'COMPLETED',
] as const
export type ExitState = (typeof EXIT_STATES)[number]

export type ExitEvent =
  | 'EXIT_START' // comando de saída aceito (CS = 1), veículo deixa a vaga
  | 'SS_RISE'
  | 'CHECK'
  | 'AUTH_OK'
  | 'OPEN_CMD'
  | 'GATE_OPENED'
  | 'PS_RISE'
  | 'PS_FALL'
  | 'GATE_CLOSED'
  | 'DONE'
  | 'RESET'

export const EXIT_FSM: FsmDefinition<ExitState, ExitEvent> = {
  id: 'exit',
  name: 'Controlador de Saída',
  initial: 'IDLE',
  states: EXIT_STATES,
  transitions: {
    IDLE: { EXIT_START: 'LEAVING_SPOT' },
    LEAVING_SPOT: { SS_RISE: 'VEHICLE_DETECTED' },
    VEHICLE_DETECTED: { CHECK: 'CHECKING' },
    CHECKING: { AUTH_OK: 'ACCESS_GRANTED' },
    ACCESS_GRANTED: { OPEN_CMD: 'GATE_OPENING' },
    GATE_OPENING: { GATE_OPENED: 'GATE_OPEN' },
    GATE_OPEN: { PS_RISE: 'VEHICLE_PASSING' },
    VEHICLE_PASSING: { PS_FALL: 'GATE_CLOSING' },
    GATE_CLOSING: { GATE_CLOSED: 'COMPLETED', PS_RISE: 'GATE_OPENING' },
    COMPLETED: { DONE: 'IDLE' },
  },
  global: { RESET: 'IDLE' },
  labels: {
    IDLE: 'Aguardando',
    LEAVING_SPOT: 'Saindo da vaga',
    VEHICLE_DETECTED: 'Veículo detectado',
    CHECKING: 'Verificando saída',
    ACCESS_GRANTED: 'Saída autorizada',
    GATE_OPENING: 'Abrindo cancela',
    GATE_OPEN: 'Cancela aberta',
    VEHICLE_PASSING: 'Veículo passando',
    GATE_CLOSING: 'Fechando cancela',
    COMPLETED: 'Concluído',
  },
  descriptions: {
    IDLE: 'Nenhuma saída em curso. Aguarda um comando de saída (CS).',
    LEAVING_SPOT: 'Veículo manobrando e seguindo até a cancela de saída.',
    VEHICLE_DETECTED: 'Sensor de saída ativo (SS: 0 → 1).',
    CHECKING: 'Avalia SAIDA_AUTORIZADA = SS · CS.',
    ACCESS_GRANTED: 'Saída liberada. Comando de abertura enviado.',
    GATE_OPENING: 'Cancela de saída abrindo.',
    GATE_OPEN: 'Aguardando o veículo atingir o sensor de passagem de saída.',
    VEHICLE_PASSING: 'Sensor de passagem de saída ativo (PS = 1).',
    GATE_CLOSING: 'Passagem confirmada (PS↓): vaga liberada, contador decrementado.',
    COMPLETED: 'Ciclo de saída concluído.',
  },
  eventLabels: {
    EXIT_START: 'CS = 1',
    SS_RISE: 'SS↑',
    CHECK: 't > t₁',
    AUTH_OK: 'AUT = 1',
    OPEN_CMD: 'abrir',
    GATE_OPENED: 'fim de curso',
    PS_RISE: 'PS↑',
    PS_FALL: 'PS↓',
    GATE_CLOSED: 'fechada',
    DONE: 't > t₂',
    RESET: 'R',
  },
}

export const isEntryBusy = (s: EntryState): boolean => s !== 'IDLE'
export const isExitBusy = (s: ExitState): boolean => s !== 'IDLE'
