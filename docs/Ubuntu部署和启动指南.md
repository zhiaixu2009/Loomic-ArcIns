# Ubuntu部署和启动指南

本文档用于在一台全新的 Ubuntu 机器上，从零部署并启动 Loomic-ArcIns。

适用场景：

- 原生 Ubuntu 服务器或桌面系统。
- 推荐 Ubuntu 24.04 LTS。
- 使用 Docker Engine 和本地 Supabase 栈。
- 使用仓库内 Docker Compose 启动 `server`、`worker`、`web`。
- 浏览器访问 `http://127.0.0.1:3000/home`。如果是远程服务器，需要通过 SSH 隧道、反向代理或防火墙开放端口访问。

## 1. 目标架构

| 组件 | 作用 | 默认入口 |
|---|---|---|
| Ubuntu | 主机系统 | 24.04 LTS 推荐 |
| Docker Engine | 运行 Supabase 与 Loomic 容器 | 本机 Docker |
| Supabase local stack | Postgres、Auth、Storage、REST 等 | `127.0.0.1:54321` |
| Loomic app stack | `server`、`worker`、`web` | Web `127.0.0.1:3000`，API `127.0.0.1:3001` |

项目启动、停止、状态检查统一使用：

```text
docs/scripts/startprogram
```

Ubuntu 原生环境使用其中的 Bash 入口：

```text
docs/scripts/startprogram/wsl/*.sh
```

目录名虽然叫 `wsl`，但脚本本身是通用 Bash 逻辑，可以在原生 Ubuntu 上使用。

## 2. 系统要求

建议配置：

- Ubuntu 24.04 LTS。
- CPU 4 核以上。
- 内存 8GB 以上，图库较大时建议 16GB。
- 磁盘 80GB 以上，若迁移完整图库和项目数据，建议预留 150GB 以上。
- 网络可访问 GitHub、Docker registry、npm registry、Supabase 镜像仓库。

更新系统：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release git unzip tar jq build-essential
```

## 3. 安装 Docker Engine

添加 Docker GPG key：

```bash
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

启动并设置开机自启：

```bash
sudo systemctl enable --now docker
```

把当前用户加入 `docker` 组：

```bash
sudo usermod -aG docker "$USER"
```

重新登录 shell，或者临时执行：

```bash
newgrp docker
```

验证：

```bash
docker version
docker compose version
```

## 4. 安装 Node.js、pnpm、Supabase CLI

安装 Node.js 22：

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

安装 Supabase CLI：

```bash
sudo npm install -g supabase
supabase --version
```

如果 npm 网络不稳定，可以改用国内镜像：

```bash
npm config set registry https://registry.npmmirror.com/
sudo npm config set registry https://registry.npmmirror.com/
```

## 5. 拉取项目代码

选择部署目录，例如：

```bash
sudo mkdir -p /opt/loomic
sudo chown -R "$USER:$USER" /opt/loomic
cd /opt/loomic
git clone https://github.com/zhiaixu2009/Loomic-ArcIns.git
cd /opt/loomic/Loomic-ArcIns
```

确认代码：

```bash
git status --short --branch
git log -1 --oneline
```

如果是私有仓库或网络需要代理，先配置 Git 访问，再继续。

## 6. 首次启动

在仓库根目录执行：

```bash
cd /opt/loomic/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/start-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

启动脚本会自动执行：

1. 启动 keepalive。
2. 确认 Docker 可用。
3. 执行 `supabase start`。
4. 等待 Supabase ready。
5. 生成 `.tmp/loomic-local.env`。
6. 使用 `docker-compose.local.yml` + `docker-compose.dev.yml` 启动 `server`、`worker`、`web`。
7. 等待 API 和 Web readiness。

启动成功输出：

```text
Local runtime ready: http://127.0.0.1:3000/home
API health ready: http://127.0.0.1:3001/api/health
```

## 7. 检查运行状态

```bash
bash docs/scripts/startprogram/wsl/status-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

同时检查 HTTP：

```bash
curl -i http://127.0.0.1:3001/api/health
curl -I http://127.0.0.1:3000/home
```

关键结果：

```text
docker=active
loomic-arcins-server-1 healthy
API health 200
Web home 200
```

本机浏览器访问：

```text
http://127.0.0.1:3000/home
```

如果是远程服务器，可以用 SSH 隧道从本地访问：

```bash
ssh -L 3000:127.0.0.1:3000 -L 3001:127.0.0.1:3001 user@your-server
```

然后在本地浏览器打开：

```text
http://127.0.0.1:3000/home
```

## 8. 停止服务

```bash
cd /opt/loomic/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/stop-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

如需停止 Supabase：

```bash
supabase stop
```

## 9. 更新代码后重启

```bash
cd /opt/loomic/Loomic-ArcIns
git pull --ff-only
bash docs/scripts/startprogram/wsl/start-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

如果依赖或 Dockerfile 有明显变化，可以先重建镜像：

```bash
docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file .tmp/loomic-local.env build
bash docs/scripts/startprogram/wsl/start-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

## 10. 从旧机器迁移现有数据

如果是全新启动，可以跳过本节。

如果要保留旧机器已有项目、画布、图库和图片文件，必须迁移两个 Docker volume：

| Volume | 内容 |
|---|---|
| `supabase_db_loomic` | Postgres 数据库、业务表、Storage 元数据 |
| `supabase_storage_loomic` | Supabase Storage 真实文件 |

旧机器导出：

```bash
cd /opt/loomic/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/stop-local-runtime.sh /opt/loomic/Loomic-ArcIns || true
mkdir -p .backup
docker run --rm -v supabase_db_loomic:/volume -v "$PWD/.backup:/backup" alpine sh -lc 'cd /volume && tar czf /backup/supabase_db_loomic.tar.gz .'
docker run --rm -v supabase_storage_loomic:/volume -v "$PWD/.backup:/backup" alpine sh -lc 'cd /volume && tar czf /backup/supabase_storage_loomic.tar.gz .'
```

把以下文件复制到新机器：

```text
.backup/supabase_db_loomic.tar.gz
.backup/supabase_storage_loomic.tar.gz
```

新机器恢复前，确保服务没有运行：

```bash
cd /opt/loomic/Loomic-ArcIns
bash docs/scripts/startprogram/wsl/stop-local-runtime.sh /opt/loomic/Loomic-ArcIns || true
supabase stop || true
```

恢复 volume：

```bash
docker volume create supabase_db_loomic
docker run --rm -v supabase_db_loomic:/volume -v "$PWD/.backup:/backup" alpine sh -lc 'cd /volume && tar xzf /backup/supabase_db_loomic.tar.gz'
```

```bash
docker volume create supabase_storage_loomic
docker run --rm -v supabase_storage_loomic:/volume -v "$PWD/.backup:/backup" alpine sh -lc 'cd /volume && tar xzf /backup/supabase_storage_loomic.tar.gz'
```

恢复后启动：

```bash
bash docs/scripts/startprogram/wsl/start-local-runtime.sh /opt/loomic/Loomic-ArcIns
```

## 11. 数据迁移后验收

检查核心业务表：

```bash
docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.projects;'
docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.canvases;'
docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.official_gallery_assets;'
docker exec supabase_db_loomic psql -U postgres -d postgres -Atc 'select count(*) from public.add_gallery_assets;'
```

检查 Storage bucket：

```bash
docker exec supabase_db_loomic psql -U postgres -d postgres -c 'select bucket_id, count(*) from storage.objects group by bucket_id order by bucket_id;'
```

重点检查：

- `add-gallery-assets` 是否有数据。
- `official-gallery-assets` 是否有数据。
- `project-assets` 是否有数据。
- 首页项目是否显示。
- 画布项目图片是否显示。
- 左侧【添加】图库是否有图片。
- 图片编辑【图库】是否有图片。

## 12. AI 和第三方能力配置

最小本地启动不要求 AI key。

如果要启用 Agent、图片生成、视频生成，需要配置相关密钥：

```text
OPENAI_API_KEY
OPENAI_API_BASE
GOOGLE_API_KEY
REPLICATE_API_TOKEN
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_VERTEX_PROJECT
GOOGLE_VERTEX_LOCATION
```

当前启动脚本会生成 `.tmp/loomic-local.env`，并把它作为 `server` 和 `worker` 的 `env_file`。如果需要注入第三方密钥，推荐：

1. 扩展 `docs/scripts/startprogram/wsl/write-local-docker-env.sh`，把密钥写入 `.tmp/loomic-local.env`。
2. 或在启动后手动追加到 `.tmp/loomic-local.env`，再重启业务容器：

```bash
docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file .tmp/loomic-local.env restart server worker
```

不要把真实密钥提交到 Git。

## 13. 远程服务器访问方式

如果 Ubuntu 是远程服务器，不建议直接裸露本地开发端口到公网。

开发调试推荐 SSH 隧道：

```bash
ssh -L 3000:127.0.0.1:3000 -L 3001:127.0.0.1:3001 user@your-server
```

如果确实要局域网访问，可以确认防火墙：

```bash
sudo ufw status
```

按需开放端口：

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

公网部署建议另行配置 Nginx / Caddy / HTTPS / 域名 / 鉴权策略，不建议把 Supabase local stack 的端口直接暴露到公网。

## 14. 常见问题

### 14.1 Docker 无权限

现象：

```text
permission denied while trying to connect to the Docker daemon socket
```

处理：

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker version
```

必要时退出 SSH 后重新登录。

### 14.2 Docker 未启动

```bash
sudo systemctl enable --now docker
systemctl status docker --no-pager -l
```

### 14.3 Docker registry 或 npm 下载慢

设置 npm 镜像：

```bash
npm config set registry https://registry.npmmirror.com/
sudo npm config set registry https://registry.npmmirror.com/
```

如果服务器需要代理：

```bash
export HTTP_PROXY=http://your-proxy-host:7890
export HTTPS_PROXY=http://your-proxy-host:7890
```

Docker daemon 代理需要单独配置 systemd drop-in，不要只设置 shell 变量。

### 14.4 Supabase 启动后 DB 短暂 unhealthy

Postgres 冷恢复可能需要时间，尤其是迁移了较大的 volume 后。先看日志：

```bash
docker logs --tail=160 supabase_db_loomic
```

不要在未确认原因前删除 `supabase_db_loomic` 或 `supabase_storage_loomic`。

### 14.5 Web 可访问但图库没图片

优先检查 Storage 对象数量：

```bash
docker exec supabase_db_loomic psql -U postgres -d postgres -c 'select bucket_id, count(*) from storage.objects group by bucket_id order by bucket_id;'
```

如果数据库表有图库索引，但 Storage bucket 数量为 0，说明只迁移了 DB，没有迁移 `supabase_storage_loomic`。

### 14.6 不要把 `3001` 当用户入口

用户入口：

```text
http://127.0.0.1:3000/home
```

API 健康检查：

```text
http://127.0.0.1:3001/api/health
```

### 14.7 不要用 Docker bridge IP 做最终验收

不要用 `172.17.x.x` 作为稳定入口。最终验收统一看：

```text
http://127.0.0.1:3000/home
http://127.0.0.1:3001/api/health
```
