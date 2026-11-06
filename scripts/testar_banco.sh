#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrações + seed e roda os testes SQL.
# Simula o schema "auth" do Supabase para as políticas de segurança.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DIR=$(mktemp -d)
PORT=55432
if [ "$(id -u)" = 0 ]; then RUN="runuser -u postgres --"; chown postgres "$DIR"; else RUN=""; fi
$RUN "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
trap '$RUN "$PGBIN/pg_ctl" -D "$DIR/data" stop >/dev/null; rm -rf "$DIR"' EXIT
PSQL="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create schema auth; create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$; create function auth.jwt() returns jsonb language sql stable as \$\$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb \$\$;"
# Papéis e permissões padrão do Supabase
$PSQL -c "create role anon nologin; create role authenticated nologin; grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid(), auth.jwt() to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated; alter default privileges in schema public grant all on functions to anon, authenticated;"
for f in supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f supabase/seed.sql
$PSQL -f supabase/tests/regras.sql
$PSQL -f supabase/tests/seguranca.sql
echo "OK: migrações, seed e testes passaram"
