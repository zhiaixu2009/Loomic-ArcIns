#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
env_file="$repo_root/.tmp/loomic-local.env"
max_attempts="${LOOMIC_RUNTIME_ENV_ATTEMPTS:-30}"

cd "$repo_root"

"$repo_root/scripts/wsl/start-keepalive.sh" "$repo_root"

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
