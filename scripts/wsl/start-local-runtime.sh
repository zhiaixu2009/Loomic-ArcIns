#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:?repo root is required}"
shift || true

exec bash "$repo_root/docs/scripts/startprogram/wsl/start-local-runtime.sh" "$repo_root" "$@"
