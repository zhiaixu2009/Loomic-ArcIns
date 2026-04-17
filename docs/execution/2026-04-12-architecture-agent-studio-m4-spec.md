# M4 Phase Spec: Architecture Domain Layer

## Goal

在不新增数据库表、不重构 `/canvas` 路由、也不破坏既有 M1-M3 能力的前提下，把 Architecture Studio 从“静态板块说明”推进到“可插入、可识别、可传递给 Agent 的建筑领域层”。

本阶段的 bounded slice 只做三件事：

1. 把建筑板块模板真正写进无限画布，而不是只停留在左侧 rail 的静态卡片。
2. 让前端能够从画布元素中推导出结构化的 architecture board/domain context。
3. 让 Agent run payload 和服务端 prompt 能感知这些 architecture context，并按“多方案比较 -> 策略筛选 -> 渲染 / 视频推进”的语义执行。

## Why This Slice

PRD 中 M4 的核心要求是：

- `M4.1` Architecture boards
- `M4.2` Domain agent context
- `M4.3` Strategy selection
- `M4.4` Video workflow

当前仓库已经具备以下基础：

- 前端已经有 Architecture Studio rail，但板块仍是静态说明卡片。
- 画布是 Excalidraw 实例，`CanvasPageContent` 已持有 live `excalidrawApi`，可以直接 mutate scene。
- M3 已让 `ChatSidebar` / `useChatStream()` / server runtime 具备可视计划和 run lineage 能力。
- run payload 已能传 `prompt`、`attachments`、`mentions`、`canvas summary`，因此新增 architecture context 的成本较低。

真正缺失的不是“再加一个说明面板”，而是：

- 画布里没有可被识别的 architecture board roots
- Agent 看不到当前板块结构和策略候选状态
- 渲染 / storyboard / video workflow 没有 architecture 语义上的前置上下文

## Approaches Considered

### Option A: 继续停留在 rail 静态卡片

- 做法：只把左侧板块卡片做得更丰富，不把任何 board 写进画布，不扩展 run payload。
- 优点：改动最小。
- 缺点：不能满足 `M4.1` 和 `M4.2`；Agent 仍然感知不到 architecture domain state，只是 UI 看起来更像建筑产品。

### Option B: 画布模板 + 共享 architecture context + prompt 注入

- 做法：前端通过 live Excalidraw API 插入 architecture board templates；从当前 scene 推导 board/domain objects；run payload 新增 `architectureContext`；服务端把它序列化进 user message XML；主 prompt 补充建筑策略和视频推进规则。
- 优点：不需要新表；板块真实存在于画布；上下文可持久化于 canvas content；能直接连接 M3 的 plan/step/artifact 体系。
- 缺点：需要同时动 shared/web/server 三层，但边界仍然清晰。

### Option C: 先做完整 DB domain model

- 做法：新增 `architecture_boards` / `architecture_objects` / `strategy_options` 等表，再回填前端与 Agent。
- 优点：长期最强。
- 缺点：超出本阶段边界；当前工作区很脏，数据库层改动会显著扩大风险面。

## Chosen Design

采用 Option B。

M4 的 bounded implementation 约束如下：

- 画布板块模板通过前端 live scene mutation 插入，绝不通过重载 `initialContent` 或 remount `CanvasEditor`。
- architecture domain object 先作为 shared contracts + canvas element `customData` + run payload 语义冻结，不新增数据库表。
- architecture context 从当前画布 elements 与选区推导，作为 run request 的可选字段传给服务端。
- Agent 的建筑特性先通过 prompt discipline 和 context XML 落地，不引入额外 architecture-only agent backend。
- strategy selection 在本阶段表现为：
  - 明确的 `strategyOptions[]` contract
  - prompt 要求先提出多个方向再筛选
  - selected / rejected / proposed 状态可以被上下文表达
- video workflow 在本阶段表现为：
  - architecture context 中显式包含 `storyboard_shots` 与 `video_output`
  - Agent 能基于 render/storyboard 上下文推进到视频生成，而不是盲目生成独立视频

## In Scope

- Shared 层 architecture domain contracts
- `RunCreateRequest` 新增 `architectureContext`
- 前端 architecture board templates 的插入 helper 与 scene 推导 helper
- Architecture rail 从静态 stack 升级为可操作的 board launcher / status surface
- Canvas page 在 architecture mode 下维护当前 board context
- `ChatSidebar` 将 architecture context 带入 start/resume/retry payload
- 服务端 `buildUserMessage()` 新增 architecture XML 注入
- 主 prompt 新增建筑领域规则：板块感知、策略筛选、render -> storyboard -> video 推进
- 定向测试、验证文档、M4 Ralph prompt 更新

## Out Of Scope

- 新建 Supabase migration 或 architecture 专用表
- 新的 HTTP query surface 用于 architecture domain objects
- 服务器主动写入 architecture boards 到 canvas
- 完整 review/export/manifest 能力
- 多用户 architecture board locking / approval workflow

## Frozen Contract For This Phase

### Shared Domain Types

- `architectureBoardKind`
  - `reference_board`
  - `site_analysis`
  - `massing_options`
  - `render_variations`
  - `storyboard_shots`
  - `video_output`

- `architectureObjectType`
  - `site_analysis`
  - `massing_option`
  - `facade_direction`
  - `render_variation`
  - `storyboard_shot`
  - `presentation_video_shot`
  - `review_checkpoint`

- `architectureBoardStatus`
  - `missing`
  - `seeded`
  - `active`

- `architectureStrategyDisposition`
  - `proposed`
  - `selected`
  - `rejected`

### `architectureBoard`

- `boardId`
- `kind`
- `title`
- `status`
- `elementIds`
- `anchor`
  - `x`
  - `y`
  - `width`
  - `height`
- `objectTypes`

### `architectureStrategyOption`

- `optionId`
- `title`
- `summary`
- `disposition`

### `architectureContext`

- `studio: "architecture"`
- `boards`
- `activeBoardId?`
- `selectedElementIds`
- `objectTypesInSelection`
- `strategyOptions`

## Web Design

### 1. Board Template Insertion

新增一个 architecture canvas helper 模块，负责：

- 定义每种 board 的 template metadata
- 基于 viewport / existing scene 计算插入位置
- 生成 Excalidraw elements
- 给 board root elements 写入 `customData.architecture`

每个 board 至少创建：

- 一个 board root 容器元素
- 一个标题元素
- 一组 starter placeholders / prompts

### 2. Board State Derivation

前端从 scene elements 推导当前 architecture boards：

- 通过 `customData.architecture.boardKind` 识别 board roots
- 通过 selection 与 board root 的归属关系识别 active board
- 把缺失的 board 标为 `missing`
- 已插入但未聚焦的 board 标为 `seeded`
- 当前活动 board 标为 `active`

### 3. Rail UX

`ArchitectureStudioRail` 改成真实的 domain launcher：

- 每个 board card 可显示状态
- 提供单板块插入动作
- 提供 “Lay out studio” 或等价的一次性初始化动作
- 移动端 `ArchitectureStudioCompactBar` 只保留紧凑入口，不复制完整栈

## Agent / Server Design

### 1. Run Payload

`RunCreateRequest` 扩展可选 `architectureContext`，由 `ChatSidebar` 在 architecture mode 下自动带上。

它必须覆盖：

- 当前有哪些 boards
- 当前 active board 是什么
- 当前选中元素属于什么 object types
- 当前有哪些 strategy options 及其 disposition

### 2. User Message Enrichment

`buildUserMessage()` 新增 `<architecture_context>` XML block。

XML 至少包含：

- board list
- active board
- selected element ids
- object types in selection
- strategy options

### 3. Prompt Discipline

主 prompt 新增 architecture rules：

- 若存在 architecture context，优先按 board 语义组织执行
- 在进入 render / video 之前，先提出 2-3 个 design strategies
- 当 strategy options 已存在时，优先比较并筛选，而不是重复生成同类方案
- 当 active board 属于 `storyboard_shots` 或 `video_output` 时，优先连接 render/script 上下文再推进视频

## Acceptance Criteria

1. 在 Architecture Studio 中，用户可以从 rail 直接插入单个 architecture board 或初始化整套 board stack。
2. 插入动作不会 remount `CanvasEditor`，而是直接基于 live Excalidraw API 更新 scene。
3. 画布 elements 中存在可稳定识别的 architecture board metadata。
4. 前端可以从当前 scene 推导出结构化 `architectureContext`。
5. `ChatSidebar` 发起 start/resume/retry 时，会把 `architectureContext` 带入 run payload。
6. 服务端构造的 user message 中包含 `<architecture_context>` XML。
7. 主 prompt 能明确要求先做策略筛选，再推进 render / storyboard / video workflow。

## File Map

- Shared
  - `packages/shared/src/architecture-contracts.ts`
  - `packages/shared/src/contracts.ts`
  - `packages/shared/src/contracts.test.ts`
  - `packages/shared/src/index.ts`

- Web
  - `apps/web/src/lib/architecture-canvas.ts` (new)
  - `apps/web/src/app/canvas/page.tsx`
  - `apps/web/src/components/architecture/architecture-studio-rail.tsx`
  - `apps/web/src/components/chat-sidebar.tsx`
  - `apps/web/src/components/canvas-editor.tsx`
  - `apps/web/test/architecture-studio-shell.test.tsx`
  - `apps/web/test/chat-sidebar.test.tsx`
  - `apps/web/test/architecture-canvas.test.ts` (new)

- Server
  - `apps/server/src/agent/runtime.ts`
  - `apps/server/src/agent/prompts/loomic-main.ts`
  - `apps/server/src/agent/runtime.test.ts` (new)

- Docs
  - `docs/execution/2026-04-12-architecture-agent-studio-m4-plan.md`
  - `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
  - `progress.md`

## Verification Commands

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t \"architecture\""
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-studio-shell.test.tsx test/architecture-canvas.test.ts test/chat-sidebar.test.tsx"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/agent/runtime.test.ts"
```

## Completion Rule

本阶段只有在以下条件同时满足后才算完成：

- architecture board/domain contracts 已落地
- Architecture Studio 可把板块真实插入无限画布
- Agent run payload 与服务端 prompt 已能感知 architecture context
- 定向 shared/web/server tests 全部通过
- 文档、验证证据与 M4 Ralph prompt 已同步更新
