# Roteiro de apresentação — Smart Parking 3D

**Duração:** 3 a 5 minutos · **Disciplina:** Sistemas Digitais

## Antes de começar (preparação — 2 min antes)

1. Abrir o terminal na pasta do projeto e rodar `npm run build && npm run preview` (ou `npm run dev`).
2. Abrir `http://localhost:4173` em tela cheia (F11) no Chrome ou Edge.
3. Clicar em **Reiniciar sistema** e deixar a câmera em **Isométrica**.
4. Se o computador for fraco, ativar **Qualidade: Leve** (canto superior direito da cena).
5. Deixar a aba **Operação** aberta no painel lateral.

---

## Roteiro

### 1. O problema real (≈ 30 s)

> "Um estacionamento precisa saber quantas vagas tem livres, impedir a entrada quando está cheio e liberar a saída com segurança. Fazer isso manualmente é lento e gera erros. Nosso projeto transforma esse sistema físico em um **sistema digital**: sensores viram **bits**, as decisões são tomadas por **portas lógicas** e uma **máquina de estados** comanda as cancelas."

### 2. Do físico para o digital (≈ 30 s)

Apontar na cena 3D os laços no piso e as barreiras ópticas:

> "Cada sensor físico é um sinal binário: **SE** é o laço antes da cancela de entrada, **P** é a barreira sob a cancela, **SS** e **PS** são os equivalentes na saída. Quando o carro está sobre o sensor, o sinal vale 1. Na faixa inferior da tela vemos todos os sinais em tempo real."

### 3. O estacionamento 3D (≈ 20 s)

Girar a câmera com o mouse, aproximar com o scroll e clicar em **Superior** e depois **Isométrica**.

> "É um ambiente 3D de verdade, construído com Three.js: 8 vagas, entrada e saída independentes, cancelas, semáforos, sensores e um painel digital na entrada."

### 4. Entrada de um veículo (≈ 50 s)

Clicar em **Entrada** (câmera) e depois em **Adicionar veículo**. Narrar enquanto acontece:

> "O carro chega pela rua e para sobre o laço: **SE vai de 0 para 1**. A máquina de estados sai de IDLE para **VEHICLE_DETECTED** e depois **CHECKING_CAPACITY**. A lógica calcula **SE · L̄ · M̄ = 1 · 1 · 1 = 1**: autorizado. Uma vaga é **reservada**, o semáforo fica verde e a cancela abre. Quando o carro passa pela barreira, **P sobe** e, ao descer, a passagem está confirmada e a cancela fecha. O carro vai até a vaga e, só quando estaciona, o contador incrementa."

Voltar para **Isométrica** para mostrar o carro estacionando.

### 5. Contador binário (≈ 30 s)

Mostrar o card **Contador 4 bits** e o display de 7 segmentos.

> "O contador de 4 bits Q3 Q2 Q1 Q0 guarda os veículos confirmados: 0001. O incremento é calculado como um somador em cascata de portas XOR e AND, e o display de 7 segmentos é alimentado por um decodificador feito com portas lógicas. É uma simulação comportamental de um circuito sequencial — não há flip-flops físicos."

### 6. Lotação (≈ 40 s)

Clicar em **Cenários → 4. Estacionamento lotado**.

> "Agora temos 8 carros: o contador mostra **1000** e o painel da entrada mostra LOTADO. Como 8 é 1000 em binário, o sinal **L** é exatamente o bit Q3. Chega um nono carro: **SE = 1, L = 1** → **SE · L̄ · M̄ = 1 · 0 · 1 = 0**. A máquina vai para **ACCESS_DENIED**, a cancela continua fechada e o carro dá ré e segue pela rua."

Na aba **Lógica**, mostrar a linha destacada da tabela-verdade.

### 7. Portas lógicas (≈ 40 s)

Ir para a aba **Laboratório de Sistemas Digitais**:

- **Diagrama de blocos:** sensores → lógica combinacional → máquina de estados → cancelas, com a realimentação contador → comparador → L.
- **Circuito lógico:** mostrar os fios acesos; trocar para **Manual (isolado)** e alternar SE, L e M.
- **Portas interativas:** clicar em A e B de AND, OR, NOT e XOR.

> "A tabela-verdade e o circuito usam exatamente a mesma função que o controlador executa."

### 8. Saída de um veículo (≈ 30 s)

Voltar para **Simulação 3D**, clicar em um carro estacionado e em **Solicitar saída** (ou **Cenário 5**).

> "**CS = 1**: o carro sai de ré, segue até a saída e ativa **SS**. **SS · CS = 1**, a cancela abre. Quando o carro termina de atravessar, a borda de descida de **PS** libera a vaga e **decrementa** o contador: 1000 → 0111."

(Opcional: **Modo manutenção** — mostrar que a entrada é negada mesmo com vagas, mas a saída continua permitida.)

### 9. Conclusão (≈ 20 s)

> "Mostramos como um sistema físico é modelado com sinais binários, lógica combinacional (as portas e o decodificador) e lógica sequencial (o contador e as máquinas de estados). Todo o motor lógico é independente da interface e possui 55 testes automatizados. Numa implementação real, os mesmos blocos seriam feitos com sensores, CIs ou um microcontrolador acionando os motores das cancelas."

---

## Perguntas prováveis do professor

**1. Qual a diferença entre a parte combinacional e a sequencial do projeto?**
A combinacional depende só das entradas atuais: `ENTRADA_AUTORIZADA = SE·L̄·M̄`, `SAIDA_AUTORIZADA = SS·CS` e o decodificador de 7 segmentos. A sequencial depende do estado armazenado: o contador (que lembra quantos carros entraram) e as máquinas de estados (que lembram em que etapa da operação estão).

**2. Por que L considera vagas reservadas e não só ocupadas?**
Entre a autorização e a confirmação da vaga existe um intervalo (o carro ainda está passando pela cancela e circulando). Se L olhasse só as ocupadas, dois carros poderiam ser autorizados para a última vaga. Reservar a vaga no instante da autorização evita essa condição de corrida.

**3. Em que momento o contador muda? Por quê?**
Incrementa quando o carro termina de estacionar (vaga RESERVADA → OCUPADA). Decrementa na borda de descida do sensor de passagem da saída (PS: 1 → 0), quando o carro já saiu completamente. Assim o contador sempre corresponde à ocupação confirmada; os testes verificam que contador = número de vagas ocupadas em todos os quadros.

**4. Como o contador impede overflow e underflow?**
Pela lógica de habilitação: `EN_INC = NOT Q3` (com 8 = 1000, Q3 = 1 bloqueia novos incrementos) e `EN_DEC = Q3 + Q2 + Q1 + Q0` (com 0000 o decremento é bloqueado).

**5. Por que a cancela só fecha depois que P volta a 0?**
P = 1 significa que há um veículo na região da cancela. Fechar nessa situação atingiria o carro. Por isso a transição `VEHICLE_PASSING → GATE_CLOSING` só ocorre na borda de descida de P, e se P subir durante o fechamento a FSM volta para `GATE_OPENING` (reabertura de segurança).

**6. O navegador está executando um circuito digital de verdade?**
Não. É uma simulação comportamental em software (TypeScript). As portas são funções que operam sobre 0 e 1, o contador é o estado da simulação atualizado por uma cascata de portas, e não existem flip-flops, atrasos de propagação ou ruído elétrico. A lógica, porém, é a mesma que seria implementada em hardware.

**7. Como isso seria implementado fisicamente?**
Laços indutivos e barreiras infravermelhas nas entradas digitais de um microcontrolador (Arduino/ESP32), CLP ou FPGA. Em lógica discreta: 74HC08 (AND) e 74HC04 (NOT) para a autorização, 74HC193 (contador up/down) para a contagem, 74HC4511 + display de 7 segmentos e flip-flops D para os estados da FSM, com drivers/relés acionando os motores das cancelas e os semáforos.

**8. O que é uma máquina de estados finitos e por que usar uma aqui?**
É um modelo com um número finito de estados, eventos de entrada e uma função de transição δ(estado, evento) → próximo estado. Ela garante a ordem correta das etapas (detectar → verificar → abrir → passar → fechar) e rejeita eventos inválidos — por exemplo, a cancela não pode abrir sem antes passar por ACCESS_GRANTED.

**9. Onde aparece a porta XOR?**
No destaque dos bits que mudaram no contador (`Δᵢ = Qᵢ anterior ⊕ Qᵢ atual`) e no próprio somador em cascata (`Qᵢ′ = Qᵢ ⊕ Cᵢ`). A porta OR aparece na habilitação do decremento, no decodificador de 7 segmentos e no indicador "operação em andamento" (OR das duas FSMs).

**10. E se entrada e saída acontecerem ao mesmo tempo?**
Cada lado tem sua própria FSM e sua própria cancela, então funcionam em paralelo. O corredor interno é compartilhado e protegido por exclusão mútua: só um carro manobra nele por vez. Os testes executam 600 s de modo automático verificando que não há colisões nem estados inválidos.

**11. Como os sensores são simulados?**
Cada sensor é uma região retangular do piso. A cada passo da simulação, calcula-se o retângulo ocupado pela carroceria do carro; se houver sobreposição, o sinal vale 1. As FSMs reagem às bordas (0→1 e 1→0) desses sinais, como num circuito real com detecção de borda.

**12. Como a tabela-verdade garante coerência com o sistema?**
Ela é gerada percorrendo as 8 combinações de SE, L e M e chamando a mesma função `entryAuthorized()` usada pelo controlador. Não há valores escritos à mão.
