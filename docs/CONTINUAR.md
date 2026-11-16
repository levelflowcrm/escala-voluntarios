# Onde paramos (16/11/2026)

Resumo para retomar o projeto numa nova sessão.

## Contas e serviços

| Serviço | Situação |
|---|---|
| GitHub | `levelflowcrm/escala-voluntarios` (privado) |
| Supabase | projeto `escala-voluntarios`, ID `oceyznlmglxhzzcenzjt`, região us-west-2 |
| Chave pública do Supabase | em `.env.local` (fora do git); a mesma vai para a Vercel |
| Gmail do projeto | levelflowcrm@gmail.com |
| Vercel | ainda não criada |
| Google Cloud (login Google) | ainda não configurado |

## O que está aplicado no Supabase

- [x] `20261104000001_estrutura_inicial.sql` + `seed.sql` (33 pessoas, 73 eventos, 195 escalações)
- [x] `20261106000001_corrige_acesso_anonimo.sql` (anônimo sem acesso, conferido)
- [ ] `20261106000002_vincular_conta.sql` → **colar no SQL Editor**
- [ ] `20261106000003_responder_escala.sql` → **colar no SQL Editor** (depois do anterior)

As migrações são aplicadas colando no SQL Editor do Supabase. A API de
gerenciamento deste ambiente só consegue **ler** o banco (usada para conferir).

## Pull requests

- #1 Base do app, #2 Correção de segurança, #3 Login e #4 Telas Montar
  escala / Minhas escalas: **todos juntados no `main`** (16/11).
- Prints das telas (dados de exemplo) em `docs/telas/`.

## Próximos passos

1. Rodar no SQL Editor do Supabase, nesta ordem: `20261106000002_vincular_conta.sql`
   e `20261106000003_responder_escala.sql`. **Sem eles o login não funciona.**
2. ~~Juntar os PRs~~ feito.
3. Cadastrar o e-mail do coordenador (Luciano) em `pessoas.email`.
4. Criar o projeto na Vercel (entrar com GitHub), importar o repositório e
   configurar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. No Supabase → Authentication → URL Configuration: Site URL = endereço da
   Vercel; Redirect URLs = `https://<endereço-vercel>/**` e `http://localhost:3000/**`.
6. (Opcional) Login com Google: criar cliente OAuth no Google Cloud com
   redirecionamento `https://oceyznlmglxhzzcenzjt.supabase.co/auth/v1/callback`
   e ativar o provedor Google no Supabase.
7. ~~Telas **Montar escala** e **Minhas escalas**~~ feitas. Testar no app
   publicado: entrar como Luciano, abrir Montar escala → dezembro → Criar
   cultos fixos → Sugerir → Publicar; depois entrar como um voluntário e
   Confirmar / Não posso.
8. ~~Tela **Minha disponibilidade**~~ feita (turnos dos cultos fixos com
   Posso / Às vezes (1º–5º) / Não posso, e viagens/ausências por período).
9. Próximas ideias: aviso por WhatsApp/e-mail ao publicar a escala,
   coordenador ver a disponibilidade de todos, cadastro de funções de
   Projeção e Iluminação.

## Pendências com o coordenador

- Coordenadores e funções de Projeção e Iluminação.
- Revogar o token `sbp_fc48...` que foi colado no chat (em 16/11 a leitura
  do banco por este ambiente já respondeu "token inválido": provavelmente
  revogado; para conferir o banco daqui é preciso reconectar o Supabase)
  (https://supabase.com/dashboard/account/tokens).
