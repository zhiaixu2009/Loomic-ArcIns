#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
runtime_dir="$repo_root/.tmp"
pid_file="$runtime_dir/loomic-runtime-keepalive.pid"
log_file="$runtime_dir/loomic-runtime-keepalive.log"

mkdir -p "$runtime_dir"

if [[ -f "$pid_file" ]]; then
  existing_pid="$(tr -d '[:space:]' <"$pid_file")"
  if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
    echo "loomic-runtime-keepalive already running: $existing_pid"
    exit 0
  fi
fi

nohup bash -lc 'while :; do sleep 600; done' >"$log_file" 2>&1 </dev/null &
keepalive_pid=$!
echo "$keepalive_pid" >"$pid_file"

echo "started loomic-runtime-keepalive: $keepalive_pid"
