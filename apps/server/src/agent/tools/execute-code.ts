import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PGMQ-based code execution tool ("execute_code")
// ---------------------------------------------------------------------------
//
// 为什么叫 "execute_code" 而不是 "execute"?
//
// deepagents 的 FilesystemMiddleware 内部创建了一个名为 "execute" 的工具，
// 并根据 isSandboxBackend() 决定是否向模型暴露。当 backend 不是 sandbox
// (比如 state 模式下的 StateBackend)，它会过滤掉 ALL name === "execute" 的工具。
//
// 如果我们的工具也叫 "execute"，会被 deepagents 连带过滤掉。
// 所以命名为 "execute_code" 来绕开这个限制。
//
// deepagents 提供的 sandbox backend 选项（都实现 SandboxBackendProtocol）：
//
//   TS/Node.js (我们用的):
//     - LocalShellBackend  — 本地免费，child_process.spawn，无隔离
//     - BaseSandbox 抽象类 — 自己实现 execute()/uploadFiles()/downloadFiles()
//
//   Python SDK (参考，我们不用):
//     - AgentCoreSandbox (AWS MicroVM, @langchain/agentcore)
//     - ModalSandbox (GPU, @langchain/modal)
//     - DaytonaSandbox (快速冷启, @langchain/daytona)
//     - RunloopSandbox (disposable devbox, @langchain/runloop)
//
//   以上 sandbox 都能自动启用内置 "execute" 工具。
//   不用 sandbox 也可以 — 就是我们现在的方案：
//   state 模式 + PGMQ 队列异步执行，不依赖任何 sandbox 服务。
//
// 我们的方案：
//   Agent → execute_code tool → PGMQ → Worker → 隔离子进程 → 结果回传
//   不需要购买任何云沙箱服务，Worker 进程在自己的服务器上跑。
// ---------------------------------------------------------------------------

/**
 * Result returned from the PGMQ-based code execution job.
 */
export type CodeExecutionResult = {
  output: string;
  exitCode: number;
  files: Array<{
    name: string;
    url: string;
    size: number;
    mime_type: string;
  }>;
};

/**
 * Closure type for submitting a code execution job via PGMQ and polling
 * until completion. Implemented in runtime.ts using the same pattern as
 * submitImageJob / submitVideoJob.
 */
export type SubmitCodeExecutionFn = (input: {
  command: string;
}) => Promise<CodeExecutionResult | { error: string }>;

/**
 * Create the custom `execute` tool for production mode (PGMQ-based).
 *
 * In production, there is no LocalShellBackend, so deepagents does not
 * inject its built-in `execute` tool. This custom tool provides the same
 * interface — the agent and SKILLs call `execute({ command })` as usual.
 *
 * The tool submits the command as a background job via PGMQ, which is
 * picked up by the worker process, run in an isolated subprocess, and
 * output files are auto-uploaded to Supabase Storage.
 */
export function createExecuteCodeTool(deps: {
  submitCodeExecution: SubmitCodeExecutionFn;
}) {
  return tool(
    async (input) => {
      try {
        const result = await deps.submitCodeExecution({
          command: input.command,
        });

        // Error case (timeout, dead-letter, etc.)
        if ("error" in result) {
          return `Error: ${result.error}\n[Command failed]`;
        }

        // Build output matching deepagents' built-in execute format
        const parts: string[] = [];

        if (result.output) {
          parts.push(result.output);
        }

        parts.push(
          `[Command ${result.exitCode === 0 ? "succeeded" : "failed"} with exit code ${result.exitCode}]`,
        );

        if (result.files.length > 0) {
          parts.push("");
          parts.push("Generated files:");
          for (const file of result.files) {
            parts.push(`- ${file.name}: ${file.url}`);
          }
        }

        return parts.join("\n");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}\n[Command failed]`;
      }
    },
    {
      name: "execute_code",
      description:
        "Execute a shell command in an isolated sandbox environment. " +
        "Python 3, Pillow, reportlab, and common CLI tools are available. " +
        "Output files created in the working directory are automatically uploaded " +
        "and their URLs are returned.",
      schema: z.object({
        command: z.string().describe("Shell command to execute"),
      }),
    },
  );
}
