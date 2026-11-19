# Colocar o app no ar — passo a passo

Siga na ordem. Cada etapa diz onde clicar e como saber que deu certo.

---

## 1. Conferir os 2 SQL no Supabase

SQL Editor: https://supabase.com/dashboard/project/oceyznlmglxhzzcenzjt/sql/new

```sql
select
  exists (select 1 from pg_proc where proname = 'vincular_conta') as login_ok,
  pg_get_functiondef('responder_escala'::regproc) like '%já aconteceu%' as confirmar_ok;
```

Tem que dar **true / true**. Se algum der `false`, rode o arquivo
correspondente de `supabase/migrations/` (`..._vincular_conta.sql` e
`..._responder_escala.sql`).

---

## 2. Cadastrar o e-mail do facilitador

O login só funciona para quem tem e-mail cadastrado em `pessoas`. Troque o
e-mail abaixo pelo seu (o mesmo que vai usar para entrar, de preferência uma
conta Google) e rode no SQL Editor:

```sql
update pessoas set email = 'seu-email@gmail.com' where nome = 'Luciano';
select nome, email from pessoas where nome = 'Luciano';
```

Tem que aparecer **Luciano** com o seu e-mail.

Para os voluntários, é o mesmo comando, um por linha (o nome é como aparece
na escala):

```sql
update pessoas set email = 'josy@gmail.com'     where nome = 'Josy';
update pessoas set email = 'thamires@gmail.com' where nome = 'Thamires';
-- ...
select nome, email from pessoas order by nome;
```

---

## 3. Pegar as duas chaves do Supabase

Supabase → projeto → **Project Settings** (engrenagem) → **API**
(ou **Data API** / **API Keys**):

| Nome na Vercel | Onde está no Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL**: `https://oceyznlmglxhzzcenzjt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave **anon / public** (começa com `eyJ...`) ou **publishable** (começa com `sb_publishable_...`) |

Nunca use a chave **service_role** / **secret** no app.

---

## 4. Publicar na Vercel

1. Entre em https://vercel.com/signup → **Continue with GitHub** (a conta que
   tem acesso a `levelflowcrm/escala-voluntarios`). Plano **Hobby** (grátis).
2. **Add New… → Project** → em *Import Git Repository*, escolha
   `escala-voluntarios` → **Import**. Se o repositório não aparecer, clique em
   *Adjust GitHub App Permissions* e libere o repositório.
3. Em **Environment Variables**, adicione as duas do passo 3.
4. Clique em **Deploy** e espere ~2 minutos.
5. Anote o endereço gerado. O domínio próprio (`https://maisconectados.com.br`) entra em **Settings → Domains**; no Registro.br, em *Configurar endereçamento*, aponte o IP que a Vercel mostrar (hoje `216.198.79.1`).

Daqui pra frente, todo PR juntado no `main` publica sozinho.

---

## 5. Avisar o Supabase do endereço do app

Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: o domínio do app (hoje `https://maisconectados.com.br`)
- **Redirect URLs** → *Add URL*, uma de cada vez:
  - `https://maisconectados.com.br/**`
  - `http://localhost:3000/**`

**Save**.

---

## 6. Login com Google (recomendado)

O e-mail padrão do Supabase só envia o link de acesso para os membros da
equipe do projeto e no máximo poucos e-mails por hora. Para os voluntários,
o caminho mais simples é o **Google**.

**No Google Cloud** (https://console.cloud.google.com, com o Gmail do projeto):

1. Crie um projeto: **escala-voluntarios**.
2. **APIs e serviços → Tela de consentimento OAuth** (ou *Google Auth Platform*):
   tipo **Externo**, nome do app "Mais Conectados", seu e-mail de
   suporte → salvar. Em **Público-alvo**, clique em **Publicar app** (senão só
   os e-mails de teste conseguem entrar).
3. **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**
   - Origens JavaScript autorizadas: o endereço da Vercel
   - URIs de redirecionamento autorizados:
     `https://oceyznlmglxhzzcenzjt.supabase.co/auth/v1/callback`
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.

**No Supabase**: **Authentication → Sign In / Providers → Google** → ativar,
colar o ID e a chave secreta → **Save**.

> Se preferir manter o link por e-mail para todos, é preciso configurar um
> SMTP próprio (Supabase → Authentication → Emails → SMTP Settings), por
> exemplo com o Resend (grátis até 3.000 e-mails/mês).

---

## 7. Testar

1. Abra o endereço da Vercel no celular → **Entrar com Google** com o e-mail
   cadastrado no passo 2.
2. Deve aparecer **"Olá, Luciano"** e o botão **Montar escala**.
3. Montar escala → avance para **dezembro** → **Criar cultos fixos do mês** →
   **Sugerir vagas** → confira → **Publicar**.
4. Peça para um voluntário com e-mail cadastrado entrar e tocar em
   **Confirmar** ou **Não posso**. Na sua tela aparece ✓ ou o motivo.

Se cair em "Quase lá!", o e-mail usado no login não é o mesmo cadastrado no
passo 2.

---

## Banco pausado?

No plano gratuito o Supabase pausa o projeto depois de ~7 dias sem uso. Os
dados não se perdem: abra o painel e clique em **Resume project**. Com os
voluntários usando o app, isso deixa de acontecer.
