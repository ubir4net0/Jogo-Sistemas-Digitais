/** EducationalContent — aba "Sobre o projeto". */
import type { ReactNode } from 'react'
import { AlertTriangle, BookOpen, Cpu, Layers } from 'lucide-react'

interface Topic {
  n: number
  title: string
  body: ReactNode
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono text-[0.85em] text-sky-300">{children}</code>
)

const TOPICS: Topic[] = [
  {
    n: 1,
    title: 'O problema físico representado',
    body: (
      <>
        Estacionamentos precisam controlar quantos veículos entram, impedir a entrada quando estão lotados e liberar a saída com
        segurança. Fazer isso manualmente é lento e sujeito a erros. Um sistema automatizado usa <b>sensores</b> para perceber os
        veículos, um <b>controlador digital</b> para decidir e <b>atuadores</b> (cancelas e semáforos) para agir. Este projeto modela
        esse sistema com 8 vagas, uma entrada e uma saída independentes.
      </>
    ),
  },
  {
    n: 2,
    title: 'Sensores transformados em sinais binários',
    body: (
      <>
        Um laço indutivo no piso ou uma barreira óptica produz uma grandeza física contínua (variação de indutância, luz recebida).
        Um circuito condicionador compara essa grandeza com um limiar e entrega um nível lógico: <Code>1</Code> (veículo presente) ou{' '}
        <Code>0</Code> (ausente). Na simulação, os sinais <Code>SE</Code>, <Code>P</Code>, <Code>SS</Code> e <Code>PS</Code> são
        calculados geometricamente: valem 1 quando a carroceria do carro se sobrepõe à região do sensor.
      </>
    ),
  },
  {
    n: 3,
    title: 'Aplicação das portas lógicas',
    body: (
      <>
        A decisão de entrada é uma função booleana: <Code>ENTRADA_AUTORIZADA = SE · L̄ · M̄</Code>. O inversor (NOT) complementa L e M e a
        porta AND só produz 1 se houver veículo, houver vaga e o sistema não estiver em manutenção. A saída usa{' '}
        <Code>SAIDA_AUTORIZADA = SS · CS</Code>. A porta XOR destaca quais bits do contador mudaram, e o OR combina os estados das
        máquinas no indicador "operação em andamento". As funções <Code>AND</Code>, <Code>OR</Code>, <Code>NOT</Code> e <Code>XOR</Code> são
        realmente chamadas pelo controlador.
      </>
    ),
  },
  {
    n: 4,
    title: 'Representação decimal e binária',
    body: (
      <>
        Em base 2, cada bit vale uma potência de dois: Q3 = 8, Q2 = 4, Q1 = 2, Q0 = 1. Assim, 5 = 0·8 + 1·4 + 0·2 + 1·1 ={' '}
        <Code>0101</Code> e 8 = <Code>1000</Code>. Quatro bits representam de 0 a 15; como a capacidade é 8, a faixa útil é 0000 a 1000.
      </>
    ),
  },
  {
    n: 5,
    title: 'O contador sequencial',
    body: (
      <>
        O contador guarda quantos veículos estão <b>confirmados</b> nas vagas. Ele incrementa quando um carro termina de estacionar e
        decrementa quando um carro atravessa completamente a cancela de saída (borda de descida de PS). O incremento é calculado como
        um somador em cascata (<Code>Qᵢ′ = Qᵢ ⊕ Cᵢ</Code>, <Code>Cᵢ₊₁ = Qᵢ · Cᵢ</Code>) com habilitação <Code>EN = NOT Q3</Code>, o que impede
        passar de 8; o decremento só é habilitado se algum bit for 1, o que impede valores negativos. É uma simulação comportamental: não
        existem flip-flops físicos no navegador.
      </>
    ),
  },
  {
    n: 6,
    title: 'Máquinas de estados',
    body: (
      <>
        Uma FSM tem um conjunto finito de estados, eventos de entrada e uma função de transição δ(estado, evento) → próximo estado. A FSM
        de entrada percorre <Code>IDLE → VEHICLE_DETECTED → CHECKING_CAPACITY → ACCESS_GRANTED → GATE_OPENING → GATE_OPEN → VEHICLE_PASSING → GATE_CLOSING → PARKING → COMPLETED</Code>,
        ou <Code>ACCESS_DENIED</Code> quando a autorização é 0. Eventos fora da tabela são rejeitados — por exemplo, a cancela nunca recebe
        "abrir" sem antes passar por <Code>ACCESS_GRANTED</Code>.
      </>
    ),
  },
  {
    n: 7,
    title: 'Acionamento das cancelas',
    body: (
      <>
        A cancela é um atuador com estados <Code>CLOSED</Code>, <Code>OPENING</Code>, <Code>OPEN</Code>, <Code>CLOSING</Code> (e{' '}
        <Code>BLOCKED</Code> quando a entrada está impedida). A FSM envia o comando de abertura; o "fim de curso" informa quando a haste chegou
        a 90°. O fechamento só começa após a borda de descida do sensor de passagem (o veículo já saiu da região), e se algo entrar na
        passagem durante o fechamento a cancela reabre por segurança.
      </>
    ),
  },
  {
    n: 8,
    title: 'Circuitos combinacionais × sequenciais',
    body: (
      <>
        Em um <b>circuito combinacional</b> a saída depende apenas das entradas atuais (ex.: <Code>SE · L̄ · M̄</Code>, decodificador de 7
        segmentos). Em um <b>circuito sequencial</b> a saída depende também do <b>estado armazenado</b> — da história do sistema (ex.: contador
        e máquinas de estados). Por isso o painel mostra a avaliação contínua de ENTRADA_AUTORIZADA e, separadamente, a <i>última decisão
        registrada</i> pela FSM.
      </>
    ),
  },
  {
    n: 9,
    title: 'Implementação com hardware real',
    body: (
      <>
        Num sistema físico, os laços indutivos e barreiras infravermelhas seriam ligados a entradas digitais de um microcontrolador (ex.:
        Arduino/ESP32) ou CLP, ou a uma FPGA. A lógica de autorização poderia ser feita com CIs 74HC08 (AND) e 74HC04 (NOT); o contador com um
        74HC193 (contador up/down síncrono) e o display com um decodificador 74HC4511. A FSM seria codificada em flip-flops tipo D (ou em
        firmware), com relés/drivers acionando os motores das cancelas e os semáforos.
      </>
    ),
  },
  {
    n: 10,
    title: 'Limitações da simulação',
    body: (
      <>
        O navegador <b>não executa um circuito físico</b>: tudo é uma simulação digital comportamental em software. Não há ruído elétrico,
        trepidação (bounce) dos sensores, atrasos de propagação nas portas, metaestabilidade, falhas mecânicas ou variação de tempo real
        do hardware. Os veículos seguem trajetórias geométricas predefinidas (não há física automotiva) e o tempo é discretizado em passos
        de 1/60 s. Mesmo assim, as regras lógicas, a máquina de estados e o contador são implementados e testados de forma idêntica ao que se
        espera de um controlador real.
      </>
    ),
  },
]

const MAPPING: [string, string, string][] = [
  ['Sensor de presença (laço indutivo)', 'Sinal binário SE / SS', 'Entrada digital 0 ou 1'],
  ['Barreira óptica sob a cancela', 'Sinal P / PS', 'Borda de descida = passagem confirmada'],
  ['Veículo detectado', 'Evento digital SE↑', 'Dispara transição da FSM'],
  ['Cancela elétrica', 'Atuador controlado', 'Estados CLOSED / OPENING / OPEN / CLOSING'],
  ['Semáforo', 'Saída digital', 'Vermelho, amarelo ou verde conforme a FSM'],
  ['Quantidade de veículos', 'Contador binário 4 bits', 'Q3 Q2 Q1 Q0 (0000 a 1000)'],
  ['Estacionamento cheio', 'Condição lógica L', 'ocupadas + reservadas ≥ 8'],
  ['Chave de manutenção', 'Sinal M', 'Bloqueia novas entradas'],
  ['Painel de LEDs de vagas', 'Display de 7 segmentos + LEDs', 'Decodificador combinacional'],
  ['Controlador eletrônico', 'Máquina de estados finitos', 'Circuito sequencial'],
]

export function EducationalContent() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-6 sm:px-6">
      <div className="panel p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">Sobre o projeto</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Smart Parking 3D — gêmeo digital educacional</h1>
        <p className="mt-3 text-slate-300">
          Projeto acadêmico da disciplina de <b>Sistemas Digitais</b> (Engenharia da Computação). Ele transforma um estacionamento
          automatizado do mundo real em uma representação digital tridimensional e interativa, sustentada por um motor lógico próprio:
          sinais binários, portas lógicas, contador de 4 bits, decodificador de 7 segmentos e máquinas de estados finitos.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Layers, t: 'Ambiente 3D', d: 'Three.js + React Three Fiber, modelos construídos por código.' },
            { icon: Cpu, t: 'Motor lógico', d: 'Funções puras em TypeScript, independentes da interface.' },
            { icon: BookOpen, t: 'Testado', d: 'Vitest valida portas, contador, FSMs e a simulação completa.' },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-slate-700/60 bg-graphite-900/60 p-3">
              <c.icon className="mb-1.5 h-5 w-5 text-sky-400" />
              <div className="text-sm font-semibold text-white">{c.t}</div>
              <div className="text-xs text-slate-400">{c.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TOPICS.map((t) => (
          <article key={t.n} className="panel p-5">
            <h2 className="mb-2 flex items-center gap-2.5 text-base font-bold text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-electric-500/20 font-mono text-sm text-sky-300">{t.n}</span>
              {t.title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">{t.body}</p>
          </article>
        ))}
      </div>

      <div className="panel p-5">
        <h2 className="mb-3 text-lg font-bold text-white">Mundo real × sistema digital</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-graphite-800 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2.5">Mundo real</th>
                <th className="px-3 py-2.5">Sistema digital</th>
                <th className="px-3 py-2.5">Na simulação</th>
              </tr>
            </thead>
            <tbody>
              {MAPPING.map(([a, b, c]) => (
                <tr key={a} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{a}</td>
                  <td className="px-3 py-2 font-medium text-sky-300">{b}</td>
                  <td className="px-3 py-2 text-slate-400">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <p>
          <b>Importante:</b> esta aplicação é uma simulação digital comportamental. Ela reproduz a lógica de um controlador real, mas não
          executa um circuito eletrônico físico nem se comunica com hardware.
        </p>
      </div>
    </div>
  )
}
