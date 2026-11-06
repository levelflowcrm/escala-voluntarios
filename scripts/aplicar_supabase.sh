#!/usr/bin/env bash
# Executa arquivos SQL no projeto Supabase pela API de gerenciamento.
# Uso: SUPABASE_ACCESS_TOKEN=sbp_... scripts/aplicar_supabase.sh <project-ref> arquivo.sql [...]
set -euo pipefail
REF="$1"; shift
for f in "$@"; do
  echo "→ $f"
  python3 -I -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read(), "read_only": False}))' "$f" |
    curl -sS --fail-with-body -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" \
      -H "Content-Type: application/json" --data-binary @- | head -c 600
  echo
done
