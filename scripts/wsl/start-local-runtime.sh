#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
env_file="$repo_root/.tmp/loomic-local.env"
max_attempts="${LOOMIC_RUNTIME_ENV_ATTEMPTS:-30}"
runtime_ready_timeout="${LOOMIC_RUNTIME_READY_TIMEOUT_SECONDS:-420}"
server_port="${LOOMIC_SERVER_PORT:-3001}"

cd "$repo_root"

"$repo_root/scripts/wsl/start-keepalive.sh" "$repo_root"

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

supabase start

attempt=1
until "$repo_root/scripts/wsl/write-local-docker-env.sh" "$env_file"; do
  if (( attempt >= max_attempts )); then
    echo "Failed to generate local docker env after $attempt attempts." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 5
done

docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file" up -d server worker web

wait_for_url() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + runtime_ready_timeout))

  until curl -fsS --max-time 10 "$url" >/dev/null; do
    if (( SECONDS >= deadline )); then
      echo "$name did not become ready within ${runtime_ready_timeout}s: $url" >&2
      docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file" ps >&2 || true
      docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file" logs --tail=120 server web >&2 || true
      exit 1
    fi

    sleep 5
  done
}

wait_for_url "API health" "http://127.0.0.1:${server_port}/api/health"
wait_for_url "Web home" "http://127.0.0.1:3000/home"

echo "Local runtime ready: http://127.0.0.1:3000/home"
echo "API health ready: http://127.0.0.1:${server_port}/api/health"
