# Loomic Local Runtime Start Program

This directory is the single indexed entry point for starting, stopping, and checking the local Loomic runtime. The rest of the repository may keep compatibility wrappers, but new operational instructions should point here first.

## What This Starts

- WSL Docker service and the runtime keepalive process.
- Supabase local stack.
- Loomic `server`, `worker`, and `web` containers through the repository Docker Compose files.
- Readiness gates for the API health endpoint and the web home page.

## Windows Entry Points

Run these from the repository root in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\status-local-runtime.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\stop-local-runtime.ps1
```

Optional parameters:

- `-Distro Ubuntu-24.04` chooses the WSL distro.
- `-TimeoutSeconds 420` controls the final Windows-side readiness wait in the start script.

## WSL Entry Points

Use these only when already inside WSL:

```bash
bash docs/scripts/startprogram/wsl/start-local-runtime.sh /mnt/d/97-CodingProject/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/status-local-runtime.sh /mnt/d/97-CodingProject/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/stop-local-runtime.sh /mnt/d/97-CodingProject/Loomic-ArcIns
```

## Validation Checklist

- Docker service is `active` inside WSL.
- Keepalive PID in `.tmp/loomic-runtime-keepalive.pid` is running.
- `loomic-arcins-server-1` is healthy.
- API health returns `200` at `http://127.0.0.1:3001/api/health`.
- Web home returns `200` at `http://127.0.0.1:3000/home`.
- Real browser opens `http://127.0.0.1:3000/home` with page title `Loomic` and no console errors.

## Notes

- `http://127.0.0.1:3000/home` is the user-facing local browser entry.
- `http://127.0.0.1:3001/api/health` is the backend API health probe, not the user-facing page.
- The WSL scripts intentionally wait through a Supabase DB cold-recovery window. After a Windows reboot, Postgres can spend several minutes in `unhealthy` while it fsyncs/replays state; do not delete volumes or reset Supabase just because the first `supabase start` exits early.
