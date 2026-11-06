# Onde paramos (06/11/2026)

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

As migrações são aplicadas colando no SQL Editor do Supabase. A API de
gerenciamento deste ambiente só consegue **ler** o banco (usada para conferir).

## Pull requests

- #1 Base do app — **juntado**
- #2 Correção de segurança — falta Ready for review + Merge
- #3 Login (e-mail e Google) — depende do #2; falta Ready for review + Merge

## Próximos passos

1. Rodar `vincular_conta.sql` no Supabase.
2. Juntar #2 e depois #3.
3. Cadastrar o e-mail do coordenador (Luciano) em `pessoas.email`.
4. Criar o projeto na Vercel (entrar com GitHub), importar o repositório e
   configurar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. No Supabase → Authentication → URL Configuration: Site URL = endereço da
   Vercel; Redirect URLs = `https://<endereço-vercel>/**` e `http://localhost:3000/**`.
6. (Opcional) Login com Google: criar cliente OAuth no Google Cloud com
   redirecionamento `https://oceyznlmglxhzzcenzjt.supabase.co/auth/v1/callback`
   e ativar o provedor Google no Supabase.
7. Telas: **Montar escala** (coordenador) e **Minhas escalas** com
   Confirmar / Não posso (voluntário).

## Pendências com o coordenador

- Coordenadores e funções de Projeção e Iluminação.
- Revogar o token `sbp_fc48...` que foi colado no chat
  (https://supabase.com/dashboard/account/tokens).
