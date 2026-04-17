# 建筑设计协同 Agent Studio WSL Runtime Guide

## 1. Purpose

本指南定义 Phase 0 之后的本地执行基座，保证后续每个里程碑都通过同一套 WSL + Docker + Local Supabase 路径完成开发与验证。

## 2. Runtime Baseline

- 主仓库路径：`/mnt/d/97-CodingProject/Loomic-ArcIns`
- Docker 运行位置：WSL
- Supabase 运行方式：WSL `supabase start`
- 应用容器编排：repo 根目录 `docker-compose.local.yml`
- Ralph 运行方式：
  - 优先：WSL 内的 `ralph` 二进制
  - Codex 驱动：通过仓库脚本 `scripts/wsl/codex-win` 转发到 Windows `codex.ps1`

## 3. Required Binaries

在 WSL 中确保以下命令可执行：

```bash
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
node -v
pnpm -v
bun --version
supabase --version
bun /home/admin123/.npm-global/lib/node_modules/@th0rgal/ralph-wiggum/ralph.ts --version
```

如果希望后续 shell 会话自动生效，把上述 `PATH` 导出加入 `~/.bashrc` 或 `~/.zshrc`。

## 4. Codex Fallback For Ralph

Ralph 在 WSL 中使用 `--agent codex` 时，不直接调用交互式 TUI，而是调用 `codex exec`。当前机器上的 Windows Codex CLI 位于 `C:\Users\admin\AppData\Roaming\npm\codex.ps1`，通过仓库包装器桥接：

```bash
./scripts/wsl/codex-win exec --help
```

在 Ralph 中使用时：

```bash
export RALPH_CODEX_BINARY="/mnt/d/97-CodingProject/Loomic-ArcIns/scripts/wsl/codex-win"
bun /home/admin123/.npm-global/lib/node_modules/@th0rgal/ralph-wiggum/ralph.ts \
  --agent codex \
  --model gpt-5-codex \
  --prompt-file docs/execution/ralph/m1-studio-entry-workspace-shell.prompt.md \
  --max-iterations 6 \
  --completion-promise M1_ARCH_STUDIO_COMPLETE \
  -- \
  --ephemeral \
  -c 'model_reasoning_effort="high"'
```

当前限制说明：

- `./scripts/wsl/codex-win` 现已改为优先调用 Windows `codex.cmd`，而不是 `codex.ps1` npm shim。
- 参数传递采用“WSL JSON args file -> `scripts/wsl/codex-win.ps1` -> `codex.cmd`”路径，已验证：
  - `./scripts/wsl/codex-win exec --help`
  - `./scripts/wsl/codex-win exec --model gpt-5-codex --ephemeral -c 'model_reasoning_effort="high"' 'Return exactly OK.'`
- 当前机器上的 Windows Codex 配置默认 `model_reasoning_effort = "xhigh"`，对 `gpt-5-codex` 不兼容；因此 Ralph + Codex 的所有推荐调用都应附带：

```bash
-- \
--ephemeral \
-c 'model_reasoning_effort="high"'
```

- 当前剩余限制不再是参数级秒退，而是 loop 长跑行为：
  - bounded Ralph loop 可以启动并保持 active
  - 但 trivial smoke loop 仍可能在几分钟后不自动完成，必要时要用 `ralph --status` 检查并手动清理 `.ralph/ralph-loop.state.json`

## 5. Local Supabase Boot

在仓库根目录执行：

```bash
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
cd /mnt/d/97-CodingProject/Loomic-ArcIns
supabase start
supabase status -o env
```

使用仓库脚本直接生成 compose/runtime 共用环境文件：

```bash
./scripts/wsl/write-local-docker-env.sh /tmp/loomic.env
```

说明：

- 该脚本会读取 `supabase status -o env` 输出，并补齐 Loomic server 运行时需要的标准键：
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_DB_URL`
  - `SUPABASE_JWT_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 同时会写入前端与 compose 所需的键：
  - `NEXT_PUBLIC_SERVER_BASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `LOOMIC_ENV_FILE`
- 生成后的 `/tmp/loomic.env` 既作为 `docker compose --env-file` 输入，也作为 `server/worker` 的 `env_file` 来源，避免只配前端变量、漏掉服务端 Supabase 凭据。
- 本地容器验证允许先不填外部 AI Provider Key；此时可完成健康检查、基础路由与工作队列启动验证。
- 如果需要验证真实生成能力，再补充 `GOOGLE_API_KEY` 或 `OPENAI_API_KEY`。

## 6. Compose Workflow

默认采用 WSL Docker host 网络：

```bash
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
cd /mnt/d/97-CodingProject/Loomic-ArcIns
./scripts/wsl/write-local-docker-env.sh /tmp/loomic.env
docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env build
docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env up -d
docker compose -f docker-compose.local.yml ps
curl http://127.0.0.1:3001/api/health
curl -I http://127.0.0.1:3000
```

容器职责：

- `web`: 静态导出的 Next.js 前端，Nginx 在 `3000` 端口对外服务
- `server`: Fastify API + WebSocket，监听 `3001`
- `worker`: 使用与 `server` 同一镜像，以 `SERVICE_MODE=worker` 消费任务

## 7. Host-Network Fallback

若当前 WSL Docker 发行版不支持 `network_mode: host`，唯一回退策略是 `host-gateway`，而不是再设计一套新的本地架构。操作原则：

1. 将 `LOOMIC_DOCKER_NETWORK_MODE` 调整为非 `host` 的值。
2. 把本地 Supabase 相关地址从 `127.0.0.1` 改为 `host.docker.internal`。
3. 为 compose 服务增加 `extra_hosts: ["host.docker.internal:host-gateway"]`。
4. 在 `progress.md` 和 validation 报告中明确记录这次回退。

## 8. Verification Contract

每个里程碑结束前至少执行以下三类验证：

1. 静态验证：`pnpm test`、`pnpm typecheck` 或 package 级验证
2. 容器验证：`docker compose -f docker-compose.local.yml up --build -d`
3. 场景验证：按 milestone 的场景脚本验证功能闭环，并写入 validation 文档

## 9. Operational Notes

- 当前仓库是脏工作区，禁止清理现有未提交改动。
- 所有 Docker / Supabase / Ralph 操作都要在 `progress.md` 中留痕。
- 后续如果更换 Ralph agent、completion promise 或最大迭代次数，必须同步更新对应 prompt 文件和 runbook。

## 10. Fast Web Dev Override (2026-04-16)

For frontend iteration inside WSL Docker, use the dev override instead of rebuilding the production `web` image each time:

```bash
cd /mnt/d/97-CodingProject/Loomic-ArcIns
./scripts/wsl/write-local-docker-env.sh .tmp/loomic-local.env
docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file .tmp/loomic-local.env up -d server worker
pnpm docker:dev:web:detach
```

Notes:
- This keeps `server` / `worker` on the existing acceptance stack while replacing only `web` with a mounted-source `next dev` container.
- `docker-compose.dev.yml` backs these paths with named volumes:
  - `/app/node_modules`
  - package-level `node_modules`
  - `/app/apps/web/.next`
  - `/pnpm/store`
- First cold startup still performs one dependency reconciliation inside the container. In the verified local environment this took about `4m27s` before `next dev` became ready.
- Warm restarts are much faster. Verified timings in this environment:
  - unchanged dev image rebuild: about `7.5s`
  - `up -d --no-deps web`: about `0.6s`
  - `next dev` ready: about `3.4s`
- Keep the production `docker-compose.local.yml` build path for milestone verification only.
