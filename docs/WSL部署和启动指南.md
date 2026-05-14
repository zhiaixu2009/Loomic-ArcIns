# WSL部署和启动指南

本文档用于在一台全新的 Windows 机器上，通过 WSL + Docker 从零部署并启动 Loomic-ArcIns。

适用场景：

- Windows 10/11 主机。
- 使用 WSL2 Ubuntu 作为运行环境。
- 使用本仓库内置的本地 Supabase 栈。
- 使用本仓库的 Docker Compose 启动 `server`、`worker`、`web`。
- 浏览器从 Windows 访问 `http://127.0.0.1:3000/home`。

## 1. 目标架构

本地运行时由四部分组成：

| 组件 | 作用 | 默认入口 |
|---|---|---|
| WSL Ubuntu | Linux 运行环境 | `Ubuntu-24.04` |
| Docker Engine | 运行 Supabase 与 Loomic 容器 | WSL 内 Docker |
| Supabase local stack | Postgres、Auth、Storage、REST 等 | `127.0.0.1:54321` |
| Loomic app stack | `server`、`worker`、`web` | Web `127.0.0.1:3000`，API `127.0.0.1:3001` |

项目启动、停止、状态检查统一使用：

```text
docs/scripts/startprogram
```

不要绕过该目录维护另一套启动命令。

## 2. Windows 前置要求

建议环境：

- Windows 11，或支持 WSL2 的 Windows 10。
- PowerShell 5+。
- Git for Windows。
- 稳定网络或代理，确保可以访问 GitHub、Docker registry、npm registry、Supabase 镜像仓库。

安装 Git for Windows：

```powershell
winget install --id Git.Git -e
```

如果没有 `winget`，可从 Git 官网下载安装包。

## 3. 安装 WSL2 Ubuntu

在管理员 PowerShell 中执行：

```powershell
wsl --install -d Ubuntu-24.04
```

如果机器已经安装 WSL，但没有 Ubuntu 24.04：

```powershell
wsl --list --online
wsl --install -d Ubuntu-24.04
```

确认 WSL 版本：

```powershell
wsl --status
wsl -l -v
```

期望 Ubuntu 使用 WSL2。

如果不是 WSL2：

```powershell
wsl --set-version Ubuntu-24.04 2
```

进入 WSL：

```powershell
wsl -d Ubuntu-24.04
```

在 WSL 内更新系统：

```bash
sudo apt update
sudo apt upgrade -y
```

## 4. 启用 WSL systemd

本项目启动脚本会使用 `systemctl start docker`，因此 WSL 内需要启用 systemd。

在 WSL 内执行：

```bash
cat <<'EOF' | sudo tee /etc/wsl.conf
[boot]
systemd=true
EOF
```

回到 Windows PowerShell，重启 WSL：

```powershell
wsl --shutdown
wsl -d Ubuntu-24.04
```

在 WSL 内确认 systemd：

```bash
systemctl is-system-running || true
```

只要 `systemctl` 可用即可。首次启动时可能显示 `running`、`degraded`，不一定阻塞 Docker。

## 5. 在 WSL 内安装 Docker Engine

在 WSL Ubuntu 内执行：

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

添加 Docker apt 源：

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

安装 Docker：

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

把当前用户加入 `docker` 组：

```bash
sudo usermod -aG docker "$USER"
```

退出 WSL 并重启：

```powershell
wsl --shutdown
wsl -d Ubuntu-24.04
```

启动 Docker 并验证：

```bash
sudo systemctl start docker
docker version
docker compose version
```

如果 `docker version` 没权限，确认已经重新进入 WSL，或临时使用：

```bash
sudo docker version
```

## 6. 安装基础工具

在 WSL 内执行：

```bash
sudo apt update
sudo apt install -y git curl unzip tar jq build-essential
```

安装 Node.js。推荐使用 NodeSource Node 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

启用 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.26.2 --activate
node -v
pnpm -v
```

安装 Supabase CLI。推荐使用 npm 全局安装，便于 WSL 本地脚本调用：

```bash
sudo npm install -g supabase
supabase --version
```

如果网络对 npm 不稳定，可以设置 npm 镜像：

```bash
npm config set registry https://registry.npmmirror.com/
sudo npm config set registry https://registry.npmmirror.com/
```

## 7. 拉取项目代码

建议把仓库放在 Windows 磁盘路径下，方便 Windows PowerShell 和 WSL 同时访问。例如：

```powershell
mkdir D:\97-CodingProject
cd D:\97-CodingProject
git clone https://github.com/zhiaixu2009/Loomic-ArcIns.git
cd D:\97-CodingProject\Loomic-ArcIns
```

确认当前代码：

```powershell
git status --short --branch
git log -1 --oneline
```

如果使用代理，先确保 Git 能访问远端：

```powershell
git fetch origin
```

## 8. 首次启动

从 Windows PowerShell 进入仓库根目录：

```powershell
cd D:\97-CodingProject\Loomic-ArcIns
```

执行统一启动入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1
```

默认 WSL 发行版是 `Ubuntu-24.04`。如果你的发行版名称不同，例如 `Ubuntu`：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1 -Distro Ubuntu
```

启动脚本会自动执行：

1. 在 WSL 内启动 Docker。
2. 启动 keepalive，避免 WSL 用户会话退出后 Docker 被停止。
3. 启动 Supabase local stack。
4. 生成 `.tmp/loomic-local.env`。
5. 使用 `docker-compose.local.yml` + `docker-compose.dev.yml` 启动 `server`、`worker`、`web`。
6. 等待 API 和 Web readiness。

启动成功时会输出：

```text
Local runtime ready: http://127.0.0.1:3000/home
API health ready: http://127.0.0.1:3001/api/health
```

## 9. 检查运行状态

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\status-local-runtime.ps1
```

关键结果应包含：

```text
keepalive=running
docker=active
loomic-arcins-server-1   Up ... healthy
http://127.0.0.1:3000/home => 200
http://127.0.0.1:3001/api/health => 200
```

浏览器打开：

```text
http://127.0.0.1:3000/home
```

注意：

- `3000` 是用户访问入口。
- `3001` 是后端 API 端口。
- `54321` 是 Supabase API 入口。
- `54323` 是 Supabase Studio。

## 10. 停止服务

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\stop-local-runtime.ps1
```

该命令会停止 Loomic 业务容器。Supabase 容器状态以脚本实现为准；如果需要手动停止 Supabase，可在 WSL 仓库目录执行：

```bash
supabase stop
```

## 11. 更新代码后重启

```powershell
cd D:\97-CodingProject\Loomic-ArcIns
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1
```

如果 Docker 镜像或依赖变化较大，可以在 WSL 内重建：

```bash
cd /mnt/d/97-CodingProject/Loomic-ArcIns
docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file .tmp/loomic-local.env build
```

然后重新启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1
```

## 12. 从旧机器迁移现有数据

如果只是全新体验，可以跳过本节。

如果要保留旧机器上的项目、画布、图库、图片文件，必须迁移两个 Docker volume：

| Volume | 内容 |
|---|---|
| `supabase_db_loomic` | Postgres 数据库、业务表、Storage 元数据 |
| `supabase_storage_loomic` | Supabase Storage 真实文件 |

旧机器导出：

```powershell
cd D:\97-CodingProject\Loomic-ArcIns
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\stop-local-runtime.ps1
```

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "mkdir -p /mnt/d/97-CodingProject/Loomic-ArcIns/.backup && docker run --rm -v supabase_db_loomic:/volume -v /mnt/d/97-CodingProject/Loomic-ArcIns/.backup:/backup alpine sh -lc 'cd /volume && tar czf /backup/supabase_db_loomic.tar.gz .'"
```

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker run --rm -v supabase_storage_loomic:/volume -v /mnt/d/97-CodingProject/Loomic-ArcIns/.backup:/backup alpine sh -lc 'cd /volume && tar czf /backup/supabase_storage_loomic.tar.gz .'"
```

把以下文件复制到新机器同一路径：

```text
.backup/supabase_db_loomic.tar.gz
.backup/supabase_storage_loomic.tar.gz
```

新机器恢复前，确保服务未启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\stop-local-runtime.ps1
```

恢复数据库 volume：

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker volume create supabase_db_loomic && docker run --rm -v supabase_db_loomic:/volume -v /mnt/d/97-CodingProject/Loomic-ArcIns/.backup:/backup alpine sh -lc 'cd /volume && tar xzf /backup/supabase_db_loomic.tar.gz'"
```

恢复 Storage volume：

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker volume create supabase_storage_loomic && docker run --rm -v supabase_storage_loomic:/volume -v /mnt/d/97-CodingProject/Loomic-ArcIns/.backup:/backup alpine sh -lc 'cd /volume && tar xzf /backup/supabase_storage_loomic.tar.gz'"
```

恢复后启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\start-local-runtime.ps1
```

## 13. 数据迁移后验收

在新机器执行：

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.projects;'"
```

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.canvases;'"
```

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.official_gallery_assets;'"
```

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.add_gallery_assets;'"
```

检查 Storage bucket：

```powershell
wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e bash -lc "docker exec supabase_db_loomic psql -U postgres -d postgres -c 'select bucket_id, count(*) from storage.objects group by bucket_id order by bucket_id;'"
```

迁移后还要在浏览器检查：

- 首页已有项目是否显示。
- 最近项目封面是否显示。
- 打开已有画布是否正常。
- 画布内项目图片是否显示。
- 左侧【添加】图库是否有图片。
- 图片编辑【图库】是否有图片。
- 插入图库图片是否成功。

## 14. AI 和第三方能力配置

最小本地启动不要求 AI key。

如果要启用 Agent、图片生成、视频生成，需要提供相关密钥，例如：

```text
OPENAI_API_KEY
OPENAI_API_BASE
GOOGLE_API_KEY
REPLICATE_API_TOKEN
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_VERTEX_PROJECT
GOOGLE_VERTEX_LOCATION
```

当前本地启动脚本会根据 `supabase status -o env` 生成 `.tmp/loomic-local.env`。如果需要把第三方密钥注入容器，推荐用以下方式之一：

1. 在启动脚本生成 `.tmp/loomic-local.env` 后，把密钥追加进去，再重启 `server` 和 `worker`。
2. 扩展 `docs/scripts/startprogram/wsl/write-local-docker-env.sh`，把需要的密钥写入 `.tmp/loomic-local.env`。
3. 在未来整理一个专用 `.env.local.private` 合并流程。

不要把真实密钥提交到 Git。

## 15. 常见问题

### 15.1 `systemctl start docker` 失败

确认 WSL 已启用 systemd：

```bash
cat /etc/wsl.conf
```

应包含：

```text
[boot]
systemd=true
```

然后在 Windows 执行：

```powershell
wsl --shutdown
```

重新进入 WSL。

### 15.2 Docker registry 拉取失败

通常是网络或代理问题。确认 Windows 代理已开启，并且 WSL 能访问外网：

```bash
curl -I https://registry-1.docker.io
curl -I https://registry.npmmirror.com
```

如需代理，给 WSL shell 配置：

```bash
export HTTP_PROXY=http://host.docker.internal:7890
export HTTPS_PROXY=http://host.docker.internal:7890
```

端口按你的代理软件实际端口调整。

### 15.3 `supabase start` 长时间等待

Windows 重启后，Supabase Postgres 可能需要冷恢复。脚本会等待一段时间，不要看到第一次 `unhealthy` 就删除 volume。

查看日志：

```bash
docker logs --tail=160 supabase_db_loomic
```

### 15.4 `3000` 或 `3001` 访问失败

检查状态：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\scripts\startprogram\status-local-runtime.ps1
```

检查容器：

```bash
docker ps
```

检查 API：

```bash
curl -i http://127.0.0.1:3001/api/health
```

检查 Web：

```bash
curl -I http://127.0.0.1:3000/home
```

### 15.5 不要把 `3001` 当成用户入口

用户入口是：

```text
http://127.0.0.1:3000/home
```

`3001` 只是后端 API。

### 15.6 不要用 bridge IP 做最终验收

不要把 `172.17.x.x` 当成稳定入口。最终验收统一看：

```text
http://127.0.0.1:3000/home
http://127.0.0.1:3001/api/health
```
