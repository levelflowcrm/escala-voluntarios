# Onde paramos (16/11/2026)

Resumo para retomar o projeto numa nova sessão. O app se chama **Culto360**
(piloto: Igreja Nasci Pra Deus, ministério de Transmissão).

## Contas e serviços

| Serviço | Situação |
|---|---|
| GitHub | `levelflowcrm/escala-voluntarios` (privado) |
| Supabase | projeto `escala-voluntarios`, ID `oceyznlmglxhzzcenzjt`, região us-west-2 |
| Gmail do projeto | levelflowcrm@gmail.com |
| Vercel | no ar (time `levelflowcrm-9108`), deploy automático a cada merge na `main` |
| Login com Google | funcionando (Google Cloud em modo **Teste**; cada voluntário precisa ser adicionado como usuário de teste, limite de 100) |
| Domínio culto360.com.br | adicionado na Vercel; falta registrar e apontar o DNS (registro A `@` → 216.198.79.1) |

## O que está aplicado no Supabase

Todas as migrações de `supabase/migrations/` estão aplicadas, incluindo
`20261116000001_vagas_abertas.sql`. Novas migrações são aplicadas colando no
SQL Editor do Supabase **antes** do merge que as usa.

## Telas prontas

- Início (minhas escalas, Confirmar / Não posso)
- Montar escala (coordenador): criar cultos, sugerir, publicar, definir titular
- Minha disponibilidade (turnos, viagens/ausências)
- Vagas abertas (assumir data recusada por outro voluntário)
- Voluntários (coordenador cadastra o e-mail de login de cada um)
- Meu perfil (nome completo, celular, aniversário)

## Próximos passos

1. Cadastrar os e-mails dos voluntários (tela Voluntários) e adicioná-los como
   usuários de teste no Google Cloud.
2. Testar o fluxo completo no celular: Montar escala → Sugerir → Publicar →
   voluntário Confirmar / Não posso → outro voluntário assumir em Vagas abertas.
3. Publicar o app no Google: registrar culto360.com.br + DNS, criar páginas
   `/privacidade` e `/termos`, preencher Branding, trocar Site URL / Redirect
   URLs no Supabase para o domínio e clicar em Publicar app.
4. Telas do protótipo que faltam: WhatsApp D-1, Quiz, Termômetro, Sugestões,
   Comunicados, calendário (novo evento, aniversariantes).
5. Cadastro de funções de Projeção e Iluminação e seus coordenadores.

## Pendências de segurança

- Revogar o token `sbp_fc48...` colado no chat antes
  (https://supabase.com/dashboard/account/tokens).
- A política `propria` em `pessoas` deixa o voluntário alterar qualquer coluna
  da própria linha (inclusive `igreja_id`/`email`) se falar direto com a API.
  Corrigir com um gatilho que bloqueie essas colunas para não-coordenadores.
