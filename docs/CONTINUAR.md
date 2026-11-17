# Onde paramos (16/11/2026)

Resumo para retomar o projeto numa nova sessão. O app se chama **Mais Conectados** (antes "Culto360"; renomeado em 16/11/2026 porque o perfil @culto360 do Instagram já estava ocupado)
(piloto: Igreja Nasci Pra Deus, ministério de Transmissão).

## Contas e serviços

| Serviço | Situação |
|---|---|
| GitHub | `levelflowcrm/escala-voluntarios` (privado) |
| Supabase | projeto `escala-voluntarios`, ID `oceyznlmglxhzzcenzjt`, região us-west-2 |
| Gmail do projeto | levelflowcrm@gmail.com |
| Vercel | no ar (time `levelflowcrm-9108`), deploy automático a cada merge na `main` |
| Login com Google | funcionando; app **Em produção** no Google Cloud (projeto e cliente OAuth chamados "Mais Conectados"; o ID técnico do projeto `aqueous-sandbox-514903-h4` não muda), sem necessidade de usuários de teste |
| Domínio | **maisconectados.com.br** (Registro.br, DNS do próprio Registro.br: A `@` → 216.198.79.1), ligado à Vercel com HTTPS; Supabase Site URL e Redirect URLs já usam o domínio; endereço provisório `escala-voluntarios-peach.vercel.app` segue válido. `www` ainda não configurado |

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

1. Cadastrar os e-mails dos voluntários (tela Voluntários); o Google já está em produção.
2. Testar o fluxo completo no celular: Montar escala → Sugerir → Publicar →
   voluntário Confirmar / Não posso → outro voluntário assumir em Vagas abertas.
3. (feito em 16/11) Domínio, DNS, Branding, Site URL e Publicar app no Google.
   Falta: app instalável (PWA) e decidir sobre o login por e-mail (ver abaixo).
4. Ficam de fora do escopo: o **Quiz** (decidido em 16/11). Pendentes: WhatsApp D-1
   (depende da integração SprintHub/Uazapi) e extras do calendário (novo evento,
   "Você serviu este mês").
5. Cadastro de funções de Projeção e Iluminação e seus coordenadores.

## Pendências de segurança

- Revogar o token `sbp_fc48...` colado no chat antes
  (https://supabase.com/dashboard/account/tokens).
- Quem não é voluntário cadastrado consegue criar uma conta de login (fica vazia,
  cai em "Quase lá!" e não enxerga nada: RLS por `minha_igreja()`). Para barrar
  até isso, desligar novos cadastros no Supabase (Authentication → Sign In /
  Providers → "Allow new users to sign up"), validando antes que o Google continua entrando.
- Login: **só Google** (decidido em 16/11). O link por e-mail foi removido porque o e-mail padrão do Supabase só atende a equipe do projeto. Se algum voluntário não tiver conta Google, configurar SMTP próprio (Resend/Brevo) e reativar.
- A proteção de colunas de `pessoas` já existe (migração `20261116000003`, teste `protege_pessoas.sql`).
