#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
env_file="$repo_root/.tmp/loomic-local.env"
pid_file="$repo_root/.tmp/loomic-runtime-keepalive.pid"

cd "$repo_root"

if [[ ! -f "$env_file" ]]; then
  "$repo_root/scripts/wsl/write-local-docker-env.sh" "$env_file" || true
fi

if [[ -f "$env_file" ]]; then
  docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file" stop web server worker || true
else
  docker compose -f docker-compose.local.yml -f docker-compose.dev.yml stop web server worker || true
fi

supabase stop || true

if [[ -f "$pid_file" ]]; then
  keepalive_pid="$(tr -d '[:space:]' <"$pid_file")"
  if [[ -n "$keepalive_pid" ]] && kill -0 "$keepalive_pid" 2>/dev/null; then
    kill "$keepalive_pid" || true
  fi
  rm -f "$pid_file"
fi
