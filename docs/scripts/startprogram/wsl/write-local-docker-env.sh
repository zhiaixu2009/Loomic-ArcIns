#!/usr/bin/env bash
set -euo pipefail

output_path="${1:-/tmp/loomic.env}"

server_port="${LOOMIC_SERVER_PORT:-3001}"
web_origin="${LOOMIC_WEB_ORIGIN:-http://127.0.0.1:3000}"
server_base_url="${NEXT_PUBLIC_SERVER_BASE_URL:-http://127.0.0.1:3001}"
skills_root="${LOOMIC_SKILLS_ROOT:-/opt/loomic/skills}"
agent_model="${LOOMIC_AGENT_MODEL:-gpt-4.1}"
network_mode="${LOOMIC_DOCKER_NETWORK_MODE:-host}"

derive_internal_http_url() {
  printf '%s' "$1" | sed -E 's#^(https?://)[^/:]+#\1host.docker.internal#'
}

derive_internal_db_url() {
  printf '%s' "$1" | sed -E 's#^((postgres|postgresql)://[^@]+@)[^/:]+#\1host.docker.internal#'
}

# Supabase CLI emits KEY="value" pairs. Export them so we can derive the
# canonical variables expected by the Loomic server runtime and compose build.
eval "$(supabase status -o env | sed 's/^/export /')"

: "${API_URL:?Missing API_URL from 'supabase status -o env'}"
: "${ANON_KEY:?Missing ANON_KEY from 'supabase status -o env'}"
: "${DB_URL:?Missing DB_URL from 'supabase status -o env'}"
: "${JWT_SECRET:?Missing JWT_SECRET from 'supabase status -o env'}"
: "${SERVICE_ROLE_KEY:?Missing SERVICE_ROLE_KEY from 'supabase status -o env'}"

supabase_internal_url="${SUPABASE_INTERNAL_URL:-$(derive_internal_http_url "$API_URL")}"
supabase_internal_db_url="${SUPABASE_INTERNAL_DB_URL:-$(derive_internal_db_url "$DB_URL")}"

mkdir -p "$(dirname "$output_path")"

cat >"$output_path" <<EOF
LOOMIC_ENV_FILE=$output_path
LOOMIC_SERVER_PORT=$server_port
LOOMIC_WEB_ORIGIN=$web_origin
NEXT_PUBLIC_SERVER_BASE_URL=$server_base_url
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$ANON_KEY}
LOOMIC_DOCKER_NETWORK_MODE=$network_mode
LOOMIC_SKILLS_ROOT=$skills_root
LOOMIC_AGENT_MODEL=$agent_model
SUPABASE_URL=${SUPABASE_URL:-$API_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-$ANON_KEY}
SUPABASE_DB_URL=${SUPABASE_DB_URL:-$DB_URL}
SUPABASE_INTERNAL_URL=$supabase_internal_url
SUPABASE_INTERNAL_DB_URL=$supabase_internal_db_url
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET:-$JWT_SECRET}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-$SERVICE_ROLE_KEY}
EOF

echo "Wrote local docker env to $output_path"
