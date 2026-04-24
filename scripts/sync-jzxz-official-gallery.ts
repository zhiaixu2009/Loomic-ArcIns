import path from "node:path";
import { spawn } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../packages/shared/src/supabase/database.ts";
import {
  buildOfficialGalleryRemoteDownloadUrlCandidates,
  classifyOfficialGalleryBrowserSearchResult,
  collectSuccessfulOfficialGalleryResults,
  OFFICIAL_GALLERY_STORAGE_BUCKET,
  buildJzxzConfigRequest,
  buildOfficialGalleryStorageObjectPath,
  createOfficialGalleryAssetId,
  createOfficialGalleryCategoryId,
  createOfficialGallerySubtypeId,
  dedupeOfficialGalleryRemoteAssets,
  findOfficialGalleryStaleIds,
  filterOfficialGalleryCategoriesForSync,
  getRetryableOfficialGalleryRemoteErrorMessage,
  limitOfficialGalleryRemoteAssets,
  parseOfficialGalleryConfigValue,
  reusePersistedOfficialGalleryAsset,
  runOfficialGalleryRetryableOperation,
  type OfficialGalleryRemoteCategory,
} from "../apps/server/src/features/official-gallery/official-gallery-sync.ts";

type SyncCliOptions = {
  categoryLabels: string[];
  downloadConcurrency: number;
  jzxzPageSize: number;
  limitCategories: number | null;
  limitSubtypes: number | null;
  maxAssetsPerSubtype: number | null;
  session: string;
  skipCleanup: boolean;
  stsqDelayMs: number;
  subtypeLabels: string[];
};

type OfficialGalleryCategoryRow =
  Database["public"]["Tables"]["official_gallery_categories"]["Insert"];
type OfficialGallerySubtypeRow =
  Database["public"]["Tables"]["official_gallery_subtypes"]["Insert"];
type OfficialGalleryAssetRow =
  Database["public"]["Tables"]["official_gallery_assets"]["Insert"];
type OfficialGalleryExistingAssetRow = Pick<
  Database["public"]["Tables"]["official_gallery_assets"]["Row"],
  "asset_url" | "byte_size" | "id" | "mime_type" | "storage_bucket" | "storage_object_path"
>;

type JzxzRemoteAsset = {
  createTime?: number | null;
  description?: string | null;
  heat?: number | null;
  height: number;
  id: number | string;
  imageType?: number | null;
  largeUrl: string;
  resolutionType?: number | null;
  sceneType?: number | null;
  sizeType?: number | null;
  tagList?: string | null;
  thumbUrl?: string | null;
  updateTime?: number | null;
  width: number;
};

type StsqRemoteAsset = {
  collectCount?: number | null;
  commentCount?: number | null;
  copyrightInfo?: string | null;
  createAuthor?: string | null;
  createTime?: number | null;
  detailInfo?: string | null;
  heat?: number | null;
  height: number;
  id: number | string;
  isLargeScale?: number | null;
  largeUrl: string;
  likeCount?: number | null;
  operation?: boolean | null;
  reportCount?: number | null;
  resolutionType?: number | null;
  sceneType?: number | null;
  size?: number | null;
  sizeType?: number | null;
  source?: string | null;
  tagList?: string | null;
  tags?: string | null;
  thumbUrl?: string | null;
  title?: string | null;
  type?: number | null;
  updateTime?: number | null;
  uploadAuthor?: string | null;
  width: number;
};

type SyncRunProgress = {
  assetCount: number;
  categoryCount: number;
  currentAssetIds: string[];
  currentCategoryIds: string[];
  currentSubtypeIds: string[];
  subtypeCount: number;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

const JZXZ_HOME_URL = "https://www.jianzhuxuezhang.com/canvas/home";
const PLAYWRIGHT_WRAPPER_PATH =
  "/mnt/c/Users/admin/.codex/skills/playwright/scripts/playwright_cli.sh";
const JZXZ_QUERY_RUN_TIMEOUT_MS = 120_000;
const OFFICIAL_BROWSER_PAGE_LIMIT = 200;
const STSQ_HYBRID_PAGE_SIZE = 20;
const REMOTE_ASSET_DOWNLOAD_RETRY_ATTEMPTS = 3;
const REMOTE_ASSET_DOWNLOAD_RETRY_DELAY_MS = 500;

function parseCliArgs(argv: string[]): SyncCliOptions {
  const options: SyncCliOptions = {
    categoryLabels: [],
    downloadConcurrency: 4,
    jzxzPageSize: 100,
    limitCategories: null,
    limitSubtypes: null,
    maxAssetsPerSubtype: null,
    session: "official-gallery-sync",
    skipCleanup: false,
    stsqDelayMs: 850,
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

    if (token === "--skip-cleanup") {
      options.skipCleanup = true;
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

    if (token === "--limit-categories") {
      const value = consumeNumber();
      options.limitCategories = value && value > 0 ? value : null;
      continue;
    }

    if (token === "--limit-subtypes") {
      const value = consumeNumber();
      options.limitSubtypes = value && value > 0 ? value : null;
      continue;
    }

    if (token === "--jzxz-page-size") {
      const value = consumeNumber();
      if (value && value > 0) {
        options.jzxzPageSize = value;
      }
      continue;
    }

    if (token === "--stsq-delay-ms") {
      const value = consumeNumber();
      if (value && value >= 0) {
        options.stsqDelayMs = value;
      }
      continue;
    }

    if (token === "--download-concurrency") {
      const value = consumeNumber();
      if (value && value > 0) {
        options.downloadConcurrency = value;
      }
      continue;
    }

    if (token === "--max-assets-per-subtype") {
      const value = consumeNumber();
      options.maxAssetsPerSubtype = value && value > 0 ? value : null;
      continue;
    }

    if (token === "--subtype-label") {
      const value = argv[index + 1]?.trim();
      if (value) {
        options.subtypeLabels.push(value);
      }
      index += 1;
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

function toWslPath(inputPath: string) {
  const normalized = path.resolve(inputPath).replace(/\\/g, "/");
  const match = normalized.match(/^([A-Za-z]):\/(.*)$/);

  if (!match) {
    return normalized;
  }

  const [, drive, tail] = match;
  return `/mnt/${drive.toLowerCase()}/${tail}`;
}

function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    stream?: boolean;
    timeoutMs?: number;
  } = {},
) {
  return new Promise<{
    code: number;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timeoutHandle: NodeJS.Timeout | undefined;

    if (options.timeoutMs) {
      timeoutHandle = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`Command timed out after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.stream) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (options.stream) {
        process.stderr.write(text);
      }
    });

    child.on("error", (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (code === 0) {
        resolve({ code: 0, stderr, stdout });
        return;
      }

      const error = new Error(`Command failed with exit code ${code}`);
      Object.assign(error, { code, stderr, stdout });
      reject(error);
    });
  });
}

async function runPlaywrightCli(
  session: string,
  args: string[],
  options: {
    stream?: boolean;
    timeoutMs?: number;
  } = {},
) {
  return runCommand(
    "wsl",
    [
      "--cd",
      toWslPath(process.cwd()),
      "bash",
      PLAYWRIGHT_WRAPPER_PATH,
      `-s=${session}`,
      ...args,
    ],
    {
      cwd: process.cwd(),
      stream: options.stream,
      timeoutMs: options.timeoutMs,
    },
  );
}

function parsePlaywrightResult(stdout: string) {
  const match = stdout.match(/### Result\r?\n([\s\S]*?)\r?\n### Ran Playwright code/);
  if (!match?.[1]) {
    const errorMatch = stdout.match(/### Error\r?\n([\s\S]*)$/);
    if (errorMatch?.[1]) {
      throw new Error(
        `Playwright run-code failed: ${errorMatch[1].trim().slice(0, 1200)}`,
      );
    }

    throw new Error(
      `Failed to parse Playwright result payload. Output preview: ${stdout.slice(0, 1200)}`,
    );
  }

  return JSON.parse(match[1]);
}

function buildJzxzQueryRunCode(tag: string, page: number, pageSize: number) {
  return [
    "async (page) => {",
    "  return page.evaluate(async ({ pageIndex, pageSize, tag }) => {",
    "    const mod = await import(\"https://web-assets.soutushenqi.com/jzxz/v2.14.51/assets/index.js\");",
    "    const client = mod._;",
    "    client.addCommonHeaders({",
    "      \"Product-Type\": \"JZXZ\",",
    "      lang: \"zh-CN\",",
    "    });",
    "    return client.postRequestForm(",
    "      \"https://api.jianzhuxuezhang.com/jzxz/api/image/queryByTag\",",
    "      {",
    "        page: pageIndex,",
    "        page_size: pageSize,",
    "        tags: tag,",
    "      },",
    "    );",
    `  }, { pageIndex: ${page}, pageSize: ${pageSize}, tag: ${JSON.stringify(tag)} });`,
    "}",
  ].join("\n");
}

function buildOfficialBrowserSearchRunCode(options: {
  page: number;
  pageSize?: number;
  requestType: 504 | 505;
  searchWord: string;
}) {
  const requestParams =
    options.requestType === 504
      ? {
          page: options.page,
          searchWord: options.searchWord,
        }
      : {
          page: options.page,
          pageSize: options.pageSize ?? STSQ_HYBRID_PAGE_SIZE,
          searchWord: options.searchWord,
          sizeType: "NO_LIMIT",
        };

  return [
    "async (page) => {",
    "  return page.evaluate(async (payload) => {",
    "    const mod = await import(\"https://web-assets.soutushenqi.com/jzxz/v2.14.51/assets/utils2.js\");",
    "    const runRequest = mod.b;",
    "    return runRequest(payload);",
    `  }, ${JSON.stringify({
      requestParams,
      requestType: options.requestType,
    })});`,
    "}",
  ].join("\n");
}

function buildOfficialBrowserHybridSearchRunCode(options: {
  maxAssets?: number | null;
  pageLimit: number;
  pageSize: number;
  searchWord: string;
}) {
  return [
    "async (page) => {",
    "  return page.evaluate(async ({ maxAssets, pageLimit, pageSize, searchWord }) => {",
    "    const mod = await import(\"https://web-assets.soutushenqi.com/jzxz/v2.14.51/assets/utils2.js\");",
    "    const runRequest = mod.b;",
    "    const merged = [];",
    "    for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {",
    "      const result = await runRequest({",
    "        requestType: 505,",
    "        requestParams: {",
    "          searchWord,",
    "          page: pageIndex,",
    "          pageSize,",
    "          sizeType: \"NO_LIMIT\",",
    "        },",
    "      });",
    "      if (!Array.isArray(result?.list) || result.list.length === 0) {",
    "        return {",
    "          list: maxAssets && maxAssets > 0 ? merged.slice(0, maxAssets) : merged,",
    "          stopPage: pageIndex,",
    "          truncated: false,",
    "          type: result?.type ?? \"noMore\",",
    "        };",
    "      }",
    "      merged.push(...result.list);",
    "      if (maxAssets && maxAssets > 0 && merged.length >= maxAssets) {",
    "        return {",
    "          list: merged.slice(0, maxAssets),",
    "          stopPage: pageIndex + 1,",
    "          truncated: false,",
    "          type: \"done\",",
    "        };",
    "      }",
    "    }",
    "    return {",
    "      list: maxAssets && maxAssets > 0 ? merged.slice(0, maxAssets) : merged,",
    "      stopPage: pageLimit,",
    "      truncated: true,",
    "      type: \"done\",",
    "    };",
    `  }, ${JSON.stringify(options)});`,
    "}",
  ].join("\n");
}

async function ensureJzxzBrowserSession(session: string) {
  console.info("[official-gallery-sync] opening JZXZ browser session", {
    session,
    url: JZXZ_HOME_URL,
  });

  await runPlaywrightCli(session, ["open", JZXZ_HOME_URL], {
    stream: true,
    timeoutMs: JZXZ_QUERY_RUN_TIMEOUT_MS,
  });
}

async function queryJzxzImagesViaBrowser(
  session: string,
  tag: string,
  page: number,
  pageSize: number,
) {
  const { stdout } = await runPlaywrightCli(
    session,
    ["run-code", buildJzxzQueryRunCode(tag, page, pageSize)],
    {
      timeoutMs: JZXZ_QUERY_RUN_TIMEOUT_MS,
    },
  );

  return parsePlaywrightResult(stdout) as JzxzRemoteAsset[];
}

async function queryOfficialGalleryBrowserSearchViaBrowser(options: {
  page: number;
  pageSize?: number;
  requestType: 504 | 505;
  searchWord: string;
  session: string;
}) {
  const { stdout } = await runPlaywrightCli(
    options.session,
    [
      "run-code",
      buildOfficialBrowserSearchRunCode({
        page: options.page,
        pageSize: options.pageSize,
        requestType: options.requestType,
        searchWord: options.searchWord,
      }),
    ],
    {
      timeoutMs: JZXZ_QUERY_RUN_TIMEOUT_MS,
    },
  );

  return parsePlaywrightResult(stdout);
}

async function queryOfficialGalleryHybridSearchViaBrowser(options: {
  maxAssets?: number | null;
  pageLimit: number;
  pageSize: number;
  searchWord: string;
  session: string;
}) {
  const { stdout } = await runPlaywrightCli(
    options.session,
    [
      "run-code",
      buildOfficialBrowserHybridSearchRunCode({
        maxAssets: options.maxAssets,
        pageLimit: options.pageLimit,
        pageSize: options.pageSize,
        searchWord: options.searchWord,
      }),
    ],
    {
      timeoutMs: JZXZ_QUERY_RUN_TIMEOUT_MS,
    },
  );

  return parsePlaywrightResult(stdout);
}

async function fetchJsonOrThrow<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(async () => {
    const text = await response.text();
    throw new Error(`Non-JSON response received (${response.status}): ${text.slice(0, 500)}`);
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`,
    );
  }

  return payload as T;
}

async function fetchRemoteConfig() {
  const request = buildJzxzConfigRequest({
    configKey: "jzxz_draw_chartlet_category_config",
    nowMs: Date.now(),
  });

  const response = await fetchJsonOrThrow<{
    code: number;
    data: string;
    error_msg: string | null;
  }>(request.url, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });

  if (response.code !== 200 || typeof response.data !== "string") {
    throw new Error(
      `Unexpected config response: ${JSON.stringify(response).slice(0, 600)}`,
    );
  }

  return parseOfficialGalleryConfigValue(response.data);
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchAllOfficialBrowserAssetsByRequest(options: {
  delayMs: number;
  maxAssetsPerSubtype: number | null;
  pageSize?: number;
  requestLabel: string;
  requestType: 504 | 505;
  searchWord: string;
  session: string;
}) {
  if (options.requestType === 505) {
    const payload = await queryOfficialGalleryHybridSearchViaBrowser({
      maxAssets: options.maxAssetsPerSubtype,
      pageLimit: OFFICIAL_BROWSER_PAGE_LIMIT,
      pageSize: options.pageSize ?? STSQ_HYBRID_PAGE_SIZE,
      searchWord: options.searchWord,
      session: options.session,
    });
    if (
      payload &&
      typeof payload === "object" &&
      "truncated" in payload &&
      payload.truncated === true
    ) {
      console.warn("[official-gallery-sync] browser hybrid search hit page limit", {
        pageLimit: OFFICIAL_BROWSER_PAGE_LIMIT,
        requestLabel: options.requestLabel,
        searchWord: options.searchWord,
      });
    }
    const classified = classifyOfficialGalleryBrowserSearchResult<StsqRemoteAsset>(payload);

    if (classified.kind === "error") {
      throw new Error(`${options.requestLabel} browser search failed: ${classified.error}`);
    }

    if (classified.kind === "limit") {
      return {
        items: [],
        kind: "limit" as const,
      };
    }

    return {
      items: limitOfficialGalleryRemoteAssets(
        dedupeOfficialGalleryRemoteAssets(classified.items),
        options.maxAssetsPerSubtype,
      ),
      kind: classified.kind,
    };
  }

  let assets: StsqRemoteAsset[] = [];

  for (let page = 0; page < OFFICIAL_BROWSER_PAGE_LIMIT; page += 1) {
    const payload = await queryOfficialGalleryBrowserSearchViaBrowser({
      page,
      pageSize: options.pageSize,
      requestType: options.requestType,
      searchWord: options.searchWord,
      session: options.session,
    });
    const classified = classifyOfficialGalleryBrowserSearchResult<StsqRemoteAsset>(payload);

    if (classified.kind === "error") {
      throw new Error(
        `${options.requestLabel} browser search failed on page ${page}: ${classified.error}`,
      );
    }

    if (classified.kind === "limit") {
      return {
        items: dedupeOfficialGalleryRemoteAssets(assets),
        kind: "limit" as const,
      };
    }

    if (classified.kind === "no_more") {
      break;
    }

    const previousCount = assets.length;
    assets = dedupeOfficialGalleryRemoteAssets([...assets, ...classified.items]);
    const addedCount = assets.length - previousCount;

    if (
      options.maxAssetsPerSubtype &&
      options.maxAssetsPerSubtype > 0 &&
      assets.length >= options.maxAssetsPerSubtype
    ) {
      assets = limitOfficialGalleryRemoteAssets(
        assets,
        options.maxAssetsPerSubtype,
      );
      break;
    }

    if (options.pageSize && classified.items.length < options.pageSize) {
      break;
    }

    if (addedCount === 0) {
      console.warn("[official-gallery-sync] browser search page produced no new assets", {
        page,
        requestLabel: options.requestLabel,
        requestType: options.requestType,
        searchWord: options.searchWord,
      });
      break;
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  return {
    items: limitOfficialGalleryRemoteAssets(
      dedupeOfficialGalleryRemoteAssets(assets),
      options.maxAssetsPerSubtype,
    ),
    kind: assets.length > 0 ? ("done" as const) : ("no_more" as const),
  };
}

async function fetchAllStsqAssetsForSubtype(options: {
  delayMs: number;
  maxAssetsPerSubtype: number | null;
  searchWord: string;
  session: string;
}) {
  const textSearchResult = await fetchAllOfficialBrowserAssetsByRequest({
    delayMs: options.delayMs,
    maxAssetsPerSubtype: options.maxAssetsPerSubtype,
    requestLabel: "STSQ requestType 504",
    requestType: 504,
    searchWord: options.searchWord,
    session: options.session,
  });

  if (textSearchResult.kind === "done" || textSearchResult.kind === "no_more") {
    return textSearchResult.items;
  }

  console.warn("[official-gallery-sync] STSQ text search hit official limit, falling back to hybrid search", {
    searchWord: options.searchWord,
  });

  const hybridSearchResult = await fetchAllOfficialBrowserAssetsByRequest({
    delayMs: options.delayMs,
    maxAssetsPerSubtype: options.maxAssetsPerSubtype,
    pageSize: STSQ_HYBRID_PAGE_SIZE,
    requestLabel: "STSQ requestType 505",
    requestType: 505,
    searchWord: options.searchWord,
    session: options.session,
  });

  if (hybridSearchResult.kind === "limit") {
    throw new Error(
      `STSQ hybrid search is also rate limited for "${options.searchWord}".`,
    );
  }

  return hybridSearchResult.items;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function uploadRemoteAsset(options: {
  assetId: string;
  categoryId: string;
  client: SupabaseAdminClient;
  downloadUrl: string;
  sourceLabel: string;
  subtypeId: string;
}) {
  const candidateUrls = buildOfficialGalleryRemoteDownloadUrlCandidates(options.downloadUrl);
  let resolvedDownloadUrl = options.downloadUrl;
  let response: Response | null = null;
  let lastError: unknown = null;

  for (const candidateUrl of candidateUrls) {
    try {
      response = await runOfficialGalleryRetryableOperation({
        baseDelayMs: REMOTE_ASSET_DOWNLOAD_RETRY_DELAY_MS,
        getRetryMessage: getRetryableOfficialGalleryRemoteErrorMessage,
        maxAttempts: REMOTE_ASSET_DOWNLOAD_RETRY_ATTEMPTS,
        onRetry: ({ attempt, maxAttempts, message, operationName }) => {
          console.warn("[official-gallery-sync] transient remote asset download failure, retrying", {
            assetId: options.assetId,
            attempt,
            candidateUrl,
            maxAttempts,
            message,
            operationName,
            sourceLabel: options.sourceLabel,
            sourceUrl: options.downloadUrl,
          });
        },
        operationName: "remote asset download",
        run: async () => {
          const remoteResponse = await fetch(candidateUrl, {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
              accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
          });

          if (!remoteResponse.ok) {
            throw new Error(`HTTP ${remoteResponse.status}`);
          }

          return remoteResponse;
        },
      });
      resolvedDownloadUrl = candidateUrl;
      break;
    } catch (error) {
      lastError = error;

      if (candidateUrl !== options.downloadUrl) {
        console.warn("[official-gallery-sync] remote asset fallback candidate failed", {
          assetId: options.assetId,
          candidateUrl,
          error: error instanceof Error ? error.message : String(error),
          sourceLabel: options.sourceLabel,
          sourceUrl: options.downloadUrl,
        });
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to download remote asset ${options.assetId}.`);
  }

  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const byteSize = arrayBuffer.byteLength;
  const storageObjectPath = buildOfficialGalleryStorageObjectPath({
    assetId: options.assetId,
    categoryId: options.categoryId,
    contentType,
    sourceAssetUrl: resolvedDownloadUrl,
    subtypeId: options.subtypeId,
  });

  const uploadResult = await options.client.storage
    .from(OFFICIAL_GALLERY_STORAGE_BUCKET)
    .upload(storageObjectPath, arrayBuffer, {
      contentType: contentType ?? undefined,
      upsert: true,
    });

  if (uploadResult.error) {
    throw new Error(
      `Failed to upload asset ${options.assetId} (${options.sourceLabel}): ${uploadResult.error.message}`,
    );
  }

  const publicUrl = options.client.storage
    .from(OFFICIAL_GALLERY_STORAGE_BUCKET)
    .getPublicUrl(storageObjectPath).data.publicUrl;

  return {
    assetUrl: publicUrl,
    byteSize,
    contentType,
    downloadedFromUrl: resolvedDownloadUrl,
    storageObjectPath,
  };
}

function buildAssetTitle(options: {
  fallbackLabel: string;
  index: number;
  remoteAsset: JzxzRemoteAsset | StsqRemoteAsset;
}) {
  const candidate =
    "description" in options.remoteAsset
      ? options.remoteAsset.description
      : options.remoteAsset.title ?? options.remoteAsset.detailInfo;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return `${options.fallbackLabel} ${options.index + 1}`;
}

async function fetchExistingAssetsByIds(options: {
  assetIds: string[];
  client: SupabaseAdminClient;
}) {
  const existingAssetsById = new Map<string, OfficialGalleryExistingAssetRow>();

  for (const batch of chunk(options.assetIds, 200)) {
    if (batch.length === 0) {
      continue;
    }

    const result = await options.client
      .from("official_gallery_assets")
      .select(
        "id, asset_url, storage_bucket, storage_object_path, mime_type, byte_size",
      )
      .in("id", batch as never[]);

    if (result.error) {
      throw new Error(
        `Failed to query existing official gallery assets: ${result.error.message}`,
      );
    }

    for (const row of result.data ?? []) {
      existingAssetsById.set(row.id, row);
    }
  }

  return existingAssetsById;
}

async function prepareSyncPayload(options: {
  browserSession: string;
  categoryLabels: string[];
  categories: OfficialGalleryRemoteCategory[];
  client: SupabaseAdminClient;
  downloadConcurrency: number;
  jzxzPageSize: number;
  limitCategories: number | null;
  limitSubtypes: number | null;
  maxAssetsPerSubtype: number | null;
  stsqDelayMs: number;
  subtypeLabels: string[];
}) {
  const syncProgress: SyncRunProgress = {
    assetCount: 0,
    categoryCount: 0,
    currentAssetIds: [],
    currentCategoryIds: [],
    currentSubtypeIds: [],
    subtypeCount: 0,
  };

  const filteredCategories = filterOfficialGalleryCategoriesForSync({
    categories: options.categories,
    categoryLabels: options.categoryLabels,
    subtypeLabels: options.subtypeLabels,
  });
  const targetCategories = options.limitCategories
    ? filteredCategories.slice(0, options.limitCategories)
    : filteredCategories;

  for (const [categoryIndex, category] of targetCategories.entries()) {
    const categoryId = createOfficialGalleryCategoryId(category.name);
    const targetSubtypes = options.limitSubtypes
      ? category.children.slice(0, options.limitSubtypes)
      : category.children;

    const categoryRow = {
      id: categoryId,
      label: category.name,
      sort_order: categoryIndex,
      is_active: true,
      source_meta: {
        source: "jianzhuxuezhang",
        subtypeCount: targetSubtypes.length,
      },
    } satisfies OfficialGalleryCategoryRow;
    syncProgress.categoryCount += 1;
    syncProgress.currentCategoryIds.push(categoryId);

    await upsertRowsInBatches({
      batchSize: 100,
      client: options.client,
      onConflict: "id",
      rows: [categoryRow],
      table: "official_gallery_categories",
    });

    console.info("[official-gallery-sync] syncing category", {
      category: category.name,
      categoryIndex: categoryIndex + 1,
      subtypeCount: targetSubtypes.length,
    });

    for (const [subtypeIndex, subtype] of targetSubtypes.entries()) {
      const subtypeId = createOfficialGallerySubtypeId({
        categoryLabel: category.name,
        subtypeLabel: subtype.name,
      });

      const subtypeRow = {
        id: subtypeId,
        category_id: categoryId,
        label: subtype.name,
        sort_order: subtypeIndex,
        is_active: true,
        source_tag: subtype.tag,
        source_type: subtype.sourceType,
        source_meta: {
          source: "jianzhuxuezhang",
          tag: subtype.tag,
        },
      } satisfies OfficialGallerySubtypeRow;
      syncProgress.subtypeCount += 1;
      syncProgress.currentSubtypeIds.push(subtypeId);

      await upsertRowsInBatches({
        batchSize: 100,
        client: options.client,
        onConflict: "id",
        rows: [subtypeRow],
        table: "official_gallery_subtypes",
      });

      console.info("[official-gallery-sync] fetching subtype assets", {
        category: category.name,
        sourceType: subtype.sourceType,
        subtype: subtype.name,
        tag: subtype.tag,
      });

      const remoteAssets =
        subtype.sourceType === "JZXZ"
          ? await fetchAllJzxzAssetsForSubtype({
              maxAssetsPerSubtype: options.maxAssetsPerSubtype,
              pageSize: options.jzxzPageSize,
              session: options.browserSession,
              tag: subtype.tag,
            })
          : await fetchAllStsqAssetsForSubtype({
              delayMs: options.stsqDelayMs,
              maxAssetsPerSubtype: options.maxAssetsPerSubtype,
              searchWord: subtype.tag,
              session: options.browserSession,
            });

      const remoteAssetsWithIdentity = limitOfficialGalleryRemoteAssets(
        remoteAssets,
        options.maxAssetsPerSubtype,
      ).map((remoteAsset, assetIndex) => {
        const sourceAssetUrl = remoteAsset.largeUrl;
        const sourceAssetId = String(remoteAsset.id);
        const assetId = createOfficialGalleryAssetId({
          categoryId,
          sourceAssetId,
          sourceAssetUrl,
          sourceType: subtype.sourceType,
          subtypeId,
        });

        return {
          assetId,
          assetIndex,
          remoteAsset,
          sourceAssetId,
          sourceAssetUrl,
        };
      });

      console.info("[official-gallery-sync] fetched subtype assets", {
        category: category.name,
        count: remoteAssetsWithIdentity.length,
        sourceType: subtype.sourceType,
        subtype: subtype.name,
      });

      const existingAssetsById = await fetchExistingAssetsByIds({
        assetIds: remoteAssetsWithIdentity.map((asset) => asset.assetId),
        client: options.client,
      });
      let downloadedCount = 0;
      let reusedCount = 0;

      const preparedAssets = await collectSuccessfulOfficialGalleryResults({
        concurrency: options.downloadConcurrency,
        items: remoteAssetsWithIdentity,
        mapItem: async (candidate) => {
          const { assetId, assetIndex, remoteAsset, sourceAssetId, sourceAssetUrl } =
            candidate;
          const title = buildAssetTitle({
            fallbackLabel: subtype.name,
            index: assetIndex,
            remoteAsset,
          });

          const sourceMeta =
            subtype.sourceType === "JZXZ"
              ? {
                  createTime: remoteAsset.createTime ?? null,
                  downloadedFromUrl: sourceAssetUrl,
                  heat: remoteAsset.heat ?? null,
                  imageType: remoteAsset.imageType ?? null,
                  resolutionType: remoteAsset.resolutionType ?? null,
                  sceneType: remoteAsset.sceneType ?? null,
                  sizeType: remoteAsset.sizeType ?? null,
                  tagList: remoteAsset.tagList ?? null,
                  updateTime: remoteAsset.updateTime ?? null,
                }
              : {
                  collectCount: remoteAsset.collectCount ?? null,
                  createTime: remoteAsset.createTime ?? null,
                  downloadedFromUrl: sourceAssetUrl,
                  detailInfo: remoteAsset.detailInfo ?? null,
                  heat: remoteAsset.heat ?? null,
                  isLargeScale: remoteAsset.isLargeScale ?? null,
                  tagList: remoteAsset.tagList ?? null,
                  title: remoteAsset.title ?? null,
                  type: remoteAsset.type ?? null,
                  updateTime: remoteAsset.updateTime ?? null,
                };

          const nextAsset = {
            id: assetId,
            category_id: categoryId,
            subtype_id: subtypeId,
            title,
            asset_url: sourceAssetUrl,
            width: remoteAsset.width,
            height: remoteAsset.height,
            sort_order: assetIndex,
            is_active: true,
            source_asset_id: sourceAssetId,
            source_asset_url: sourceAssetUrl,
            source_thumb_url:
              typeof remoteAsset.thumbUrl === "string" ? remoteAsset.thumbUrl : null,
            source_tag: subtype.tag,
            source_type: subtype.sourceType,
            source_meta: sourceMeta,
            storage_bucket: OFFICIAL_GALLERY_STORAGE_BUCKET,
            storage_object_path: null,
            mime_type: null,
            byte_size: null,
          } satisfies OfficialGalleryAssetRow;

          const existingAsset = existingAssetsById.get(assetId);
          if (existingAsset?.storage_object_path) {
            reusedCount += 1;
            return reusePersistedOfficialGalleryAsset({
              existingAsset,
              nextAsset,
            });
          }

          const uploaded = await uploadRemoteAsset({
            assetId,
            categoryId,
            client: options.client,
            downloadUrl: sourceAssetUrl,
            sourceLabel: `${category.name} / ${subtype.name}`,
            subtypeId,
          });
          downloadedCount += 1;

          return {
            ...nextAsset,
            asset_url: uploaded.assetUrl,
            source_meta: {
              ...sourceMeta,
              downloadedFromUrl: uploaded.downloadedFromUrl,
            },
            storage_object_path: uploaded.storageObjectPath,
            mime_type: uploaded.contentType ?? null,
            byte_size: uploaded.byteSize,
          } satisfies OfficialGalleryAssetRow;
        },
        onSkip: ({ error, index, item }) => {
          console.warn("[official-gallery-sync] skipping remote asset after retries", {
            assetId: item.assetId,
            category: category.name,
            index,
            reason: error,
            sourceAssetId: item.sourceAssetId,
            sourceType: subtype.sourceType,
            subtype: subtype.name,
            url: item.sourceAssetUrl,
          });
        },
      });

      if (preparedAssets.items.length > 0) {
        await upsertRowsInBatches({
          batchSize: 200,
          client: options.client,
          onConflict: "id",
          rows: preparedAssets.items,
          table: "official_gallery_assets",
        });
      }

      syncProgress.assetCount += preparedAssets.items.length;
      syncProgress.currentAssetIds.push(
        ...preparedAssets.items.map((item) => item.id),
      );
      console.info("[official-gallery-sync] persisted subtype assets", {
        category: category.name,
        downloadedCount,
        preparedCount: preparedAssets.items.length,
        reusedCount,
        skippedCount: preparedAssets.skipped.length,
        sourceType: subtype.sourceType,
        subtype: subtype.name,
      });

      if (subtype.sourceType === "STSQ") {
        await sleep(options.stsqDelayMs);
      }
    }
  }

  return syncProgress;
}

async function fetchAllJzxzAssetsForSubtype(options: {
  maxAssetsPerSubtype: number | null;
  pageSize: number;
  session: string;
  tag: string;
}) {
  const assets: JzxzRemoteAsset[] = [];

  for (let page = 0; ; page += 1) {
    const pageItems = await queryJzxzImagesViaBrowser(
      options.session,
      options.tag,
      page,
      options.pageSize,
    );

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    assets.push(...pageItems);

    if (
      options.maxAssetsPerSubtype &&
      options.maxAssetsPerSubtype > 0 &&
      assets.length >= options.maxAssetsPerSubtype
    ) {
      return limitOfficialGalleryRemoteAssets(
        assets,
        options.maxAssetsPerSubtype,
      );
    }

    if (pageItems.length < options.pageSize) {
      break;
    }
  }

  return limitOfficialGalleryRemoteAssets(assets, options.maxAssetsPerSubtype);
}

async function ensureBucketExists(client: SupabaseAdminClient) {
  const { data, error } = await client.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }

  const hasBucket = data.some((bucket) => bucket.id === OFFICIAL_GALLERY_STORAGE_BUCKET);
  if (hasBucket) {
    return;
  }

  const createResult = await client.storage.createBucket(
    OFFICIAL_GALLERY_STORAGE_BUCKET,
    {
      public: true,
      allowedMimeTypes: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/svg+xml",
      ],
      fileSizeLimit: 20 * 1024 * 1024,
    },
  );

  if (createResult.error) {
    throw new Error(
      `Failed to create bucket ${OFFICIAL_GALLERY_STORAGE_BUCKET}: ${createResult.error.message}`,
    );
  }
}

async function upsertRowsInBatches<T extends Record<string, unknown>>(options: {
  batchSize: number;
  client: SupabaseAdminClient;
  onConflict?: string;
  rows: T[];
  table:
    | "official_gallery_assets"
    | "official_gallery_categories"
    | "official_gallery_subtypes";
}) {
  for (const batch of chunk(options.rows, options.batchSize)) {
    const result = await options.client
      .from(options.table)
      .upsert(batch as never[], options.onConflict ? { onConflict: options.onConflict } : {});

    if (result.error) {
      throw new Error(
        `Failed to upsert ${options.table}: ${result.error.message}`,
      );
    }
  }
}

async function fetchActiveIds(
  client: SupabaseAdminClient,
  table:
    | "official_gallery_categories"
    | "official_gallery_subtypes"
    | "official_gallery_assets",
  column: "id" | "category_id" | "subtype_id" = "id",
) {
  const result = await client
    .from(table)
    .select(column)
    .eq("is_active", true);

  if (result.error) {
    throw new Error(`Failed to query ${table}: ${result.error.message}`);
  }

  return (result.data ?? []).map((row) => String((row as Record<string, unknown>)[column]));
}

async function deactivateRowsByIds(
  client: SupabaseAdminClient,
  table:
    | "official_gallery_categories"
    | "official_gallery_subtypes"
    | "official_gallery_assets",
  ids: string[],
  column: "id" | "category_id" | "subtype_id" = "id",
) {
  for (const batch of chunk(ids, 200)) {
    const result = await client
      .from(table)
      .update({ is_active: false })
      .in(column, batch as never[]);

    if (result.error) {
      throw new Error(
        `Failed to deactivate stale rows in ${table}: ${result.error.message}`,
      );
    }
  }
}

async function applySyncPayload(
  client: SupabaseAdminClient,
  progress: SyncRunProgress,
) {
  const [activeCategoryIds, activeSubtypeIds, activeAssetIds] = await Promise.all([
    fetchActiveIds(client, "official_gallery_categories"),
    fetchActiveIds(client, "official_gallery_subtypes"),
    fetchActiveIds(client, "official_gallery_assets"),
  ]);

  const staleCategoryIds = findOfficialGalleryStaleIds({
    activeIds: activeCategoryIds,
    currentIds: progress.currentCategoryIds,
  });
  const staleSubtypeIds = findOfficialGalleryStaleIds({
    activeIds: activeSubtypeIds,
    currentIds: progress.currentSubtypeIds,
  });
  const staleAssetIds = findOfficialGalleryStaleIds({
    activeIds: activeAssetIds,
    currentIds: progress.currentAssetIds,
  });

  if (staleCategoryIds.length > 0) {
    await deactivateRowsByIds(
      client,
      "official_gallery_categories",
      staleCategoryIds,
      "id",
    );
  }

  if (staleSubtypeIds.length > 0) {
    await deactivateRowsByIds(
      client,
      "official_gallery_subtypes",
      staleSubtypeIds,
      "id",
    );
  }

  if (staleAssetIds.length > 0) {
    await deactivateRowsByIds(
      client,
      "official_gallery_assets",
      staleAssetIds,
      "id",
    );
  }
}

async function main() {
  const options = parseCliArgs(process.argv);
  const client = createAdminClient();

  console.info("[official-gallery-sync] starting sync", options);

  const categories = await fetchRemoteConfig();
  await ensureBucketExists(client);
  await ensureJzxzBrowserSession(options.session);

  const progress = await prepareSyncPayload({
    browserSession: options.session,
    categoryLabels: options.categoryLabels,
    categories,
    client,
    downloadConcurrency: options.downloadConcurrency,
    jzxzPageSize: options.jzxzPageSize,
    limitCategories: options.limitCategories,
    limitSubtypes: options.limitSubtypes,
    maxAssetsPerSubtype: options.maxAssetsPerSubtype,
    stsqDelayMs: options.stsqDelayMs,
    subtypeLabels: options.subtypeLabels,
  });

  console.info("[official-gallery-sync] prepared sync progress", {
    assetCount: progress.assetCount,
    categoryCount: progress.categoryCount,
    subtypeCount: progress.subtypeCount,
  });

  if (options.skipCleanup) {
    console.info("[official-gallery-sync] skipping cleanup for targeted sync run", {
      categoryLabels: options.categoryLabels,
      subtypeLabels: options.subtypeLabels,
    });
  } else {
    await applySyncPayload(client, progress);
  }

  console.info("[official-gallery-sync] sync completed", {
    assetCount: progress.assetCount,
    bucket: OFFICIAL_GALLERY_STORAGE_BUCKET,
    categoryCount: progress.categoryCount,
    subtypeCount: progress.subtypeCount,
  });
}

main().catch((error) => {
  console.error(
    "[official-gallery-sync] sync failed",
    error instanceof Error ? error.stack ?? error.message : error,
  );
  process.exitCode = 1;
});
