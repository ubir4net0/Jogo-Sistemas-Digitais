/**
 * DigitalLaboratory — aba "Laboratório de Sistemas Digitais".
 * A simulação continua rodando em segundo plano: tudo que é "ao vivo" aqui
 * reflete os mesmos sinais do estacionamento 3D.
 */
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Binary, Blocks, CarFront, CircuitBoard, Construction, Cpu, GitBranch, LogOut, Pause, Play, Table2, ToggleLeft, Hash } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { LogicCircuit } from './LogicCircuit'
import { GatePlayground } from './GatePlayground'
import { CounterBench, LiveCounter } from './CounterLab'
import { StateMachineLab } from './StateMachineLab'
import { BlockDiagram } from './BlockDiagram'
import { SevenSegmentLab } from './SevenSegmentLab'
import { TruthTable } from '../digital/TruthTable'
import { SignalsGrid } from '../dashboard/LogicPanel'
import { Button } from '../ui/primitives'

const SECTIONS = [
  { id: 'blocos', label: 'Diagrama de blocos', icon: Blocks },
  { id: 'sinais', label: 'Sinais', icon: Cpu },
  { id: 'circuito', label: 'Circuito lógico', icon: CircuitBoard },
  { id: 'verdade', label: 'Tabela-verdade', icon: Table2 },
  { id: 'portas', label: 'Portas lógicas', icon: ToggleLeft },
  { id: 'contador', label: 'Contador', icon: Binary },
  { id: 'display', label: '7 segmentos', icon: Hash },
  { id: 'fsm', label: 'Máquina de estados', icon: GitBranch },
] as const

function Section({ id, title, icon, intro, children }: { id: string; title: string; icon: ReactNode; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="panel scroll-mt-32 p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-sky-400">{icon}</span>
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{intro}</p>
      </header>
      {children}
    </section>
  )
}

function LabControls() {
  const st = useSimulation(useShallow((s) => ({ paused: s.sim.paused, maintenance: s.sim.maintenance })))
  const a = useSimulation(useShallow((s) => ({ add: s.addVehicle, remove: s.removeVehicle, setPaused: s.setPaused, setMaintenance: s.setMaintenance })))
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" icon={<CarFront className="h-4 w-4" />} onClick={a.add} disabled={st.paused}>
        Adicionar veículo
      </Button>
      <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={() => a.remove(null)} disabled={st.paused}>
        Retirar veículo
      </Button>
      <Button variant={st.maintenance ? 'warning' : 'secondary'} icon={<Construction className="h-4 w-4" />} onClick={() => a.setMaintenance(!st.maintenance)}>
        M = {st.maintenance ? 1 : 0}
      </Button>
      <Button variant={st.paused ? 'success' : 'secondary'} icon={st.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={() => a.setPaused(!st.paused)}>
        {st.paused ? 'Continuar' : 'Pausar'}
      </Button>
    </div>
  )
}

export function DigitalLaboratory() {
  const signals = useSimulation((s) => s.sim.signals)
  const decision = useSimulation((s) => s.sim.entry.lastDecision)
  const entryState = useSimulation((s) => s.sim.entry.state)
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">Laboratório</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Laboratório de Sistemas Digitais</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Cada bloco abaixo usa as mesmas funções puras do motor lógico que controla o estacionamento 3D. A simulação continua
              rodando em segundo plano — use os botões para gerar eventos e acompanhar os sinais percorrendo o circuito.
            </p>
          </div>
          <LabControls />
        </div>
        <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Seções do laboratório">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-graphite-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-white">
              <s.icon className="h-3.5 w-3.5 text-sky-400" />
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <Section id="blocos" title="Diagrama de blocos" icon={<Blocks className="h-5 w-5" />} intro="Arquitetura lógica: sensores e comandos alimentam a lógica combinacional; as máquinas de estados acionam cancelas e o contador; o contador (com as reservas) realimenta o comparador que gera L. As linhas tracejadas são realimentações.">
        <BlockDiagram />
      </Section>

      <Section id="sinais" title="Visualização dos sinais" icon={<Cpu className="h-5 w-5" />} intro="Cada sensor físico é representado por um bit: 1 quando detecta um veículo, 0 caso contrário. Os valores abaixo são lidos em tempo real da simulação.">
        <SignalsGrid />
      </Section>

      <Section id="circuito" title="Circuito lógico de autorização" icon={<CircuitBoard className="h-5 w-5" />} intro="Siga o percurso do sinal: os fios em azul animado estão em nível lógico 1. No modo Manual, as entradas são locais e isoladas — servem para explorar o circuito sem alterar o estacionamento.">
        <LogicCircuit />
      </Section>

      <Section id="verdade" title="Tabela-verdade — ENTRADA_AUTORIZADA" icon={<Table2 className="h-5 w-5" />} intro="As 8 combinações de SE, L e M, geradas pela mesma função entryAuthorized() que o controlador executa. Apenas a combinação SE=1, L=0, M=0 libera a entrada.">
        <TruthTable live={{ SE: signals.SE, L: signals.L, M: signals.M }} latched={entryState !== 'IDLE' ? decision : null} />
      </Section>

      <Section id="portas" title="Portas lógicas interativas" icon={<ToggleLeft className="h-5 w-5" />} intro="Ambiente isolado: clique nas entradas A e B para alternar entre 0 e 1 e observe a saída Y e a linha correspondente da tabela-verdade.">
        <GatePlayground />
      </Section>

      <Section id="contador" title="Contador digital de 4 bits" icon={<Binary className="h-5 w-5" />} intro="Simulação comportamental de um contador sequencial: o valor só muda nos eventos confirmados (veículo estacionado → INC; passagem pela saída → DEC). Não há flip-flops físicos — o registrador é o estado da simulação, atualizado por um somador em cascata feito de portas XOR/AND.">
        <div className="space-y-4">
          <LiveCounter />
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Bancada isolada — teste os limites 0 e 8</h3>
            <CounterBench />
          </div>
        </div>
      </Section>

      <Section id="display" title="Display de sete segmentos" icon={<Hash className="h-5 w-5" />} intro="O decodificador BCD → 7 segmentos é um circuito combinacional: cada segmento (a–g) é uma expressão booleana dos bits do contador.">
        <SevenSegmentLab />
      </Section>

      <Section id="fsm" title="Máquina de estados finitos" icon={<GitBranch className="h-5 w-5" />} intro="O controlador é um circuito sequencial: a saída depende do estado atual e dos eventos (bordas dos sensores, temporizadores, fim de curso). O estado ativo aparece destacado e a última transição em amarelo.">
        <StateMachineLab />
      </Section>
    </div>
  )
}
