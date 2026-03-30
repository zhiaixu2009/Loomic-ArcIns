import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { tool } from "@langchain/core/tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const persistSandboxFileSchema = z.object({
  filePath: z
    .string()
    .describe(
      "Absolute path to the file in the sandbox directory (e.g., /tmp/loomic-sandbox/<runId>/output.png)",
    ),
  title: z
    .string()
    .optional()
    .describe("Optional human-readable title for the file"),
});

export type PersistSandboxFileDeps = {
  createUserClient: (accessToken: string) => SupabaseClient;
};

export function createPersistSandboxFileTool(deps: PersistSandboxFileDeps) {
  return tool(
    async (input, config) => {
      const accessToken = (config as any)?.configurable?.access_token as
        | string
        | undefined;
      const canvasId = (config as any)?.configurable?.canvas_id as
        | string
        | undefined;

      if (!accessToken) {
        return "Error: No access token available. Cannot upload file.";
      }

      try {
        const fileBuffer = await readFile(input.filePath);
        const ext = extname(input.filePath).toLowerCase();
        const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
        const fileName = input.title
          ? `${input.title}${ext}`
          : basename(input.filePath);

        const storagePath = canvasId
          ? `${canvasId}/generated/${Date.now()}-${fileName}`
          : `uploads/${Date.now()}-${fileName}`;

        const client = deps.createUserClient(accessToken);
        const { data, error } = await client.storage
          .from("project-assets")
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (error) {
          return `Error uploading file: ${error.message}`;
        }

        const {
          data: { signedUrl },
        } = await client.storage
          .from("project-assets")
          .createSignedUrl(data.path, 3600);

        return JSON.stringify({
          summary: `File uploaded successfully: ${fileName}`,
          url: signedUrl,
          path: data.path,
          mimeType,
          size: fileBuffer.length,
        });
      } catch (err: any) {
        return `Error reading or uploading file: ${err.message}`;
      }
    },
    {
      name: "persist_sandbox_file",
      description:
        "Upload a file generated in the sandbox (e.g., a PDF or PNG created by Python code execution) " +
        "to persistent storage. Returns a signed URL the user can access. " +
        "Use this after execute() produces an output file you want to share with the user.",
      schema: persistSandboxFileSchema,
    },
  );
}
