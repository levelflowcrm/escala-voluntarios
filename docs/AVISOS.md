# Avisos do Mais Conectados (definição de 22/11/2026)

Lista oficial de quais avisos o app envia, por qual canal e para quem. Serve de base para o push do app e para decidir onde cada aviso novo entra.

## Regra geral

- **Todo aviso que exige ação da pessoa vai por WhatsApp.** O WhatsApp chega mesmo para quem nunca instalou o app, então continua sendo o canal garantido.
- **O push do app é o segundo canal**, para dar velocidade a quem instalou. Quando existir, o aviso não deve chegar duplicado: o mesmo evento gera um aviso por canal, com o mesmo texto.
- **Avisos informativos ficam no app** (push, sino ou número no ícone), sem gastar o limite do WhatsApp.
- No iPhone o push só funciona com o app instalado na tela inicial (iOS 16.4 ou mais novo). Por isso o WhatsApp não sai dos avisos do nível 1 até a maioria do time instalar o app.
- Som: é o som padrão de notificação do celular de cada pessoa; o app não escolhe um som próprio.

## Limites do WhatsApp (já valem hoje)

| Regra | Valor |
|---|---|
| Horário de silêncio | nada sai entre 22h e 7h (Brasília); a fila espera e sai de manhã |
| Por pessoa | no máximo 4 mensagens por dia |
| Total | no máximo 300 mensagens por 24 h, somando todos |
| Validade | a mensagem vale 12 h e depois é descartada (algumas têm validade própria) |
| Interruptor geral | só envia com `WHATSAPP_ATIVO=true` |

## Nível 1: push no app e WhatsApp (urgentes ou com ação)

| Aviso | Quem recebe | WhatsApp hoje | Push no app |
|---|---|---|---|
| Escala publicada | voluntário escalado | sim | a fazer |
| Lembrete de véspera | voluntário escalado | sim | a fazer |
| Vaga aberta | colegas aptos a cobrir | sim | a fazer |
| Pedido ou resposta de troca | quem pediu e quem responde | sim | a fazer |
| Cheguei | facilitadores do ministério | sim | a fazer |
| Ocorrência nova | facilitadores do ministério | sim | a fazer |

## Nível 2: push no app e sino, sem WhatsApp (informativos)

| Aviso | Quem recebe | WhatsApp hoje | Situação alvo |
|---|---|---|---|
| Repertório novo ou atualizado | só Louvor e Projeção escalados no dia | sim | passa a ser só push e sino quando o time instalar o app |
| Comunicado do facilitador | time | não | push e sino; WhatsApp só se o facilitador marcar "Avisar também por WhatsApp" (a fazer) |
| Lembrete do MaisFeliz | quem serviu no culto | sim | push perto do fim do culto; WhatsApp pode sair depois |
| Resumo de pendências | facilitador | não | uma vez por dia, só se houver vaga sem ninguém ou pedido sem resposta (a fazer) |

## Nível 3: só sino ou número no ícone, sem push

| Aviso | Observação |
|---|---|
| Parabéns de aniversário | a animação ao abrir o app já cumpre o papel; o WhatsApp às 7h30 continua |
| Pontuação e nível | só aparece ao abrir o app |
| Boas-vindas | fica só no WhatsApp, porque a pessoa ainda não instalou o app |
| Erro ou sugestão enviada pelo app | só para o administrador master; WhatsApp e sino como hoje |

## O que falta construir

1. Push do app (service worker, permissão do aparelho e tabela com o aparelho de cada pessoa; exige migração no Supabase).
2. Número vermelho no ícone do app, igual ao do sino.
3. Botão "Avisar também por WhatsApp" ao publicar um comunicado.
4. Resumo diário de pendências para o facilitador.
5. Regra para não duplicar: o mesmo aviso não chega duas vezes à mesma pessoa nos dois canais.
