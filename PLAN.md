# 建筑设计协同 Agent Studio 执行总计划

## Summary

- 执行将沿用前一版产品规划的 5 个里程碑，不再重新定义产品范围：`M1 Studio Entry + Workspace Shell`、`M2 Real-time Team Collaboration`、`M3 Agent Planning + Autonomous Execution`、`M4 Architecture Domain Layer`、`M5 Sharing / Export / Ops`。
- 一旦退出 Plan Mode，第一批变更只做文档与执行骨架，不写业务代码：创建 PRD、`planning-with-files` 的 3 个根文档、执行 runbook、验证报告、以及 Ralph 分阶段任务提示文件。
- `using-superpowers` 负责整个执行期的技能调度；`planning-with-files` 负责持续留痕；`open-ralph-wiggum` 负责每个里程碑的受控自治循环；执行模式固定为 SDD：主代理负责集成与验收，子代理只处理边界清晰、写入集合不重叠的子任务。
- Docker 运行策略固定为 WSL 优先：应用服务容器在 WSL 的 Docker 中运行；Supabase 本地栈通过 WSL 内的 `supabase` CLI 启动；验证全部以容器化运行结果为准，而不是仅靠本机 `pnpm dev`。

## Doc Set

- PRD 主文档固定为 [docs/prd/2026-04-12-architecture-agent-studio-prd.md](D:/97-CodingProject/Loomic-ArcIns/docs/prd/2026-04-12-architecture-agent-studio-prd.md)。它必须在编码前冻结，并包含：
  - 竞品映射：Lovart、Raphael、建筑学长三者的操作逻辑、信息架构、视觉语言、关键交互、差异化能力。
  - 目标用户与场景：建筑效果图、建筑演示视频、方案推敲、团队评审、客户汇报。
  - 统一产品定义：首页入口、无限画布工作台、右侧 Agent 面板、多人协同层、资产与导出层。
  - 关键流程：从 prompt 进入项目、从参考资料生成画布结构、Agent 制定计划并执行、多人协作、评审与导出。
  - 需求矩阵：所有需求都要带编号，格式固定为 `M{里程碑}.{序号}`，并映射到实现任务和验证用例。
  - 领域模型：建筑参考板、场地分析板、效果图板、镜头脚本板、视频生成板、评审检查点。
  - 非功能要求：实时性、可恢复性、日志、可观测性、多人并发一致性、成本控制。
- `planning-with-files` 固定使用项目根目录下的 3 个长期文档：
  - [task_plan.md](D:/97-CodingProject/Loomic-ArcIns/task_plan.md)：唯一权威的任务分解、状态、负责人、验收标准索引。
  - [findings.md](D:/97-CodingProject/Loomic-ArcIns/findings.md)：仓库事实、外部文档结论、竞品拆解、技术决策记录。
  - [progress.md](D:/97-CodingProject/Loomic-ArcIns/progress.md)：按时间顺序记录执行过程、命令、结果、阻塞、下一步。
- 执行与验证文档固定为：
  - [docs/execution/2026-04-12-architecture-agent-studio-runbook.md](D:/97-CodingProject/Loomic-ArcIns/docs/execution/2026-04-12-architecture-agent-studio-runbook.md)：阶段推进顺序、Ralph 触发条件、子代理分工、回退策略。
  - [docs/verification/2026-04-12-architecture-agent-studio-validation.md](D:/97-CodingProject/Loomic-ArcIns/docs/verification/2026-04-12-architecture-agent-studio-validation.md)：所有验证证据、环境版本、截图/日志索引、通过结论。
- Ralph 的阶段任务提示固定存放在 [docs/execution/ralph/](D:/97-CodingProject/Loomic-ArcIns/docs/execution/ralph/) 下，每个里程碑一个文件；提示内容必须包含阶段目标、允许修改范围、禁止触碰范围、必须更新的文档、必须通过的验证命令、唯一 completion promise。

## Contract Freeze

- 在 PRD 冻结前，不进入功能编码。PRD 必须先冻结以下公共接口与共享契约，后续所有实现都以此为准：
  - 工作台路由与状态模型：首页、项目主页、建筑专用工作台、画布视图、右侧 Agent 检查器、分享/导出状态。
  - 实时协同事件模型：presence、cursor、selection、canvas mutation、agent run state、artifact status、review checkpoint。
  - Agent 运行契约：plan、step、tool action、artifact output、human interrupt、resume、retry、approval gate。
  - 建筑领域对象：site analysis、massing option、facade direction、render variation、storyboard shot、presentation video shot。
  - 导出与分享对象：share snapshot、review package、export manifest、traceability ledger。
- 这些契约后续会落实到共享类型、WebSocket 协议、服务端 API 和前端状态层，但在 PRD 阶段先做语义冻结，避免边写边改。

## Execution Model

- Phase 0 先做环境引导，不做业务实现。执行顺序固定为：
  - 在 WSL 中确认 `/mnt/d/97-CodingProject/Loomic-ArcIns` 为主工作路径。
  - 安装或确认 `pnpm`、`supabase` CLI、`bun`、`ralph` 可用。
  - 优先尝试让 `codex` 在 WSL 可执行；如果无法快速落地，采用默认回退方案：用 Windows 现有 `codex.ps1` 驱动 Ralph，而所有容器、数据库、构建与验证命令仍统一通过 `wsl.exe -e bash -lc` 调用 WSL。
  - 记录当前脏工作区状态到 `progress.md`，后续任何阶段都不得清理或回滚用户已有改动。
- Phase 1 完成 PRD 与计划文件。执行顺序固定为：
  - 先写 PRD，再把 PRD 的需求编号映射到 `task_plan.md`。
  - 再把仓库现状、竞品观察、官方文档结论写入 `findings.md`。
  - 最后把文档创建动作、时间、环境、结论写入 `progress.md`。
- Phase 2 到 Phase 6 对应 M1 到 M5。每个里程碑都走同一套 SDD 流程：
  - 主代理先产出阶段 spec，明确目标、验收标准、允许修改文件范围、验证命令。
  - 只在写入集合明确不重叠时并行子代理，默认分为三条工作带：`web/canvas UX`、`server/agent/ws`、`tests/docs/verification`。
  - 主代理负责集成、冲突处理、代码审查思维、日志与 TODO 补充、以及所有文档回写。
  - 只有在当前里程碑的文档、实现、验证都完成后，才允许进入下一个里程碑。
- Ralph 的自治方式固定为“按阶段自治”，不是全项目一次性 unattended loop：
  - 每个里程碑单独运行一轮 Ralph。
  - 每轮 Ralph 都使用单独 prompt 文件、单独 completion promise、单独最大迭代次数。
  - Ralph 只允许完成当前里程碑定义内的任务，不允许跨阶段扩写需求，也不允许跳过文档更新与验证。
  - 每轮 Ralph 结束后，主代理必须执行一次人工式复核：检查代码风险、验证结果、文档完整性，然后才推进。
- Superpowers 的使用规则固定为：
  - 开始任何具体功能设计前用 `brainstorming` 做方案收敛。
  - 进入某个里程碑前用 `writing-plans` 把 spec 写清。
  - 进入实现前用 `test-driven-development` 先定义验证目标。
  - 里程碑结束前必须走 `verification-before-completion` 和 `requesting-code-review` 的检查思路。
  - 如果遇到 bug 或验证失败，先走 `systematic-debugging`，不能直接拍脑袋改。

## Runtime And Verification

- 容器化运行策略固定为“两层本地栈”：
  - Supabase 本地服务通过 WSL 的 `supabase start` 启动，沿用仓库现有 `supabase/config.toml` 和 migrations。
  - 应用层新增 repo 级 compose 编排，至少包含 `web`、`server`、`worker` 三个服务。
- 默认网络策略为 WSL Docker `host` 网络，让应用容器直接访问 Supabase 本地暴露端口；如果用户机器上的 host 网络存在兼容问题，唯一回退是 `host-gateway` 映射，不再设计第二套架构。
- 每个里程碑的验证必须同时覆盖静态验证、容器验证、场景验证三层：
  - 静态验证：安装、类型检查、单元测试、工作区测试、必要时 package 级测试。
  - 容器验证：镜像可构建、compose 可启动、Web 可访问、API 健康检查可通过、worker 可正常消费任务。
  - 场景验证：
    1. 用户从首页/项目页进入建筑工作台并保留上下文。
    2. 两个用户在同一项目里可见 presence、光标、选区、关键变更。
    3. Agent 能生成可视化执行计划并逐步产出效果图/视频相关资产。
    4. 建筑领域工作流能把参考、分析、效果图、镜头脚本与视频输出放到同一无限画布。
    5. 分享、导出、评审流程不破坏当前 Loomic 已有能力。
- 验证证据必须写入验证文档，格式固定为“时间 + 环境 + 命令/动作 + 结果 + 证据位置 + 是否通过”。`progress.md` 记录过程，验证文档只记录证据与结论，不混写感想。

## Assumptions

- PRD 放在 `docs/prd/`，不新建 `docs/superpowers/` 目录。
- `planning-with-files` 的 3 个根文档是整个项目执行期的唯一过程真相源，不按阶段重复创建。
- Ralph 采用“每个里程碑一轮”的模式，避免在当前脏工作区中做大范围失控修改。
- WSL 中目前已确认有 Docker，但尚未确认 `pnpm`、`bun`、`ralph`、`codex` 全部可用，因此环境引导被视为正式里程碑前置条件。
- 当前仓库在 WSL 下存在大量未提交修改；后续执行默认在现有工作区增量推进，不使用任何破坏性清理命令，不回滚非本次任务改动。
- 对 LangChain、LangGraph、Next.js、Excalidraw、Supabase 的不确定点，执行前必须先查官方文档或源码，并把结论写进 `findings.md` 后再继续。
