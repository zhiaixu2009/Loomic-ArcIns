## 核心要求
- 代码旨在为高效生产和高质量要求而不是MVP搭建DEMO完成，完成功能要考虑产品特性和整体交互，阅读以及撰写时思维需要有大局观，以第一性原理直击痛点。
- 在相关代码加入对应日志便于后续线上或本地排查，以及TODO或相关备注 为后续他人接手提供更好的桥梁。赠人玫瑰手留余香。
- 以后本仓库内所有运行、联调、验收、真实验证默认都必须在容器环境中完成；除非用户明确批准，否则宿主机直跑只能用于临时排查，不能作为最终结果或验证结论。

# langchain框架使用指南

关于langchain，langgraph，deepagents相关开发查看官方llm.txt 作为索引 看对应网址文档 获取最佳实践，https://docs.langchain.com/llms.txt

对于其他框架包括nextjs,excalidraw等不理解或者不熟悉的地方 一定要 先去看文档或者源码再开始！ 确保先获取信息上下文再开干，不然容易导致返工。
## Subagent 默认策略
- 本仓库内任何 spawn_agent 调用都必须显式传入 model: "gpt-5.4"，除非用户明确要求其他模型。
- 不要因为任务看起来简单，就自动降级到 mini / cheap / codex-mini 一类模型。
- 如果后续确实需要改用其他模型，先在 progress.md 记录原因、风险和回退方案，再执行。

## Bug 修复记录
- 每一次 bug 修复任务都必须在 `docs/bug-fix-log.md` 追加一条带日期的修复记录，作为结束流程的一部分，不允许省略。
- 每条记录至少要包含：问题现象、根因分析、代码层修复方案、验证证据、以及仍需关注的后续事项。

## 本地容器启动与验证记忆
- 本仓库本地开发入口固定使用 WSL + Docker 容器环境，默认通过 `scripts/wsl/start-local-runtime.sh /mnt/d/97-CodingProject/Loomic-ArcIns` 启动；不要绕过该脚本直接把宿主机进程当作最终验证依据。
- 浏览器入口是 `http://127.0.0.1:3000/home`；`3001` 是后端 API 端口，仅用于前端调用和健康检查，例如 `http://127.0.0.1:3001/api/health`。不要把 `3001` 解释为用户访问入口。
- 当前验证过的稳定网络方案是 Loomic 业务容器使用 WSL `host` 网络；`docker-compose.dev.yml` 不应默认强制 `bridge + ports`。历史问题显示 Docker daemon 恢复后 bridge/proxy 可能出现“Compose 显示 3000/3001 已发布，但 curl reset/timeout”的假可用状态。
- 不要把 `172.17.x.x` / bridge IP 当作稳定入口或验收依据。bridge IP 会随容器 recreate 变化，只能临时排查，最终验证统一看 `127.0.0.1:3000/home` 和 `127.0.0.1:3001/api/health`。
- WSL 用户会话退出可能触发 `docker.service` 停止，日志表现为 `Stopping docker.service`、`Processing signal 'terminated'`。启动前后必须确认 `.tmp/loomic-runtime-keepalive.pid` 对应的 keepalive 进程仍在，并确认 `systemctl is-active docker` 为 `active`。
- 如果 `docker ps` 显示业务容器 `Up`，但 `ss -ltnp` 没有 `:3000` / `:3001` 监听，或 server 进程进入 `D` 状态，不要继续复用该容器。先等待 Docker 明确 `active`，再用 compose 强制 recreate `server worker web`。
- `start-local-runtime.sh` 应等待 Docker ready、Supabase ready、`server` healthy，并等 `GET /api/health` 与 `GET /home` 真正返回成功后再结束。后续修改启动脚本时不能移除这些 readiness gate。
- 容器运行验收的最小证据链：`systemctl is-active docker` 为 `active`；`loomic-arcins-server-1` 为 `healthy`；`curl -fsS http://127.0.0.1:3001/api/health` 成功；`curl -fsS http://127.0.0.1:3000/home` 成功；真实浏览器打开 `http://127.0.0.1:3000/home` 页面标题为 `Loomic` 且 console 无 error。
- 如果 `/api/add-gallery` 未带 token 返回 `401 Unauthorized`，这是路由存在且鉴权生效的正常结果；`404` 才表示路由未挂载或运行时不是最新代码。
