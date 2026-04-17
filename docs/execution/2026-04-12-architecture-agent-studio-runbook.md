# 建筑设计协同 Agent Studio Runbook

## 1. 执行目标

本 runbook 用于约束本项目在当前脏工作区中的执行方式，确保文档、实现、验证、自治循环和代码审查保持一致。

## 2. 执行顺序

1. Phase 0：环境引导
2. Phase 1：PRD / 计划文件 / Ralph prompts
3. M1：Studio Entry + Workspace Shell
4. M2：Real-time Team Collaboration
5. M3：Agent Planning + Autonomous Execution
6. M4：Architecture Domain Layer
7. M5：Sharing / Export / Ops
8. Final：容器化验证、代码审查、交付总结

## 3. SDD Working Model

### 3.1 主代理职责

- 负责读取计划、切换阶段、整合代码、处理冲突、补写日志与 TODO。
- 负责更新 `task_plan.md`、`findings.md`、`progress.md`。
- 负责所有最终验证命令与结论写入 validation 报告。
- 负责在每个里程碑结束前执行一次“规格符合性检查”和一次“代码质量检查”思路复核。

### 3.2 子代理职责

- 仅在写入范围不重叠时并行。
- 默认三条工作带：
  - `web/canvas UX`
  - `server/agent/ws`
  - `tests/docs/verification`
- 子代理不得回滚其他人改动，不得越权修改未授权文件。

### 3.3 Review Gates

- Gate A：Spec compliance
  - 是否满足 PRD 与当前里程碑 spec
  - 是否没有无关扩写
- Gate B：Code quality
  - 是否符合现有模式
  - 是否补充了必要日志、TODO、注释
  - 是否存在明显回归风险

## 4. Ralph Usage

### 4.1 使用原则

- 仅按里程碑启动，不做全项目一次性循环。
- 每轮只允许处理当前里程碑范围。
- 每轮都必须：
  - 使用单独 prompt 文件
  - 限定允许修改范围
  - 指定禁止修改范围
  - 指定必须更新文档
  - 指定必须通过的验证命令
  - 输出唯一 completion promise

### 4.2 启动前检查

- `task_plan.md` 当前阶段是否正确
- 相关 prompt 文件是否已更新
- 当前仓库是否有待整合的未审查修改
- 当前 WSL / Windows CLI 是否满足 Ralph 运行要求
- `docs/execution/2026-04-12-architecture-agent-studio-wsl-runtime.md` 是否与当前机器状态一致
- `scripts/wsl/codex-win` 是否仍能返回 `codex exec --help`

### 4.3 结束后检查

- 审核 diff 是否只覆盖当前里程碑
- 重新运行验证命令
- 将结果写入 `progress.md` 与 validation 文档

## 5. Documentation Obligations

- 新发现写入 `findings.md`
- 新动作和结果写入 `progress.md`
- 阶段状态变化写入 `task_plan.md`
- 验证证据写入 validation 文档
- 任何环境限制、回退策略都必须写入文档而不是只留在会话上下文

## 6. Rollback Strategy

- 不使用 `git reset --hard`、`git checkout --` 等破坏性命令。
- 若某一步验证失败：
  - 先记录错误
  - 再切换策略
  - 连续三次失败后再升级说明
- 代码回退仅限本次新增改动，且必须先确认不影响用户现有未提交内容。

## 7. WSL Docker Strategy

- 所有构建、容器、数据库、本地 Supabase 验证默认通过 `wsl.exe -e bash -lc` 发起。
- 预期运行层：
  - Local Supabase：WSL CLI 启动
  - `web`：compose service
  - `server`：compose service
  - `worker`：compose service
- 网络默认采用 host；若 host 不可用，则退回 `host-gateway`。
- 运行细节以 `docs/execution/2026-04-12-architecture-agent-studio-wsl-runtime.md` 为准。

## 8. Completion Definition

一个里程碑只有在以下条件全部满足后才算完成：

- 代码实现完成
- 文档回写完成
- 静态验证通过
- 容器验证通过
- 至少一个真实场景验证通过
- 主代理完成 spec / quality 双重复核
