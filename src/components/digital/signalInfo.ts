import type { SignalName } from '../../engine/simulation/types'

export interface SignalInfo {
  name: SignalName
  title: string
  description: string
  kind: 'sensor' | 'command' | 'condition' | 'output'
}

export const SIGNAL_INFO: Record<SignalName, SignalInfo> = {
  SE: { name: 'SE', title: 'Sensor de entrada', description: 'Laço indutivo antes da cancela de entrada. 1 = veículo presente.', kind: 'sensor' },
  P: { name: 'P', title: 'Passagem (entrada)', description: 'Barreira óptica sob a cancela. 1 = veículo atravessando.', kind: 'sensor' },
  SS: { name: 'SS', title: 'Sensor de saída', description: 'Laço indutivo antes da cancela de saída. 1 = veículo presente.', kind: 'sensor' },
  PS: { name: 'PS', title: 'Passagem (saída)', description: 'Barreira óptica após a cancela de saída. 1 = veículo atravessando.', kind: 'sensor' },
  L: { name: 'L', title: 'Lotado', description: '1 quando ocupadas + reservadas = 8 (comparador de capacidade).', kind: 'condition' },
  M: { name: 'M', title: 'Manutenção', description: '1 quando o operador bloqueia novas entradas.', kind: 'command' },
  CE: { name: 'CE', title: 'Comando de entrada', description: 'Pulso gerado ao solicitar um novo veículo.', kind: 'command' },
  CS: { name: 'CS', title: 'Comando de saída', description: '1 enquanto há uma saída válida em execução.', kind: 'command' },
  R: { name: 'R', title: 'Reset', description: 'Pulso de reinicialização: leva as FSMs a IDLE e zera o contador.', kind: 'command' },
  ENTRADA_AUTORIZADA: { name: 'ENTRADA_AUTORIZADA', title: 'Entrada autorizada', description: 'SE · L̄ · M̄ (avaliação combinacional contínua).', kind: 'output' },
  SAIDA_AUTORIZADA: { name: 'SAIDA_AUTORIZADA', title: 'Saída autorizada', description: 'SS · CS (avaliação combinacional contínua).', kind: 'output' },
}

export const INPUT_SIGNALS: SignalName[] = ['SE', 'SS', 'P', 'PS', 'L', 'M', 'CE', 'CS', 'R']
