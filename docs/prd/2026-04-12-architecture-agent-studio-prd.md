# 建筑设计协同 Agent Studio PRD

- 日期：2026-04-12
- 状态：Frozen for Implementation
- 适用范围：Loomic Web / Server / Shared Contracts / Local WSL Docker Runtime

## 1. Product Summary

建筑设计协同 Agent Studio 是在现有 Loomic 画布式 AI 创作产品之上，进一步聚焦建筑效果图、建筑演示视频、方案推敲与团队评审的专业工作台。产品目标不是做一个新的“建筑图片生成器”，而是提供一个能让团队在同一无限画布中完成参考整理、方案推理、效果图迭代、镜头脚本组织、视频生成和交付评审的协同式 Agent 工作空间。

该产品必须融合三类竞品优势：

- Lovart：无限 chat-canvas 一体化创作，Agent 与画布元素共享上下文。
- Raphael Studio：从 prompt 直接进入 studio 的创作入口，强调生成式工作台而不是传统项目配置。
- 建筑学长 Canvas：围绕建筑方案表达的左中右三栏工作区，强调素材、画布、AI 辅助的同时存在。

## 2. Target Users And Jobs

### 2.1 核心用户

- 建筑设计师：快速生成和对比效果图、体块方向、立面策略。
- 设计助理与可视化团队：将参考图、草图、文本描述和风格约束整理到同一画布。
- 项目经理与主创建筑师：在同一项目中指派 Agent 执行方案探索、组织评审节点、保留设计决策链路。
- 客户汇报制作人员：从效果图扩展到镜头脚本、演示视频、导出评审包。

### 2.2 关键任务

- 从一句自然语言和若干参考图，快速生成一个“可继续推敲”的建筑工作台。
- 将场地分析、风格方向、功能分区、外立面演变和效果图放在同一无限画布中持续迭代。
- 允许多人同时查看、讨论、选择、标注和推进同一项目。
- 让 Agent 不只生成单个结果，而是提出策略、列出步骤、执行并回填结果。
- 将最终成果导出为可分享、可复盘、可评审的交付包。

## 3. Competitive Synthesis

### 3.1 Lovart

- 操作逻辑：强调对话与无限画布结合，AI 既理解聊天上下文也理解画布状态。
- 设计语言：专业创作工具感强，工作台优先，不依赖模板市场式入口。
- 可借鉴点：
  - chat 与 canvas 的统一上下文
  - 画布中的智能元素操作语义
  - Agent 驱动的多轮创作连续性

### 3.2 Raphael Studio

- 操作逻辑：prompt-first，用户几乎从首页直接进入生成式工作流。
- 设计语言：更偏“创作 studio”而不是“管理后台”，入口更短。
- 可借鉴点：
  - 首页 prompt 到工作台的短链路
  - 工作台前置而非复杂表单前置
  - 面向创作而非管理的首屏叙事

### 3.3 建筑学长 Canvas

- 操作逻辑：左侧工具与上下文、中心无限画布、右侧 AI 辅助区明确分工。
- 设计语言：更偏专业生产工具，信息密度高，强调建筑表达任务。
- 可借鉴点：
  - 三栏式建筑工作区
  - 在无限画布里组织参考、效果图、说明、局部迭代
  - 贴近建筑设计师的任务对象和表达方式

### 3.4 综合产品方向

Loomic 的建筑版不追求“像谁”，而是形成一个更一致的产品定义：

- 入口像 Raphael：从 prompt 快速进入项目。
- 工作台像 建筑学长：三栏式生产空间。
- 智能中枢像 Lovart：Agent 对计划、画布、素材、产物具有统一上下文。

## 4. Product Definition

### 4.1 信息架构

- Landing / Home：展示建筑场景入口、示例、推荐提示与最近项目。
- Projects：统一项目列表，并允许以“建筑工作台”方式打开。
- Architecture Studio：
  - 左侧：项目导航、板块切换、协作者状态、场景模板
  - 中间：无限画布
  - 右侧：Agent 计划、执行状态、推荐动作、生成与导出
- Share / Export：分享快照、评审包、导出 manifest、追踪记录

### 4.2 统一工作台原则

- Prompt 不是一次性输入，而是项目创建和持续迭代的起点。
- Agent 不是黑盒生成器，而是可见、可干预、可恢复的执行者。
- 画布不是图像容器，而是参考、分析、图像、视频、文本和评审状态的共存空间。
- 协同不是额外页面，而是任何项目与画布的默认能力。

## 5. Core Flows

### 5.1 Prompt → Project → Studio

1. 用户从 Landing / Home 输入建筑需求或选择示例。
2. 系统创建项目与主画布，带着 prompt 与附件进入 Architecture Studio。
3. Agent 根据 prompt、附件和工作区模板给出初始计划，并在右侧面板展示。
4. 中心画布预置相应板块：参考区、分析区、方案区、效果图区、视频脚本区。

### 5.2 Agent Strategy → Execution → Canvas Materialization

1. Agent 先输出可视化计划，而不是立即生成全部结果。
2. 用户可以接受、调整、跳过、继续执行某一步。
3. 每一步都能产生 artifact，并在画布中落位到对应板块。
4. 产物状态必须可追踪：待执行、运行中、完成、失败、需要确认。

### 5.3 Multi-User Collaboration

1. 同一项目中的成员可同时进入工作台。
2. 用户可见在线状态、当前活动板块、光标、选区、关键画布变更。
3. Agent 的计划和步骤变化对协作者可见。
4. 评审与导出结果可以被共享和回溯。

## 6. Requirement Matrix

| ID | Requirement | Description | Validation |
|----|-------------|-------------|------------|
| M1.1 | Architecture entry | Home / Projects / Canvas 必须可进入建筑工作台路径 | 入口跳转场景验证 |
| M1.2 | Studio shell | 工作台必须具备左中右结构且在桌面与移动端可用 | UI 验证 + 页面测试 |
| M1.3 | Project continuity | 创建项目后必须保留 prompt、附件与上下文进入工作台 | 创建项目流测试 |
| M1.4 | Workspace navigation | 用户可在工作台内切换板块和视图，不丢失当前 canvas 上下文 | 交互测试 |
| M2.1 | Presence | 同项目用户可见在线状态 | 协作场景验证 |
| M2.2 | Cursor sync | 同项目用户可见彼此光标位置 | 协作场景验证 |
| M2.3 | Selection sync | 同项目用户可见关键选区与当前关注对象 | 协作场景验证 |
| M2.4 | Canvas mutation sync | 画布关键更新可广播给同项目用户 | WS / 场景验证 |
| M3.1 | Visible plan | Agent 必须在执行前输出计划及步骤列表 | Chat / Agent 面板验证 |
| M3.2 | Step lifecycle | 每个步骤必须有状态和时间顺序 | 共享契约 + UI 验证 |
| M3.3 | Artifact linkage | 步骤产物必须关联到画布与会话 | 场景验证 |
| M3.4 | Human interrupt | 用户必须可以暂停、继续、重试或调整计划 | 交互验证 |
| M4.1 | Architecture boards | 提供建筑参考板、场地分析板、效果图板、镜头脚本板、视频板 | 工作台验证 |
| M4.2 | Domain agent context | Agent 必须感知建筑对象与当前板块状态 | Agent 场景验证 |
| M4.3 | Strategy selection | Agent 必须能提出多个设计方向并进行筛选 | 方案对比场景 |
| M4.4 | Video workflow | 从效果图或脚本推进到建筑演示视频流程 | 视频场景验证 |
| M5.1 | Share snapshot | 支持分享项目快照或评审链接 | 分享场景验证 |
| M5.2 | Review package | 支持导出评审包，包括选定画布区域和步骤摘要 | 导出验证 |
| M5.3 | Export manifest | 产出结构化 manifest 记录 artifacts、版本与来源 | 文件验证 |
| M5.4 | Traceability | 用户可追溯关键设计策略、执行步骤和结果 | 文档 / UI 验证 |

## 7. Contract Freeze

### 7.1 Route And State Model

- `/home`：建筑入口、推荐示例、最近项目。
- `/projects`：项目列表与建筑工作台入口。
- `/canvas?id=<canvasId>`：现有基础画布路由，扩展为可识别 architecture studio mode。
- 新增建筑工作台壳层状态：
  - 当前板块 `board`
  - 当前协作视图 `collabView`
  - 当前 Agent 面板选项卡 `agentPaneTab`
  - 当前评审状态 `reviewState`

### 7.2 Real-Time Event Model

新增或冻结以下事件语义：

- `presence.updated`
- `cursor.moved`
- `selection.updated`
- `canvas.mutated`
- `agent.plan.updated`
- `agent.step.updated`
- `artifact.status.updated`
- `review.checkpoint.updated`

这些事件必须能映射到同一项目 / 画布上下文，并通过共享类型约束字段。

### 7.3 Agent Run Contract

Agent 运行必须具备：

- `plan`
- `step`
- `tool action`
- `artifact output`
- `interrupt`
- `resume`
- `retry`
- `approval gate`

任何执行流都不能只暴露“最终文本结果”，必须暴露步骤与产物状态。

### 7.4 Architecture Domain Objects

冻结以下领域对象语义：

- `site_analysis`
- `massing_option`
- `facade_direction`
- `render_variation`
- `storyboard_shot`
- `presentation_video_shot`
- `review_checkpoint`

### 7.5 Share / Export Objects

- `share_snapshot`
- `review_package`
- `export_manifest`
- `traceability_ledger`

## 8. Non-Functional Requirements

- 实时性：多人协作下，presence 与关键变更应在秒级反馈。
- 可恢复性：WS 断开后可恢复到最近可用状态，Agent 运行状态不丢失。
- 可观测性：关键服务端路径必须增加日志，复杂改动应带 TODO / 备注方便后续接手。
- 一致性：多人协同事件与画布持久化不能相互打架，必须定义广播与保存边界。
- 成本控制：默认沿用现有模型偏好与积分体系，不引入不可控生成风暴。
- 容器化可验证：所有关键能力必须能通过 WSL Docker 与本地 Supabase 进行验证。

## 9. Success Criteria

- 用户可以从首页一句 prompt 创建一个建筑项目，并直接进入可用的 Architecture Studio。
- 两位用户可在同一项目中看到彼此 presence 与关键动作。
- Agent 能以“计划 -> 步骤 -> 产物”的形式驱动效果图 / 视频工作流。
- 画布中可以同时组织参考、分析、效果图、镜头脚本和视频结果。
- 最终可以通过分享 / 导出 / 评审包完成交付闭环。

## 10. Rollout Sequence

1. Phase 0：环境引导与文档基线
2. Phase 1：PRD、planning-with-files、runbook、validation、Ralph prompt
3. M1：Architecture Studio 入口与工作台壳层
4. M2：多人协同与实时事件
5. M3：Agent 可视化规划与执行
6. M4：建筑领域层与专项工作流
7. M5：分享、导出、运维与容器化验证
