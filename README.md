# Smart Parking 3D — Sistema Digital de Estacionamento Inteligente

Gêmeo digital (*digital twin*) educacional de um estacionamento automatizado, desenvolvido para a disciplina de **Sistemas Digitais** do curso de Engenharia da Computação.

O estacionamento é **realmente tridimensional** (Three.js / React Three Fiber): carros 3D percorrem a rua, acionam sensores, aguardam a cancela, entram, circulam e estacionam, enquanto um **motor lógico independente** — portas lógicas, contador binário de 4 bits, decodificador de 7 segmentos e máquinas de estados finitos — toma todas as decisões.

> A aplicação é uma **simulação digital comportamental**. Ela reproduz a lógica de um controlador real, mas não executa um circuito físico nem se comunica com hardware.

---

## Objetivo acadêmico

Demonstrar, de forma visual e interativa, como um sistema físico é transformado em um sistema digital:

| Mundo real | Sistema digital |
|---|---|
| Sensor de presença (laço indutivo / barreira óptica) | Sinal binário `SE`, `SS`, `P`, `PS` |
| Veículo detectado | Evento digital (borda de subida) |
| Cancela elétrica e semáforo | Atuadores controlados |
| Quantidade de veículos | Contador binário `Q3 Q2 Q1 Q0` |
| Estacionamento cheio | Condição lógica `L` |
| Controlador eletrônico | Máquina de estados finitos |

## Tecnologias

- **React 19 + TypeScript (strict)** e **Vite 7**
- **Three.js**, **@react-three/fiber** e **@react-three/drei** (cena 3D, câmera orbital)
- **Zustand** (store única) + **Immer** (estado imutável)
- **Tailwind CSS 4**, **Motion for React** (animações de interface), **Lucide React** (ícones)
- **Vitest** (testes do motor lógico e da simulação)

Sem backend, sem banco de dados, sem serviços externos. Todos os modelos 3D e texturas de texto são gerados por código (funciona offline após `npm install`).

---

## Como instalar e executar

Requisitos: **Node.js 20+** (testado com Node 22) e um navegador com WebGL (Chrome, Edge ou Firefox atualizados).

```bash
cd smart-parking-3d
npm install          # instala as dependências
npm run dev          # servidor de desenvolvimento → http://localhost:5173
```

Build de produção:

```bash
npm run build        # verificação de tipos + bundle otimizado em dist/
npm run preview      # serve o build → http://localhost:4173
```

Testes:

```bash
npm test             # executa todos os testes (Vitest)
npm run test:watch   # modo observação
```

> Para a apresentação, recomenda-se `npm run build && npm run preview` (versão otimizada).

---

## Arquitetura

```
src/
├── engine/                      ← NÚCLEO LÓGICO (TypeScript puro, sem React/Three)
│   ├── logic/
│   │   ├── gates.ts             AND, OR, NOT, XOR + tabelas-verdade
│   │   ├── authorization.ts     ENTRADA_AUTORIZADA = SE·L̄·M̄ · SAIDA = SS·CS · comparador L
│   │   ├── counter.ts           contador 4 bits (somador/subtrator em cascata com portas)
│   │   └── sevenSegment.ts      decodificador BCD → 7 segmentos (tabela + expressões booleanas)
│   ├── fsm/fsm.ts               FiniteStateMachine: tabelas de transição de entrada e saída
│   └── simulation/
│       ├── engine.ts            SimulationEngine: tick, sensores, despacho, FSMs, ações
│       ├── layout.ts            planta: vagas, sensores, cancelas e rotas geométricas
│       ├── geometry.ts          trajetórias (retas + arcos), amostragem de pose, colisão (SAT)
│       ├── scenarios.ts         7 cenários determinísticos de apresentação
│       ├── derived.ts           valores derivados (status, KPIs, semáforos)
│       └── types.ts             tipos do estado da simulação
├── store/
│   ├── simulationStore.ts       fonte única de verdade (Zustand) + comandos
│   └── uiStore.ts               estado visual (aba, seleção, câmera, qualidade)
├── hooks/useSimulationClock.ts  SimulationScheduler: relógio único (requestAnimationFrame)
├── components/
│   ├── scene/                   Scene3D, ParkingEnvironment, Car3D, Gate3D, Sensor3D,
│   │                            ParkingSpot3D, CameraController, ViewportOverlay
│   ├── dashboard/               ControlDashboard, EventHistory, painéis de status/controle/lógica
│   ├── lab/                     DigitalLaboratory (circuito, portas, contador, FSM, blocos, 7 seg.)
│   ├── digital/                 SevenSegment, BinaryCounter, TruthTable, FsmDiagram, GateSymbol
│   └── about/                   EducationalContent
tests/                           logic.test.ts · fsm.test.ts · engine.test.ts
```

### Princípios de projeto

1. **Fonte única de verdade.** Todo o estado (veículos, vagas, sensores, cancelas, contador, FSMs, histórico) vive em um único objeto imutável `SimState`.
2. **Ações puras e determinísticas.** `requestEntry`, `requestExit`, `setMaintenance`, `resetSimulation`, `tick`… são funções `(estado, entrada) → novo estado`.
3. **Tempo único.** Movimentos, temporizadores das FSMs, animação das cancelas e o modo automático avançam **somente** dentro de `tick(dt)`. Não existe `setTimeout` na lógica — por isso pausa, reset e desmontagem nunca deixam *callbacks* antigos alterando o estado novo. O `dt` é fracionado em subpassos de 1/60 s (velocidade 0,5× a 4× sem perda de precisão).
4. **A cena 3D apenas lê.** `Car3D` e `Gate3D` leem a pose/ângulo do motor a cada quadro (`useFrame`) e aplicam diretamente aos objetos Three.js, sem re-renderizar o React e sem estado paralelo.
5. **Sensores físicos → bits.** `SE`, `P`, `SS` e `PS` são calculados pela sobreposição geométrica da carroceria do carro com a região do sensor. As FSMs reagem às **bordas** (0→1, 1→0) desses sinais.

---

## A simulação 3D

- Estacionamento com **8 vagas (V01–V08)**, corredor de sentido único, entrada e saída independentes, rua de mão dupla, calçadas, muros, cabine de controle, iluminação pública, árvores e edifícios.
- **Cancelas 3D** com gabinete, haste listrada girando em torno de um pivô real e LED de estado (`CLOSED`, `OPENING`, `OPEN`, `CLOSING`, `BLOCKED`).
- **Semáforos** de entrada e saída, **laços indutivos** (SE, SS) e **barreiras ópticas** (P, PS) que acendem quando o sinal vale 1.
- **Painel digital** na entrada (vagas livres, ocupação binária, LOTADO / MANUTENÇÃO) e **cavalete de manutenção** piscante.
- **Carros 3D** (sedan, hatch, SUV) com carroceria, cabine envidraçada, teto, rodas que giram, faróis, lanternas de freio e luz de ré.
- **Trajetórias** compostas por retas e arcos, com aceleração/desaceleração e rotação gradual; manobras em ré para sair das vagas. Os testes verificam, quadro a quadro, que **nenhum carro se sobrepõe a outro** e que **nenhum carro passa sob uma cancela que não está aberta**.
- **Câmera orbital** (girar, aproximar, mover) com limites e transições suaves: Isométrica, Superior, Entrada, Saída e Visão geral.
- **Clique** em carros e vagas para ver detalhes e solicitar a saída.
- **Qualidade gráfica** Alta/Leve (sombras e resolução) e mensagem clara se WebGL não estiver disponível.

### Controle de concorrência

| Situação | Regra |
|---|---|
| Cliques rápidos em "Adicionar" | Fila de acesso limitada a 3 veículos aguardando; o excedente é recusado com aviso. |
| Dois carros, uma vaga | A vaga é **reservada** na autorização; `L` considera ocupadas **+ reservadas**. |
| Entrada durante saída | Entrada e saída têm FSMs independentes; o corredor interno é um recurso de **exclusão mútua** (*mutex*). |
| Lotação | `L = 1` → `ENTRADA_AUTORIZADA = 0` → o carro dá ré e segue pela rua. |
| Estacionamento vazio | Pedido de saída recusado com aviso. |
| Saída duplicada | O mesmo veículo não pode solicitar saída duas vezes. |
| Manutenção durante entrada | Bloqueia novas autorizações; uma entrada **já autorizada** termina por segurança. |
| Pausa / continuação | `tick` não avança; tudo congela e retoma do mesmo ponto. Comandos são bloqueados durante a pausa. |
| Reset durante animação | Novo estado inicial com nova *época*; como não há timers externos, nada antigo sobrevive. |

---

## Motor lógico (Sistemas Digitais)

### Sinais

| Sinal | Significado |
|---|---|
| `SE` | sensor de entrada (veículo diante da cancela de entrada) |
| `P` | passagem pela cancela de entrada |
| `SS` | sensor de saída |
| `PS` | passagem pela cancela de saída |
| `L` | sem capacidade: ocupadas + reservadas ≥ 8 |
| `M` | modo manutenção |
| `CE` | comando de entrada (pulso) |
| `CS` | comando de saída válido em execução |
| `R` | reset (pulso) |

### Expressões

```
ENTRADA_AUTORIZADA = SE · L̄ · M̄        (SE AND NOT L AND NOT M)
SAIDA_AUTORIZADA   = SS · CS
L                  = Q3 da soma (ocupadas + reservadas), pois 8 = 1000₂
```

A tabela-verdade exibida na interface é **gerada pela mesma função** `entryAuthorized()` usada pelo controlador.

### Contador binário de 4 bits

- Representa os veículos com **ocupação confirmada** (0000 a 1000).
- **Incrementa** quando o carro termina a manobra e a vaga passa de RESERVADA para OCUPADA.
- **Decrementa** na **borda de descida de PS** — o carro atravessou completamente a cancela de saída; nesse mesmo instante a vaga é liberada.
- Implementado como somador/subtrator em cascata com portas: `Qᵢ′ = Qᵢ ⊕ Cᵢ`, `Cᵢ₊₁ = Qᵢ · Cᵢ`; habilitações `EN_INC = NOT Q3` (sem overflow) e `EN_DEC = Q3 + Q2 + Q1 + Q0` (sem underflow).
- Bits alterados são destacados com `XOR(anterior, atual)`.
- É uma simulação comportamental de um circuito sequencial — **não há flip-flops físicos**.

### Display de 7 segmentos

Decodificador BCD → 7 segmentos implementado de duas formas (tabela de consulta e expressões booleanas minimizadas com AND/OR/NOT); os testes garantem que são idênticas. O display SVG é alimentado pelo decodificador de portas.

### Máquinas de estados

**Entrada:** `IDLE → VEHICLE_DETECTED → CHECKING_CAPACITY → ACCESS_GRANTED → GATE_OPENING → GATE_OPEN → VEHICLE_PASSING → GATE_CLOSING → PARKING → COMPLETED → IDLE`, ou `CHECKING_CAPACITY → ACCESS_DENIED → IDLE`. Segurança: `GATE_CLOSING --P↑--> GATE_OPENING`. Global: `R → IDLE`.

**Saída:** `IDLE → LEAVING_SPOT → VEHICLE_DETECTED → CHECKING → ACCESS_GRANTED → GATE_OPENING → GATE_OPEN → VEHICLE_PASSING → GATE_CLOSING → COMPLETED → IDLE`.

Eventos fora da tabela de transição são rejeitados (a cancela nunca abre sem passar por `ACCESS_GRANTED`).

---

## Cenários de apresentação

Selecionáveis em **Operação → Cenários de demonstração** (todos partem de um reset e são determinísticos):

1. **Estacionamento vazio** — contador 0000.
2. **Entrada de um veículo** — SE↑, autorização, cancela, P↑/P↓, vaga ocupada, contador 0001.
3. **Parcialmente ocupado** — V01, V03, V06 ocupadas, contador 0011.
4. **Estacionamento lotado** — 8 carros (1000) e um nono veículo é **negado**.
5. **Saída de veículo** — V03 sai, contador 0011 → 0010.
6. **Modo manutenção** — entrada negada com vagas livres; saída de V06 permitida.
7. **Demonstração da lógica digital** — velocidade 0,5× com o Laboratório aberto.

---

## Testes

`npm test` executa 55 testes em 3 arquivos:

- **logic.test.ts** — portas AND/OR/NOT/XOR, De Morgan, conversão binária, limites do contador (0–8, sem overflow/underflow), cascata de incremento/decremento, XOR de bits alterados, mapeamento de 7 segmentos (tabela × portas), tabela-verdade de autorização, comparador L.
- **fsm.test.ts** — ciclos completos de entrada e saída, caminho negado, eventos inválidos rejeitados, reabertura de segurança, RESET global, alcançabilidade.
- **engine.test.ts** — entrada com vaga, lotação, manutenção (inclusive ativada no meio de uma entrada), cliques rápidos, saída com estacionamento vazio, saída e decremento no evento PS↓, saída duplicada, entradas/saídas repetidas, operações concorrentes, reserva de vagas, **600 s de modo automático** e **modo automático a 4×** verificando a cada quadro invariantes (contador = vagas ocupadas, ocupadas + reservadas ≤ 8), **ausência de colisões** e **nenhum carro sob cancela fechada**, reset durante movimentação, pausa/retomada e determinismo dos 7 cenários.

---

## Como apresentar

Veja o roteiro completo em **[APRESENTACAO.md](./APRESENTACAO.md)** (3 a 5 minutos + perguntas prováveis do professor).
