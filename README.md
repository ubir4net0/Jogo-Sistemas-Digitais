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
