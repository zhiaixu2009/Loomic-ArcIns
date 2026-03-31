import type { StructuredTool } from "@langchain/core/tools";
import type { BackendFactory, BackendProtocol } from "deepagents";

import type { ConnectionManager } from "../../ws/connection-manager.js";
import { createBrandKitTool } from "./brand-kit.js";
import {
  createExecuteCodeTool,
  type SubmitCodeExecutionFn,
} from "./execute-code.js";
import { createInspectCanvasTool } from "./inspect-canvas.js";
import { createManipulateCanvasTool } from "./manipulate-canvas.js";
import {
  createImageGenerateTool,
  type PersistImageFn,
  type SubmitImageJobFn,
} from "./image-generate.js";
import { createProjectSearchTool } from "./project-search.js";
import { createScreenshotCanvasTool } from "./screenshot-canvas.js";
import {
  createVideoGenerateTool,
  type SubmitVideoJobFn,
} from "./video-generate.js";
import { createPersistSandboxFileTool } from "./persist-sandbox-file.js";

export { createImageGenerateTool } from "./image-generate.js";
export { createVideoGenerateTool } from "./video-generate.js";
export { createInspectCanvasTool } from "./inspect-canvas.js";
export { createManipulateCanvasTool } from "./manipulate-canvas.js";

// ---------------------------------------------------------------------------
// deepagents built-in tools reference (由 FilesystemMiddleware 自动注入)
// ---------------------------------------------------------------------------
//
// deepagents@1.8.4 通过 createFilesystemMiddleware 自动注入以下工具，
// 我们自定义的工具名称不能与这些冲突：
//
//   ls          — 列出目录内容
//   read_file   — 读取文件内容（支持 offset/limit）
//   write_file  — 写入文件
//   edit_file   — 编辑文件（find & replace）
//   glob        — 按模式匹配文件路径
//   grep        — 按正则搜索文件内容
//   execute     — 执行 shell 命令 ⚠️ 仅当 backend 实现 SandboxBackendProtocol 时可用
//   task        — 分发子任务到 subagent
//   write_todos — 管理 TODO 列表
//
// ⚠️ 关于 "execute" 工具:
//   deepagents 总是创建 execute 工具，但在 wrapModelCall 中根据
//   isSandboxBackend(backend) 的结果决定是否过滤掉它。
//
//   - StateBackend (state 模式/线上)   → 不是 sandbox → execute 被过滤掉
//   - LocalShellBackend (filesystem 模式/本地开发) → 是 sandbox → execute 可用
//   - BaseSandbox 子类 (E2B/Modal 等云沙箱) → 是 sandbox → execute 可用
//
//   LocalShellBackend 就是一个 sandbox 实现，不需要购买任何云服务。
//   它继承 FilesystemBackend 并实现 SandboxBackendProtocol，
//   通过 child_process.spawn 在本机执行命令。
//
//   我们的 PGMQ 代码执行工具命名为 "execute_code" 而非 "execute"，
//   因为 deepagents 的过滤逻辑会移除所有 name === "execute" 的工具，
//   包括我们自定义的。使用不同的名字绕开这个限制。
// ---------------------------------------------------------------------------

export function createMainAgentTools(
  backend: BackendProtocol | BackendFactory,
  deps: {
    createUserClient: (accessToken: string) => any;
    brandKitId?: string | null;
    connectionManager?: ConnectionManager;
    persistImage?: PersistImageFn;
    sandboxDir?: string;
    submitCodeExecution?: SubmitCodeExecutionFn;
    submitImageJob?: SubmitImageJobFn;
    submitVideoJob?: SubmitVideoJobFn;
  },
) {
  const tools: StructuredTool[] = [
    createProjectSearchTool(backend),
    createInspectCanvasTool(deps),
    createManipulateCanvasTool(deps),
    createImageGenerateTool({
      ...(deps.persistImage ? { persistImage: deps.persistImage } : {}),
      ...(deps.submitImageJob ? { submitImageJob: deps.submitImageJob } : {}),
    }),
    createVideoGenerateTool({
      ...(deps.submitVideoJob ? { submitVideoJob: deps.submitVideoJob } : {}),
    }),
    createPersistSandboxFileTool({
      createUserClient: deps.createUserClient,
      ...(deps.sandboxDir ? { sandboxDir: deps.sandboxDir } : {}),
    }),
    // PGMQ-based code execution tool (named "execute_code" to avoid conflict
    // with deepagents' built-in "execute" which it manages via FilesystemMiddleware).
    ...(deps.submitCodeExecution
      ? [createExecuteCodeTool({ submitCodeExecution: deps.submitCodeExecution })]
      : []),
  ];
  if (deps.brandKitId) {
    tools.push(createBrandKitTool(deps, deps.brandKitId));
  }
  if (deps.connectionManager) {
    tools.push(createScreenshotCanvasTool({ connectionManager: deps.connectionManager }));
  }
  return tools;
}

/** @deprecated Use createMainAgentTools + sub-agents instead */
export function createPhaseATools(backend: BackendProtocol | BackendFactory) {
  return [
    createProjectSearchTool(backend),
    createImageGenerateTool(),
    createVideoGenerateTool(),
  ] as const;
}
