# Escala de Voluntários

App para gerenciar a escala dos voluntários da igreja: coordenadores montam a
escala com sugestão automática, e voluntários confirmam, recusam e informam a
própria disponibilidade.

**Piloto:** ministérios de Transmissão, Projeção e Iluminação.

## Tecnologia

- **Next.js 15** (App Router) como PWA, com Tailwind
- **Supabase**: banco Postgres, login e segurança por linha (RLS)
- **Vercel**: hospedagem
- **Vitest**: testes

## Estrutura

```
supabase/
  migrations/        estrutura do banco (tabelas, regras, segurança)
  seed.sql           dados importados da planilha (gerado por script)
  tests/regras.sql   testes das regras de negócio no banco
scripts/
  importar_planilha.py   lê a planilha .xlsx e gera o seed.sql
  testar_banco.sh        sobe um Postgres temporário e roda os testes
src/lib/escala/
  sugerir.ts         motor de sugestão automática da escala
docs/
  REGRAS.md          regras de negócio combinadas com os coordenadores
  ROTEIRO.md         etapas do projeto
```

## Comandos

```bash
npm install
npm run dev            # app em http://localhost:3000
npm test               # testes do motor de escala
npm run test:banco     # testes do banco (precisa de Postgres instalado)
npm run importar -- caminho/da/planilha.xlsx   # regenera supabase/seed.sql
```

## Configuração

Copie `.env.example` para `.env.local` e preencha com a URL e a chave anon do
projeto no Supabase.

> A planilha original (`.xlsx`) não vai para o repositório. Como o `seed.sql`
> tem nomes de voluntários, mantenha o repositório **privado**.
