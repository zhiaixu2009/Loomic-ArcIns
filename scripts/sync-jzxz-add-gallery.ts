import { mkdir, rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

import type { Database } from "../packages/shared/src/supabase/database.ts";
import {
  ADD_GALLERY_STORAGE_BUCKET,
  buildAddGalleryStorageObjectPath,
  createAddGalleryAssetId,
  createAddGalleryCategoryId,
  createAddGallerySubtypeId,
  filterAddGalleryCategoriesForSync,
  findAddGalleryStaleIds,
  parseAddGalleryConfigValue,
  reusePersistedAddGalleryAsset,
  type AddGallerySyncCategory,
} from "../apps/server/src/features/add-gallery/add-gallery-sync.ts";

type SyncCliOptions = {
  categoryLabels: string[];
  downloadConcurrency: number;
  maxAssetsPerSubtype: number | null;
  pageSize: number;
  session: string;
  skipCleanup: boolean;
  subtypeLabels: string[];
};

type AddGalleryCategoryRow = {
  created_at?: string;
  id: string;
  is_active: boolean;
  label: string;
  sort_order: number;
  source_meta: Record<string, unknown>;
  updated_at?: string;
};

type AddGallerySubtypeRow = {
  category_id: string;
  created_at?: string;
  id: string;
  is_active: boolean;
  label: string;
  sort_order: number;
  source_meta: Record<string, unknown>;
  source_tag: string;
  source_type: string;
  updated_at?: string;
};

type AddGalleryAssetRow = {
  asset_url: string;
  byte_size: number | null;
  category_id: string;
  created_at?: string;
  height: number;
  id: string;
  is_active: boolean;
  mime_type: string | null;
  sort_order: number;
  source_asset_id: string | null;
  source_asset_url: string;
  source_meta: Record<string, unknown>;
  source_tag: string;
  source_thumb_url: string | null;
  source_type: string;
  storage_bucket: string;
  storage_object_path: string | null;
  subtype_id: string;
  title: string;
  updated_at?: string;
  width: number;
};

type ExistingAssetRow = {
  asset_url: string;
  byte_size: number | null;
  id: string;
  mime_type: string | null;
  storage_bucket: string;
  storage_object_path: string | null;
};

type JzxzReferenceAsset = {
  height: number;
  id?: number | string | null;
  largeUrl: string;
  thumbUrl?: string | null;
  width: number;
};

type SyncRunProgress = {
  assetIds: string[];
  categoryIds: string[];
  subtypeIds: string[];
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type ChromeCdpSession = {
  close: () => Promise<void>;
  evaluate: <T>(expression: string) => Promise<T>;
};
type ChromeTargetInfo = {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

const JZXZ_HOME_URL = "https://www.jianzhuxuezhang.com/canvas/home";
const CHROME_EXECUTABLE_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_STARTUP_TIMEOUT_MS = 60_000;
const QUERY_CONFIGS_URL =
  "https://api.jianzhuxuezhang.com/jzxz/v1/config/queryConfigs";
const CHROME_SESSION_ROOT_DIR = path.join(
  process.cwd(),
  ".tmp",
  "add-gallery-sync-browser",
);
const CDP_EVENT_POLL_INTERVAL_MS = 100;
const CDP_PROCESS_EXIT_TIMEOUT_MS = 5_000;
const REMOTE_DOWNLOAD_RETRY_ATTEMPTS = 3;
const REMOTE_DOWNLOAD_RETRY_DELAY_MS = 500;

let activeBrowserSession: ChromeCdpSession | null = null;

function parseCliArgs(argv: string[]): SyncCliOptions {
  const options: SyncCliOptions = {
    categoryLabels: [],
    downloadConcurrency: 4,
    maxAssetsPerSubtype: null,
    pageSize: 100,
    session: "add-gallery-sync",
    skipCleanup: false,
    subtypeLabels: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    const consumeNumber = () => {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      return Number.isFinite(value) ? value : null;
    };

    if (token === "--session") {
      options.session = argv[index + 1] ?? options.session;
      index += 1;
      continue;
    }

    if (token === "--category-label") {
      const value = argv[index + 1]?.trim();
      if (value) {
        options.categoryLabels.push(value);
      }
      index += 1;
      continue;
    }

    if (token === "--subtype-label") {
      const value = argv[index + 1]?.trim();
      if (value) {
        options.subtypeLabels.push(value);
      }
      index += 1;
      continue;
    }

    if (token === "--download-concurrency") {
      const value = consumeNumber();
      if (value && value > 0) {
        options.downloadConcurrency = value;
      }
      continue;
    }

    if (token === "--page-size") {
      const value = consumeNumber();
      if (value && value > 0) {
        options.pageSize = value;
      }
      continue;
    }

    if (token === "--max-assets-per-subtype") {
      const value = consumeNumber();
      options.maxAssetsPerSubtype = value && value > 0 ? value : null;
      continue;
    }

    if (token === "--skip-cleanup") {
      options.skipCleanup = true;
    }
  }

  return options;
}

function createAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required. Run with --env-file=.tmp/loomic-local.env or set the env explicitly.",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function sanitizeSessionToken(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "default";
}

async function findAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address !== "object") {
        server.close(() => {
          reject(new Error("Failed to allocate a Chrome CDP port."));
        });
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function waitForChromePageTarget(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const targets = await fetchJsonOrThrow<ChromeTargetInfo[]>(
        `http://127.0.0.1:${port}/json/list`,
      );
      const target = targets.find(
        (entry) =>
          entry.type === "page" &&
          typeof entry.webSocketDebuggerUrl === "string" &&
          entry.webSocketDebuggerUrl.length > 0,
      );

      if (target?.webSocketDebuggerUrl) {
        return target;
      }
    } catch {
      // Chrome may not have opened the DevTools endpoint yet.
    }

    await sleep(250);
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms while waiting for a Chrome CDP page target.`,
  );
}

async function waitForChromePageReady(
  send: <T>(method: string, params?: Record<string, unknown>) => Promise<T>,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const evaluation = await send<{
      exceptionDetails?: {
        text?: string;
      };
      result: {
        value?: {
          href?: string;
          readyState?: string;
        };
      };
    }>("Runtime.evaluate", {
      awaitPromise: true,
      expression:
        "({ href: location.href, readyState: document.readyState })",
      returnByValue: true,
    });

    if (evaluation.exceptionDetails) {
      await sleep(250);
      continue;
    }

    const readyState = evaluation.result.value?.readyState;
    const href = evaluation.result.value?.href ?? "";
    if (readyState === "complete" && href.startsWith(JZXZ_HOME_URL)) {
      return;
    }

    await sleep(250);
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms while waiting for ${JZXZ_HOME_URL} to finish loading.`,
  );
}

async function waitForChromeProcessExit(
  chromeProcess: ReturnType<typeof spawn>,
  timeoutMs: number,
) {
  if (chromeProcess.exitCode != null) {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      chromeProcess.once("exit", () => {
        resolve();
      });
    }),
    sleep(timeoutMs),
  ]);
}

async function createChromeCdpSession(session: string): Promise<ChromeCdpSession> {
  const port = await findAvailablePort();
  const userDataDir = path.join(
    CHROME_SESSION_ROOT_DIR,
    `${sanitizeSessionToken(session)}-${Date.now()}`,
  );
  await mkdir(userDataDir, { recursive: true });

  let stdoutPreview = "";
  let stderrPreview = "";
  let websocket: WebSocket | null = null;
  let closed = false;
  let socketClosedUnexpectedly = false;

  const chromeProcess = spawn(
    CHROME_EXECUTABLE_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  chromeProcess.stdout.on("data", (chunk) => {
    stdoutPreview = `${stdoutPreview}${chunk.toString()}`.slice(-4000);
  });
  chromeProcess.stderr.on("data", (chunk) => {
    stderrPreview = `${stderrPreview}${chunk.toString()}`.slice(-4000);
  });

  const close = async () => {
    if (closed) {
      return;
    }

    closed = true;
    try {
      websocket?.close();
    } catch {
      // no-op
    }

    if (chromeProcess.exitCode == null && !chromeProcess.killed) {
      chromeProcess.kill("SIGTERM");
      await waitForChromeProcessExit(chromeProcess, CDP_PROCESS_EXIT_TIMEOUT_MS);
    }

    if (chromeProcess.exitCode == null && !chromeProcess.killed) {
      chromeProcess.kill("SIGKILL");
      await waitForChromeProcessExit(chromeProcess, CDP_PROCESS_EXIT_TIMEOUT_MS);
    }

    await rm(userDataDir, { recursive: true, force: true }).catch(() => {
      // Ignore cleanup failures; a fresh directory is used on every run.
    });
  };

  try {
    const target = await waitForChromePageTarget(port, CDP_STARTUP_TIMEOUT_MS);
    const pending = new Map<
      number,
      {
        reject: (reason?: unknown) => void;
        resolve: (value: unknown) => void;
      }
    >();
    const events: Array<{
      method: string;
      params?: Record<string, unknown>;
    }> = [];
    let nextMessageId = 1;

    websocket = new WebSocket(target.webSocketDebuggerUrl!);

    await new Promise<void>((resolve, reject) => {
      websocket!.once("open", () => {
        resolve();
      });
      websocket!.once("error", reject);
    });

    websocket.on("message", (chunk) => {
      const message = JSON.parse(chunk.toString()) as
        | {
            error?: Record<string, unknown>;
            id?: number;
            result?: unknown;
          }
        | {
            method?: string;
            params?: Record<string, unknown>;
          };

      if (
        "id" in message &&
        typeof message.id === "number" &&
        pending.has(message.id)
      ) {
        const resolver = pending.get(message.id)!;
        pending.delete(message.id);
        if ("error" in message && message.error) {
          resolver.reject(
            new Error(
              `Chrome CDP command failed: ${JSON.stringify(message.error)}`,
            ),
          );
          return;
        }

        resolver.resolve(("result" in message ? message.result : null) ?? null);
        return;
      }

      if ("method" in message && typeof message.method === "string") {
        events.push({
          method: message.method,
          params: "params" in message ? message.params : undefined,
        });
      }
    });

    websocket.on("close", () => {
      socketClosedUnexpectedly = !closed;
      const error = new Error(
        "Chrome CDP websocket closed before the sync run completed.",
      );
      for (const resolver of pending.values()) {
        resolver.reject(error);
      }
      pending.clear();
    });

    const send = <T>(
      method: string,
      params: Record<string, unknown> = {},
    ) =>
      new Promise<T>((resolve, reject) => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
          reject(new Error("Chrome CDP websocket is not open."));
          return;
        }

        const id = nextMessageId;
        nextMessageId += 1;
        pending.set(id, {
          reject,
          resolve: resolve as (value: unknown) => void,
        });

        websocket.send(JSON.stringify({ id, method, params }), (error) => {
          if (!error) {
            return;
          }

          pending.delete(id);
          reject(error);
        });
      });

    const waitForEvent = async (method: string, timeoutMs: number) => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const eventIndex = events.findIndex((event) => event.method === method);
        if (eventIndex >= 0) {
          const [event] = events.splice(eventIndex, 1);
          return event;
        }

        await sleep(CDP_EVENT_POLL_INTERVAL_MS);
      }

      throw new Error(
        `Timed out after ${timeoutMs}ms while waiting for Chrome CDP event ${method}.`,
      );
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", {
      url: JZXZ_HOME_URL,
    });
    await waitForEvent("Page.loadEventFired", CDP_STARTUP_TIMEOUT_MS);
    await waitForChromePageReady(send, CDP_STARTUP_TIMEOUT_MS);

    console.info("[add-gallery-sync] established Chrome CDP session", {
      port,
      session,
      url: JZXZ_HOME_URL,
      userDataDir,
    });

    return {
      async close() {
        await close();
      },

      async evaluate<T>(expression: string) {
        if (socketClosedUnexpectedly) {
          throw new Error(
            "Chrome CDP websocket closed unexpectedly before evaluation.",
          );
        }

        const evaluation = await send<{
          exceptionDetails?: {
            exception?: {
              description?: string;
            };
            text?: string;
          };
          result: {
            description?: string;
            value?: T;
          };
        }>("Runtime.evaluate", {
          awaitPromise: true,
          expression,
          returnByValue: true,
        });

        if (evaluation.exceptionDetails) {
          const exceptionMessage =
            evaluation.exceptionDetails.exception?.description ??
            evaluation.exceptionDetails.text ??
            evaluation.result.description ??
            "Unknown Chrome CDP evaluation failure.";
          throw new Error(exceptionMessage);
        }

        return evaluation.result.value as T;
      },
    };
  } catch (error) {
    await close();
    throw new Error(
      [
        `Failed to initialize Chrome CDP session for "${session}".`,
        `stdout: ${stdoutPreview || "<empty>"}`,
        `stderr: ${stderrPreview || "<empty>"}`,
        `cause: ${error instanceof Error ? error.message : String(error)}`,
      ].join("\n"),
    );
  }
}

export function buildImageReferenceEvaluationExpression(
  tag: string,
  pageNum: number,
  pageSize: number,
) {
  return [
    "(async ({ pageNum, pageSize, tag }) => {",
    "  const mod = await import(\"https://web-assets.soutushenqi.com/jzxz/v2.14.51/assets/index.js\");",
    "  const client = mod._;",
    "  client.addCommonHeaders({",
    "    \"Product-Type\": \"JZXZ\",",
    "    lang: \"zh-CN\",",
    "  });",
    "  client.addCommonParams({",
    "    product_id: \"51\",",
    "    version_code: \"21451\",",
    "  });",
    "  return await client.getRequest(",
    "    \"https://api.jianzhuxuezhang.com/jzxz/api/image/reference\",",
    "    {",
    "      params: {",
    "        pageNum,",
    "        pageSize,",
    "        tag,",
    "      },",
    "    },",
    "  );",
    `})(${JSON.stringify({ pageNum, pageSize, tag })})`,
  ].join("\n");
}

async function ensureJzxzBrowserSession(session: string) {
  if (activeBrowserSession) {
    return activeBrowserSession;
  }

  console.info("[add-gallery-sync] opening JZXZ browser session", {
    session,
    url: JZXZ_HOME_URL,
  });

  activeBrowserSession = await createChromeCdpSession(session);
  return activeBrowserSession;
}

async function resetJzxzBrowserSession() {
  if (!activeBrowserSession) {
    return;
  }

  const session = activeBrowserSession;
  activeBrowserSession = null;
  await session.close();
}

async function queryImageReferenceViaBrowser(
  session: string,
  tag: string,
  pageNum: number,
  pageSize: number,
) {
  return withRetry(
    "browser image/reference query",
    async () => {
      const browserSession = await ensureJzxzBrowserSession(session);

      try {
        return await browserSession.evaluate<JzxzReferenceAsset[]>(
          buildImageReferenceEvaluationExpression(tag, pageNum, pageSize),
        );
      } catch (error) {
        console.error("[add-gallery-sync] browser image/reference query failed", {
          error: error instanceof Error ? error.message : String(error),
          pageNum,
          pageSize,
          session,
          tag,
        });
        await resetJzxzBrowserSession().catch((resetError) => {
          console.warn("[add-gallery-sync] failed to reset Chrome CDP session", {
            error:
              resetError instanceof Error
                ? resetError.message
                : String(resetError),
            session,
          });
        });
        throw error;
      }
    },
    2,
    1_000,
  );
}

async function fetchJsonOrThrow<T>(input: string | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(async () => {
    const text = await response.text();
    throw new Error(
      `Non-JSON response received (${response.status}): ${text.slice(0, 500)}`,
    );
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`,
    );
  }

  return payload as T;
}

async function fetchRemoteConfig() {
  const response = await fetchJsonOrThrow<{
    code: number;
    data?: Record<string, string>;
    error_msg?: string | null;
  }>(QUERY_CONFIGS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "product-type": "JZXZ",
      lang: "zh-CN",
      timestamp: String(Date.now()),
    },
    body: JSON.stringify({
      configKeys: [
        "jzxz_banana_upload_config",
        "jzxz_ai_draw_style_refer_image_tags_config",
      ],
      encrypt: false,
    }),
  });

  const rawValue = response.data?.jzxz_ai_draw_style_refer_image_tags_config;
  if (response.code !== 200 || typeof rawValue !== "string") {
    throw new Error(
      `Unexpected add gallery config response: ${JSON.stringify(response).slice(0, 600)}`,
    );
  }

  return parseAddGalleryConfigValue(rawValue);
}

function dedupeRemoteAssets(assets: JzxzReferenceAsset[]) {
  const index = new Map<string, JzxzReferenceAsset>();
  for (const asset of assets) {
    const key =
      typeof asset.id === "string" || typeof asset.id === "number"
        ? String(asset.id)
        : asset.largeUrl;
    if (!index.has(key)) {
      index.set(key, asset);
    }
  }

  return [...index.values()];
}

async function fetchAllSubtypeAssets(options: {
  maxAssetsPerSubtype: number | null;
  pageSize: number;
  session: string;
  sourceTag: string;
}) {
  const merged: JzxzReferenceAsset[] = [];

  for (let pageNum = 0; ; pageNum += 1) {
    console.info("[add-gallery-sync] querying image/reference page", {
      pageNum,
      pageSize: options.pageSize,
      sourceTag: options.sourceTag,
    });
    const page = await queryImageReferenceViaBrowser(
      options.session,
      options.sourceTag,
      pageNum,
      options.pageSize,
    );

    if (!Array.isArray(page) || page.length === 0) {
      break;
    }

    merged.push(...page);
    if (
      options.maxAssetsPerSubtype &&
      merged.length >= options.maxAssetsPerSubtype
    ) {
      return dedupeRemoteAssets(merged).slice(0, options.maxAssetsPerSubtype);
    }

    if (page.length < options.pageSize) {
      break;
    }
  }

  return dedupeRemoteAssets(merged);
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(
  operationName: string,
  run: () => Promise<T>,
  maxAttempts = REMOTE_DOWNLOAD_RETRY_ATTEMPTS,
  delayMs = REMOTE_DOWNLOAD_RETRY_DELAY_MS,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }

      console.warn("[add-gallery-sync] transient failure, retrying", {
        attempt,
        delayMs,
        error: error instanceof Error ? error.message : String(error),
        maxAttempts,
        operationName,
      });
      await sleep(delayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${operationName} failed`);
}

async function uploadRemoteAsset(options: {
  assetId: string;
  categoryId: string;
  client: SupabaseAdminClient;
  remoteAsset: JzxzReferenceAsset;
  subtypeId: string;
}) {
  const response = await withRetry("remote asset download", async () => {
    const remoteResponse = await fetch(options.remoteAsset.largeUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!remoteResponse.ok) {
      throw new Error(`HTTP ${remoteResponse.status}`);
    }

    return remoteResponse;
  });

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type");
  const storageObjectPath = buildAddGalleryStorageObjectPath({
    assetId: options.assetId,
    categoryId: options.categoryId,
    contentType,
    sourceAssetUrl: options.remoteAsset.largeUrl,
    subtypeId: options.subtypeId,
  });
  await withRetry("storage upload", async () => {
    const result = await options.client.storage
      .from(ADD_GALLERY_STORAGE_BUCKET)
      .upload(storageObjectPath, arrayBuffer, {
        contentType: contentType ?? undefined,
        upsert: true,
      });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result;
  });

  const publicUrl = options.client.storage
    .from(ADD_GALLERY_STORAGE_BUCKET)
    .getPublicUrl(storageObjectPath).data.publicUrl;

  return {
    assetUrl: publicUrl,
    byteSize: arrayBuffer.byteLength,
    mimeType: contentType,
    storageBucket: ADD_GALLERY_STORAGE_BUCKET,
    storageObjectPath,
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>,
) {
  const results: TOutput[] = new Array(items.length);
  let cursor = 0;

  const runWorker = async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () =>
      runWorker(),
    ),
  );

  return results;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchExistingAssets(
  client: SupabaseAdminClient,
  assetIds: string[],
) {
  const existing = new Map<string, ExistingAssetRow>();
  const uniqueIds = [...new Set(assetIds)];

  for (const batch of chunk(uniqueIds, 40)) {
    const result = await (client as any)
      .from("add_gallery_assets")
      .select(
        "id, asset_url, storage_bucket, storage_object_path, mime_type, byte_size",
      )
      .in("id", batch);

    if (result.error) {
      throw new Error(
        `Failed to query existing add gallery assets: ${result.error.message}`,
      );
    }

    for (const row of (result.data ?? []) as ExistingAssetRow[]) {
      existing.set(row.id, row);
    }
  }

  return existing;
}

async function upsertRowsInBatches<T extends Record<string, unknown>>(options: {
  batchSize: number;
  client: SupabaseAdminClient;
  onConflict?: string;
  rows: T[];
  table: "add_gallery_assets" | "add_gallery_categories" | "add_gallery_subtypes";
}) {
  for (const batch of chunk(options.rows, options.batchSize)) {
    const result = await (options.client as any)
      .from(options.table)
      .upsert(
        batch as never[],
        options.onConflict ? { onConflict: options.onConflict } : {},
      );

    if (result.error) {
      throw new Error(
        `Failed to upsert ${options.table}: ${result.error.message}`,
      );
    }
  }
}

async function fetchActiveIds(
  client: SupabaseAdminClient,
  table: "add_gallery_assets" | "add_gallery_categories" | "add_gallery_subtypes",
) {
  const result = await (client as any)
    .from(table)
    .select("id")
    .eq("is_active", true);

  if (result.error) {
    throw new Error(`Failed to query ${table} active ids: ${result.error.message}`);
  }

  return (result.data ?? []).map((row: { id: string }) => row.id);
}

async function deactivateRowsByIds(
  client: SupabaseAdminClient,
  table: "add_gallery_assets" | "add_gallery_categories" | "add_gallery_subtypes",
  ids: string[],
) {
  for (const batch of chunk(ids, 40)) {
    const result = await (client as any)
      .from(table)
      .update({ is_active: false })
      .in("id", batch);

    if (result.error) {
      throw new Error(`Failed to deactivate ${table}: ${result.error.message}`);
    }
  }
}

async function applyStaleRowCleanup(
  client: SupabaseAdminClient,
  progress: SyncRunProgress,
) {
  const [activeCategoryIds, activeSubtypeIds, activeAssetIds] = await Promise.all([
    fetchActiveIds(client, "add_gallery_categories"),
    fetchActiveIds(client, "add_gallery_subtypes"),
    fetchActiveIds(client, "add_gallery_assets"),
  ]);

  const staleCategoryIds = findAddGalleryStaleIds({
    activeIds: activeCategoryIds,
    currentIds: progress.categoryIds,
  });
  const staleSubtypeIds = findAddGalleryStaleIds({
    activeIds: activeSubtypeIds,
    currentIds: progress.subtypeIds,
  });
  const staleAssetIds = findAddGalleryStaleIds({
    activeIds: activeAssetIds,
    currentIds: progress.assetIds,
  });

  if (staleAssetIds.length > 0) {
    await deactivateRowsByIds(client, "add_gallery_assets", staleAssetIds);
  }
  if (staleSubtypeIds.length > 0) {
    await deactivateRowsByIds(client, "add_gallery_subtypes", staleSubtypeIds);
  }
  if (staleCategoryIds.length > 0) {
    await deactivateRowsByIds(client, "add_gallery_categories", staleCategoryIds);
  }

  console.info("[add-gallery-sync] stale row cleanup finished", {
    staleAssetCount: staleAssetIds.length,
    staleCategoryCount: staleCategoryIds.length,
    staleSubtypeCount: staleSubtypeIds.length,
  });
}

function shouldSkipCleanup(options: SyncCliOptions) {
  return (
    options.skipCleanup ||
    options.categoryLabels.length > 0 ||
    options.subtypeLabels.length > 0 ||
    options.maxAssetsPerSubtype != null
  );
}

async function syncSubtype(options: {
  category: AddGallerySyncCategory;
  categoryId: string;
  client: SupabaseAdminClient;
  downloadConcurrency: number;
  maxAssetsPerSubtype: number | null;
  pageSize: number;
  progress: SyncRunProgress;
  session: string;
  subtype: AddGallerySyncCategory["subtypes"][number];
  subtypeIndex: number;
}) {
  const subtypeId = createAddGallerySubtypeId({
    categoryLabel: options.category.label,
    subtypeLabel: options.subtype.label,
  });
  const subtypeRow: AddGallerySubtypeRow = {
    id: subtypeId,
    category_id: options.categoryId,
    label: options.subtype.label,
    sort_order: options.subtypeIndex,
    is_active: true,
    source_tag: options.subtype.sourceTag,
    source_type: options.subtype.sourceType,
    source_meta: options.subtype.sourceMeta,
  };

  await upsertRowsInBatches({
    batchSize: 100,
    client: options.client,
    onConflict: "id",
    rows: [subtypeRow],
    table: "add_gallery_subtypes",
  });
  options.progress.subtypeIds.push(subtypeId);

  console.info("[add-gallery-sync] syncing subtype", {
    categoryLabel: options.category.label,
    sourceTag: options.subtype.sourceTag,
    subtypeLabel: options.subtype.label,
  });

  const remoteAssets = await fetchAllSubtypeAssets({
    maxAssetsPerSubtype: options.maxAssetsPerSubtype,
    pageSize: options.pageSize,
    session: options.session,
    sourceTag: options.subtype.sourceTag,
  });

  console.info("[add-gallery-sync] fetched subtype assets", {
    assetCount: remoteAssets.length,
    categoryLabel: options.category.label,
    subtypeLabel: options.subtype.label,
  });

  if (remoteAssets.length === 0) {
    return;
  }

  const remoteAssetIds = remoteAssets.map((asset) =>
    createAddGalleryAssetId({
      categoryId: options.categoryId,
      sourceAssetId: asset.id,
      sourceAssetUrl: asset.largeUrl,
      subtypeId,
    }),
  );
  const existingAssets = await fetchExistingAssets(options.client, remoteAssetIds);
  const preparedRows = await mapWithConcurrency(
    remoteAssets,
    options.downloadConcurrency,
    async (remoteAsset, assetIndex) => {
      const assetId = remoteAssetIds[assetIndex];
      const existingAsset = existingAssets.get(assetId) ?? null;
      let uploadResult:
        | {
            assetUrl: string;
            byteSize: number | null;
            mimeType: string | null;
            storageBucket: string;
            storageObjectPath: string | null;
          }
        | null = null;

      if (existingAsset?.storage_object_path) {
        const fallbackPublicUrl = options.client.storage
          .from(ADD_GALLERY_STORAGE_BUCKET)
          .getPublicUrl(existingAsset.storage_object_path).data.publicUrl;
        uploadResult = reusePersistedAddGalleryAsset(
          existingAsset,
          fallbackPublicUrl,
        );
      } else {
        uploadResult = await uploadRemoteAsset({
          assetId,
          categoryId: options.categoryId,
          client: options.client,
          remoteAsset,
          subtypeId,
        });
      }

      options.progress.assetIds.push(assetId);

      const title = `${options.category.label} ${options.subtype.label} ${assetIndex + 1}`;
      return {
        id: assetId,
        category_id: options.categoryId,
        subtype_id: subtypeId,
        title,
        asset_url: uploadResult.assetUrl,
        width: remoteAsset.width,
        height: remoteAsset.height,
        sort_order: assetIndex,
        is_active: true,
        source_asset_id:
          remoteAsset.id != null ? String(remoteAsset.id) : null,
        source_asset_url: remoteAsset.largeUrl,
        source_thumb_url: remoteAsset.thumbUrl ?? null,
        source_tag: options.subtype.sourceTag,
        source_type: options.subtype.sourceType,
        source_meta: {
          categoryLabel: options.category.label,
          remoteIndex: assetIndex,
          subtypeLabel: options.subtype.label,
        },
        storage_bucket: uploadResult.storageBucket,
        storage_object_path: uploadResult.storageObjectPath,
        mime_type: uploadResult.mimeType,
        byte_size: uploadResult.byteSize,
      } satisfies AddGalleryAssetRow;
    },
  );

  await upsertRowsInBatches({
    batchSize: 200,
    client: options.client,
    onConflict: "id",
    rows: preparedRows,
    table: "add_gallery_assets",
  });
}

async function syncCategory(options: {
  category: AddGallerySyncCategory;
  categoryIndex: number;
  client: SupabaseAdminClient;
  downloadConcurrency: number;
  maxAssetsPerSubtype: number | null;
  pageSize: number;
  progress: SyncRunProgress;
  session: string;
}) {
  const categoryId = createAddGalleryCategoryId(options.category.label);
  const categoryRow: AddGalleryCategoryRow = {
    id: categoryId,
    label: options.category.label,
    sort_order: options.categoryIndex,
    is_active: true,
    source_meta: options.category.sourceMeta,
  };

  await upsertRowsInBatches({
    batchSize: 100,
    client: options.client,
    onConflict: "id",
    rows: [categoryRow],
    table: "add_gallery_categories",
  });
  options.progress.categoryIds.push(categoryId);

  console.info("[add-gallery-sync] syncing category", {
    categoryLabel: options.category.label,
    subtypeCount: options.category.subtypes.length,
  });

  for (const [subtypeIndex, subtype] of options.category.subtypes.entries()) {
    await syncSubtype({
      category: options.category,
      categoryId,
      client: options.client,
      downloadConcurrency: options.downloadConcurrency,
      maxAssetsPerSubtype: options.maxAssetsPerSubtype,
      pageSize: options.pageSize,
      progress: options.progress,
      session: options.session,
      subtype,
      subtypeIndex,
    });
  }
}

async function main() {
  try {
    const options = parseCliArgs(process.argv);
    const client = createAdminClient();
    const configCategories = await fetchRemoteConfig();
    const categories = filterAddGalleryCategoriesForSync(configCategories, {
      categoryLabels: options.categoryLabels,
      subtypeLabels: options.subtypeLabels,
    });

    if (categories.length === 0) {
      throw new Error("No add gallery categories matched the requested filters.");
    }

    console.info("[add-gallery-sync] fetched remote add gallery configuration", {
      categoryCount: categories.length,
      downloadConcurrency: options.downloadConcurrency,
      filteredCategoryLabels:
        options.categoryLabels.length > 0 ? options.categoryLabels : null,
      filteredSubtypeLabels:
        options.subtypeLabels.length > 0 ? options.subtypeLabels : null,
      maxAssetsPerSubtype: options.maxAssetsPerSubtype,
      pageSize: options.pageSize,
      skipCleanup: shouldSkipCleanup(options),
    });

    await ensureJzxzBrowserSession(options.session);

    const progress: SyncRunProgress = {
      assetIds: [],
      categoryIds: [],
      subtypeIds: [],
    };

    for (const [categoryIndex, category] of categories.entries()) {
      await syncCategory({
        category,
        categoryIndex,
        client,
        downloadConcurrency: options.downloadConcurrency,
        maxAssetsPerSubtype: options.maxAssetsPerSubtype,
        pageSize: options.pageSize,
        progress,
        session: options.session,
      });
    }

    if (shouldSkipCleanup(options)) {
      console.warn("[add-gallery-sync] stale-row cleanup skipped because the run is scoped", {
        categoryFilterCount: options.categoryLabels.length,
        maxAssetsPerSubtype: options.maxAssetsPerSubtype,
        skipCleanupFlag: options.skipCleanup,
        subtypeFilterCount: options.subtypeLabels.length,
      });
    } else {
      await applyStaleRowCleanup(client, progress);
    }

    console.info("[add-gallery-sync] completed", {
      activeAssetCount: progress.assetIds.length,
      activeCategoryCount: progress.categoryIds.length,
      activeSubtypeCount: progress.subtypeIds.length,
    });
  } finally {
    await resetJzxzBrowserSession().catch((error) => {
      console.warn("[add-gallery-sync] failed to close Chrome CDP session", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

const entrypointPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entrypointPath === import.meta.url) {
  void main().catch((error) => {
    console.error("[add-gallery-sync] failed", error);
    process.exitCode = 1;
  });
}
