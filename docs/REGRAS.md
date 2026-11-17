# Regras de negócio

Combinadas com o coordenador da Transmissão em 04/11/2026.

## Ministérios do piloto

| Ministério | Coordenador | Funções |
|---|---|---|
| Transmissão | Luciano | DTV-Transmissão, Câmera Black, Câmera Grua, Câmera Móvel |
| Projeção | (a definir) | (a definir com o coordenador) |
| Iluminação | (a definir) | (a definir com o coordenador) |
| Produção | (a definir) | (a definir com o coordenador) |

## Escala

1. **1 pessoa por função** em cada evento (titular).
2. **A mesma pessoa não faz mais de uma coisa no mesmo evento**, nem em
   ministérios diferentes. O banco bloqueia isso.
3. **Apoio:** segunda pessoa numa função. Pode ser acompanhante de treinamento
   (o novato faz "sombra") ou reforço em dias intensos.
4. **Responsável do dia:** quando uma pessoa consegue operar o ministério
   inteiro sozinha, ela é escalada como responsável do dia e o ministério não
   recebe titulares nesse evento. Só quem está marcado como apto para isso
   pode assumir esse papel. Hoje: Danilo e Gabriel.
5. **Mesmo dia, eventos diferentes** (ex.: domingo manhã e noite): o sistema
   evita e mostra um alerta. Em eventos marcados como *intensivos*
   (conferências), isso é permitido sem alerta.
6. **Convocação geral ("Todos")**: reuniões e alinhamentos convocam a equipe
   toda, com confirmação de presença.
7. Quem **recusa** libera a vaga para outra pessoa, e o histórico da recusa
   fica guardado.
8. A escala fica em **rascunho** (só o coordenador vê) até ser **publicada**.

## Sugestão automática

Só entra na lista quem é **apto** na função, **está disponível** naquele dia e
turno, **não está bloqueado** (viagem etc.) e **ainda não está no evento**.

Entre os elegíveis, a prioridade é:

1. menos serviços no mês;
2. não servir duas vezes no mesmo dia;
3. não ter servido nos últimos dias;
4. menos serviços nos últimos 90 dias;
5. mais tempo sem servir.

As funções com menos gente habilitada são preenchidas primeiro.

## Disponibilidade

- Turnos em que a pessoa não pode (ex.: "quarta à noite").
- Exceções por ordem no mês (ex.: "não sirvo no 1º domingo").
- Bloqueios por período (ex.: "viagem de 10 a 20/04").

## Cultos fixos

| Culto | Dia | Horário |
|---|---|---|
| Encontro de Vida - Quarta | Quarta | 19h30 |
| Encontro de Vida - Domingo Manhã | Domingo | 9h |
| Encontro de Vida - Domingo Noite | Domingo | 18h30 |

## Cadastro

- Igreja: **Igreja Nasci Pra Deus**.
- Nomes unificados na importação: "Marco" → **Marcos**; "Márcio Conti" → **Márcio**.

## Pendências para confirmar

- Coordenadores e funções de Projeção e Iluminação.

## Eventos

- **Só o administrador master** (levelflowcrm@gmail.com) cria, altera, cancela e colore eventos, cultos fixos e pausas. Coordenadores não criam eventos.
- **Todo evento entra na Agenda da igreja e na escala de todos os ministérios** (o antigo "só agenda" deixou de existir).
- **Dispensar:** o coordenador pode dispensar um evento para o PRÓPRIO ministério ("Meu time não serve neste evento"). O evento some da escala dele, fica em "Dispensados" e dá para voltar a escalar. Não dá para dispensar com gente escalada (tire as pessoas antes); recusas antigas são limpas.
- **Voluntário em vários ministérios:** cada coordenador monta o seu time, mas a mesma pessoa **nunca** fica duas vezes no mesmo evento (o banco barra). Na escolha da vaga, quem já foi escalado por outro ministério aparece desativado com "já escalado em <ministério>", e o "Criar automático" também pula essas pessoas.

## Pontuação do voluntário

Janela dos **últimos 90 dias**, só de escalas publicadas. Cada pessoa vê a
própria; o coordenador vê a de quem está nos ministérios que coordena. Não há
ranking público.

| Item | Pontos |
|---|---|
| Escala servida (confirmada, evento já realizado) | +10 |
| Chegou no horário (botão "Cheguei" até a hora do início) | +3 |
| Cobriu um colega (troca aceita) | +8 |
| Assumiu uma vaga aberta | +8 |
| Cada escala da sequência atual sem faltar (até 10) | +2 |
| Escala recusada | −4 |
| Troca pedida e aceita | −2 |
| Escala que ficou sem resposta até o evento passar | −6 |

A pontuação nunca fica abaixo de zero. Níveis, como o crescimento de uma planta (medem constância, não volume): 🌰 Semente (0–29), 🌱 Plantinha
(30–69), 🌿 Arbusto (70–119), 🌳 Árvore (120–179) e 🌳🍎 Árvore frutífera (180+, o máximo). Os cortes serão revistos depois de
um mês de uso real. A sequência é interrompida por
recusa, troca ou escala sem resposta.

## MaisFeliz

Depois do culto (de 1 h após o início até a meia-noite do mesmo dia, horário de Brasília), quem serviu escolhe um
emoji de 1 a 5. O voto é anônimo (sem nome e sem horário) e o líder só vê o
resumo por culto, com 3 respostas ou mais. Na rotina diária das 21h (Brasília; cobre também o culto de quarta, cuja janela só abre às 20h30), quem serviu hoje e ainda não avaliou recebe 1 lembrete por WhatsApp (sem nota nem resultado) com o prazo até a meia-noite.

## Cheguei

O botão abre 3 h antes do início e fecha 4 h depois. Marca a escala como
confirmada e avisa o coordenador (sino e "Chegadas de hoje").

## Avisos por WhatsApp
- **Ligado por padrão para todos com celular cadastrado** (sem opção de desligar no perfil); o sino do app continua. Quem pedir para parar: o coordenador limpa o celular na tela Voluntários.
- O banco só **enfileira** (`fila_whatsapp`, privada); o app envia pela Uazapi (instância "Mais Conectados") logo após a ação e numa rotina diária (21h, horário de Brasília; o plano gratuito da Vercel roda uma vez por dia, em qualquer minuto dessa hora).
- Quando avisa: **chegada** (coordenadores do ministério), **troca pedida** (colega) e **troca aceita/recusada** (quem pediu), **escala publicada** (quem foi escalado, 1 mensagem por pessoa por ministério por hora), **lembrete de véspera** (1 mensagem por pessoa com a lista do dia seguinte; pede confirmação se faltar).
- Proteções: interruptor `WHATSAPP_ATIVO` (só `true` envia); máx. 10 envios por ação / 30 por rotina; máx. 4 mensagens por pessoa por dia; mensagem com mais de 12 h na fila expira em vez de ser enviada atrasada; textos variam; sem celular válido, não entra na fila.
- Ainda não avisa: vagas abertas (próximo passo, para não gerar volume).

## Cheguei só no local
- O toque em "Cheguei" envia a posição do celular; o banco calcula a distância até a igreja (`igrejas.latitude/longitude`) e só aceita até `raio_cheguei_m` (250 m), com folga igual à imprecisão do GPS (máx. 150 m).
- A posição **não é guardada**. Sem permissão de localização ou longe da igreja, a chegada não é registrada (a pessoa ainda pode confirmar presença normalmente).
- Igreja sem coordenadas cadastradas: a checagem é dispensada. Nasci Pra Deus: Av. Monteiro Lobato, 1522 — Macedo, Guarulhos/SP.

- **Boas-vindas:** ao ganhar um celular válido (cadastro ou correção), a pessoa recebe uma única mensagem explicando os avisos e, se ainda não entrou no app, como entrar com o Google. Só uma vez por pessoa; trocar de número depois não repete.
