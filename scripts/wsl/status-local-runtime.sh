#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
pid_file="$repo_root/.tmp/loomic-runtime-keepalive.pid"
env_file="$repo_root/.tmp/loomic-local.env"

if [[ -f "$pid_file" ]]; then
  keepalive_pid="$(tr -d '[:space:]' <"$pid_file")"
  if [[ -n "$keepalive_pid" ]] && kill -0 "$keepalive_pid" 2>/dev/null; then
    echo "keepalive=running pid=$keepalive_pid"
  else
    echo "keepalive=stale pid=$keepalive_pid"
  fi
else
  echo "keepalive=missing"
fi

echo "docker=$(systemctl is-active docker 2>/dev/null || true)"

cd "$repo_root"

if [[ -f "$env_file" ]]; then
  docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file "$env_file" ps || true
else
  echo "env_file=missing"
fi
