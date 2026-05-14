#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="$repo_root/.tmp/loomic-local.env"
max_attempts="${LOOMIC_RUNTIME_ENV_ATTEMPTS:-30}"
runtime_ready_timeout="${LOOMIC_RUNTIME_READY_TIMEOUT_SECONDS:-420}"
supabase_ready_timeout="${LOOMIC_SUPABASE_READY_TIMEOUT_SECONDS:-600}"
server_port="${LOOMIC_SERVER_PORT:-3001}"

cd "$repo_root"

bash "$script_dir/start-keepalive.sh" "$repo_root"

if command -v systemctl >/dev/null 2>&1; then
  systemctl start docker --no-block 2>/dev/null || true
fi

docker_deadline=$((SECONDS + 420))
until docker version >/dev/null 2>&1; do
  if (( SECONDS >= docker_deadline )); then
    echo "Docker did not become ready within 420 seconds." >&2
    systemctl status docker --no-pager -l 2>/dev/null || true
    exit 1
  fi

  sleep 5
done

wait_for_supabase_ready() {
  local deadline=$((SECONDS + supabase_ready_timeout))

  until supabase status >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      echo "Supabase did not become ready within ${supabase_ready_timeout}s." >&2
      docker ps --filter "name=supabase_.*_loomic" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' >&2 || true
      docker logs --tail=160 supabase_db_loomic >&2 2>/dev/null || true
      exit 1
    fi

    local db_status="missing"
    db_status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' supabase_db_loomic 2>/dev/null || echo missing)"
    echo "Waiting for Supabase readiness: db=$db_status"
    sleep 10
  done
}

if ! supabase start; then
  echo "supabase start did not report ready; waiting for existing Supabase containers to recover." >&2
fi
wait_for_supabase_ready

attempt=1
until bash "$script_dir/write-local-docker-env.sh" "$env_file"; do
  if (( attempt >= max_attempts )); then
    echo "Failed to generate local docker env after $attempt attempts." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 5
done

compose_cmd=(docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file")
"${compose_cmd[@]}" up -d server worker web

wait_for_compose_service_health() {
  local service="$1"
  local deadline=$((SECONDS + runtime_ready_timeout))

  while true; do
    local container_id=""
    container_id="$("${compose_cmd[@]}" ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$container_id" ]]; then
      local state=""
      local health=""
      state="$(docker inspect -f '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
      health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$health" == "healthy" ]] || [[ -z "$health" && "$state" == "running" ]]; then
        return 0
      fi
      echo "Waiting for compose service '$service': state=${state:-unknown} health=${health:-none}"
    else
      echo "Waiting for compose service '$service': container missing"
    fi

    if (( SECONDS >= deadline )); then
      echo "Compose service '$service' did not become healthy within ${runtime_ready_timeout}s." >&2
      "${compose_cmd[@]}" ps >&2 || true
      "${compose_cmd[@]}" logs --tail=120 "$service" >&2 || true
      exit 1
    fi

    sleep 5
  done
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + runtime_ready_timeout))

  until curl -fsS --max-time 10 "$url" >/dev/null; do
    if (( SECONDS >= deadline )); then
      echo "$name did not become ready within ${runtime_ready_timeout}s: $url" >&2
      "${compose_cmd[@]}" ps >&2 || true
      "${compose_cmd[@]}" logs --tail=120 server web >&2 || true
      exit 1
    fi

    sleep 5
  done
}

wait_for_compose_service_health "server"
wait_for_url "API health" "http://127.0.0.1:${server_port}/api/health"
wait_for_url "Web home" "http://127.0.0.1:3000/home"

echo "Local runtime ready: http://127.0.0.1:3000/home"
echo "API health ready: http://127.0.0.1:${server_port}/api/health"
