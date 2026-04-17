# M3 Phase Spec: Agent Planning + Autonomous Execution

## Goal

在现有 Loomic 运行时之上补齐一条“可见计划 -> 步骤推进 -> 产物关联 -> 人类打断 / 继续 / 重试”的最小闭环，并把它稳定接到 Architecture Studio 右侧 Agent 面板中。

## Why This Slice

当前系统已经具备这些基础能力：

- WS 驱动的 `run.started` / `message.delta` / `thinking.delta` / `tool.started` / `tool.completed` 流式事件。
- 工具产物 `artifacts` 与画布同步 `canvas.sync`。
- 聊天消息 `contentBlocks` 的持久化与重连回放。
- 每个画布单一活跃 run 的运行模型。

当前真正缺失的是一等公民的执行控制面：

- 看不到 Agent 的计划和剩余步骤。
- 工具调用不等于步骤，用户无法知道“现在做到第几步”。
- 没有清晰的 interrupt / resume / retry 语义。
- 产物虽然存在，但没有和步骤层显式关联。

## Approaches Considered

### Option A: 只从现有 tool blocks / write_todos 推断计划

- 做法：不新增共享契约，只在前端把 `tool.started` / `tool.completed` 重新解释成步骤。
- 优点：改动最小。
- 缺点：工具调用不等于计划步骤，无法稳定表达“待执行步骤”和“人类打断后继续”。`write_todos` 又不是对外契约，后续可维护性差。

### Option B: 显式 Plan/Step 契约 + 轻量 planning tools + 右侧计划块

- 做法：新增 `agent.plan.updated` / `agent.step.updated` 事件、`agent-plan` 内容块、以及 `agent.interrupt` / `agent.resume` / `agent.retry` 命令；通过轻量工具显式发布计划和步骤状态。
- 优点：边界清晰、改动集中、可与现有 `tool.completed.artifacts` 共存、无需马上引入新数据库表。
- 缺点：需要 Agent 遵守新的工具协议。

### Option C: 完整的服务端编排器 + 持久化步骤表 + DAG

- 做法：构建独立 planner / executor / step store / artifact store。
- 优点：长期最强。
- 缺点：超出当前 M3 边界，风险和工期都过高。

## Chosen Design

采用 Option B。

核心原则：

- 保持“一次只允许一个画布活跃 run”的运行模型，不在 M3 提前引入多 run 并发编排。
- 保持现有 `tool.completed.artifacts` 向后兼容，不重写 tool block 体系。
- 新增一层轻量的“计划块”作为执行控制面，把计划和步骤持久化到现有聊天消息 `contentBlocks` 中。
- `resume` 与 `retry` 都创建新的 run，但复用相同 session/thread 上下文。

这意味着：

- `interrupt` 会结束当前 run，并把计划块状态标记为 `interrupted`。
- `resume` 会基于上一个 run 的 plan snapshot 和当前 thread 继续执行剩余步骤，产出一个新的 run。
- `retry` 会重新基于原始 prompt 发起新的 run，并建立 lineage。

## In Scope

- 共享层新增 plan / step / interrupt / lineage 契约。
- WS 协议新增 `agent.interrupt` / `agent.resume` / `agent.retry`。
- Stream events 新增 `agent.plan.updated`、`agent.step.updated`、`run.interrupted`、`run.resumed`、`run.retried`。
- 聊天消息 `contentBlocks` 新增 `agent-plan` 块。
- 右侧 Agent 面板渲染计划块、步骤状态、步骤产物摘要、继续 / 重试入口。
- 运行时支持保存当前计划快照、当前步骤、原始请求快照。
- 文档、验证、日志同步更新。

## Out Of Scope

- 新建 `agent_run_steps` / `agent_run_artifacts` 表。
- 多画布或多 run 的并发执行编排。
- 通用 approval-form / human form filling 系统。
- 完整 HTTP 查询面（`GET /api/agent/runs/:runId`）与数据库级恢复。
- 建筑领域对象和建筑板块工作流，这属于 M4。

## Frozen Contract For This Phase

### Shared Types

- `agentPlanSchema`
  - `planId`
  - `runId`
  - `goal`
  - `status`
  - `steps`
  - optional `updatedAt`
  - optional `sourceRunId`

- `agentPlanStepSchema`
  - `stepId`
  - `title`
  - `description?`
  - `status`
  - `toolCallIds`
  - `artifactCount`
  - `lastUpdatedAt`
  - `errorMessage?`

- `runInterruptSchema`
  - `runId`
  - `reason`
  - `message?`
  - `interruptedAt`

- `agentPlanBlockSchema`
  - `type: "agent-plan"`
  - `runId`
  - `status`
  - `goal`
  - `steps`
  - optional `sourceRunId`
  - optional `interrupt`

### New Stream Events

- `agent.plan.updated`
- `agent.step.updated`
- `run.interrupted`
- `run.resumed`
- `run.retried`

### New WS Commands

- `agent.interrupt`
- `agent.resume`
- `agent.retry`

## Runtime Design

### 1. Explicit Planning Tools

新增服务端工具，由 Agent 主动调用：

- `publish_plan`
  - 输入：goal + steps[]
  - 作用：写入运行时 plan snapshot，并广播 `agent.plan.updated`

- `update_plan_step`
  - 输入：stepId + status + optional description / errorMessage
  - 作用：更新步骤状态，并广播 `agent.step.updated`

这些工具不直接生成画布产物，只负责执行状态可视化。

### 2. Tool / Artifact Linkage

- 现有 `tool.started` / `tool.completed` 保持不变。
- runtime 维护当前激活 step。
- 当 `tool.completed` 带 `artifacts` 时，把对应 `toolCallId` 追加到当前 step，并更新 `artifactCount`。
- 计划块只显示步骤级摘要；详细产物仍由现有 tool block 负责。

### 3. Interrupt / Resume / Retry

- `agent.interrupt`
  - 终止当前 run。
  - 广播 `run.interrupted`。
  - 把计划块状态标记为 `interrupted`。

- `agent.resume`
  - 创建新的 run。
  - 复用原 session/thread。
  - 以“继续执行剩余步骤”为提示注入。
  - 广播 `run.resumed`，其中携带 `sourceRunId`。

- `agent.retry`
  - 创建新的 run。
  - 复用原 prompt 与上下文。
  - 广播 `run.retried`，其中携带 `sourceRunId`。

## Frontend Design

### 1. Message Model

- `ContentBlock` 新增 `agent-plan`，但它的主要职责是持久化 run 计划快照，而不是直接渲染进正文 transcript。
- `useChatStream()` 负责把新的 plan/step/run events 映射为聊天消息中的 plan block 更新，同时同步一份 run-scoped plan panel state。
- 计划块既保留在消息中用于会话刷新恢复，又由 `ChatSidebar` 抽取到独立的 `AgentPlanPanel` 中展示。

### 2. Rendering

- 新建 `AgentPlanPanel`。
- 显示：
  - 当前目标
  - 步骤列表与状态徽标
  - 每步关联的 tool count / artifact count
  - 当前 run 状态
  - `Interrupt` / `Resume` / `Retry` 行为按钮

- `ChatMessage` 不重复在正文 transcript 中渲染 `agent-plan`，避免和既有 tool trace 混在一起。
- `ChatSidebar` 负责：
  - 记录每个 run 的原始 request 快照
  - 从消息 blocks 中抽取当前会话最近的 plan snapshot
  - 将计划动作转发给 `useWebSocket()`
  - streaming 时显示 `Interrupt`
  - interrupted / failed / completed 后显示 `Resume` / `Retry`

### 3. Persistence

- 计划块与 tool blocks 一样落入 `contentBlocks`，由现有 `chatService.createMessage()` 持久化。
- 这保证了刷新会话后，用户仍能看到上一次的计划与步骤状态。

## Acceptance Criteria

1. 新 run 开始后，Agent 面板中会出现一个可见计划块，而不是只显示纯文本和工具卡片。
2. 计划块中的每个 step 都有稳定 `stepId` 与明确状态。
3. 当图片 / 视频 / 画布工具完成后，当前 step 的 `toolCallIds` 与 `artifactCount` 会更新。
4. 用户可在 streaming 中触发 `Interrupt`，并看到计划块变为 `interrupted`。
5. 用户可基于中断的计划块触发 `Resume`，并看到新的 run 继续推进剩余步骤。
6. 用户可基于已有计划块触发 `Retry`，并看到新的 run 从头执行。
7. 刷新页面并重新进入会话后，计划块仍可通过历史消息看到。

## File Map

- Shared
  - `packages/shared/src/contracts.ts`
  - `packages/shared/src/events.ts`
  - `packages/shared/src/ws-protocol.ts`

- Server
  - `apps/server/src/agent/runtime.ts`
  - `apps/server/src/agent/prompts/loomic-main.ts`
  - `apps/server/src/agent/tools/index.ts`
  - `apps/server/src/agent/tools/agent-plan.ts`
  - `apps/server/src/ws/handler.ts`

- Web
  - `apps/web/src/hooks/use-chat-stream.ts`
  - `apps/web/src/hooks/use-websocket.ts`
  - `apps/web/src/components/chat-sidebar.tsx`
  - `apps/web/src/components/agent-plan-panel.tsx`
  - `apps/web/src/components/chat-message.tsx`

- Tests
  - `packages/shared/src/contracts.test.ts`
  - `apps/server/src/**/*.test.ts`
  - `apps/web/test/**/*.test.tsx`

## Verification Commands

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/server exec vitest run src/ws/connection-manager.test.ts src/http/canvases.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/use-chat-stream.test.ts test/chat-message.test.tsx"
```

## Completion Rule

本阶段只有在以下条件同时满足后才算完成：

- 计划块契约与事件契约已经落地。
- 右侧 Agent 面板已经可视化 plan / step / interrupt / retry / resume。
- 定向测试全部通过。
- `progress.md` 与 validation 文档已回写证据。
