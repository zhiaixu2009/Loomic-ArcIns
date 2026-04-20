import type { AssetBucket, AssetObject } from "@loomic/shared";

import type { AdminSupabaseClient } from "../../supabase/admin.js";
import type {
  AuthenticatedUser,
  UserSupabaseClient,
} from "../../supabase/user.js";

/** Buckets configured as public in Supabase — use getPublicUrl instead of signed URLs */

export class UploadServiceError extends Error {
  readonly statusCode: number;
  readonly code: "upload_failed" | "asset_not_found";

  constructor(
    code: "upload_failed" | "asset_not_found",
    message: string,
    statusCode: number,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type UploadFileInput = {
  bucket: AssetBucket;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  workspaceId: string;
  projectId?: string | undefined;
};

export type UploadService = {
  uploadFile(
    user: AuthenticatedUser,
    input: UploadFileInput,
  ): Promise<{ asset: AssetObject; url: string }>;

  getAssetUrl(
    user: AuthenticatedUser,
    assetId: string,
  ): Promise<string>;

  deleteAsset(
    user: AuthenticatedUser,
    assetId: string,
  ): Promise<void>;
};

type UploadAssetRow = {
  bucket: AssetBucket;
  byte_size: number | null;
  created_at: string;
  id: string;
  mime_type: string | null;
  object_path: string;
  project_id: string | null;
  workspace_id: string;
};

const SIGNED_URL_EXPIRY_SECONDS = 3600;
const PUBLIC_ASSET_BUCKETS: ReadonlySet<AssetBucket> = new Set([
  "project-assets",
  "user-avatars",
]);
const TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS = 3;
const TRANSIENT_UPLOAD_OPERATION_RETRY_DELAY_MS = 100;

export function createUploadService(options: {
  createUserClient: (accessToken: string) => UserSupabaseClient;
  getAdminClient?: () => AdminSupabaseClient;
}): UploadService {
  return {
    async uploadFile(user, input) {
      const client = options.createUserClient(user.accessToken);
      const privilegedClient = options.getAdminClient?.() ?? client;
      const workspaceId = input.workspaceId;

      const objectPath = buildObjectPath(
        workspaceId,
        input.projectId,
        input.fileName,
      );

      const { error: storageError } = await runTransientUploadOperation(
        "storage upload",
        () =>
          privilegedClient.storage
            .from(input.bucket)
            .upload(objectPath, input.fileBuffer, {
              contentType: input.mimeType,
              upsert: false,
            }),
        (result) => getRetryableSupabaseErrorMessage(result.error),
      );

      if (storageError) {
        console.error("[uploads] storage upload failed", {
          bucket: input.bucket,
          objectPath,
          projectId: input.projectId ?? null,
          workspaceId,
          message: storageError.message,
        });
        throw new UploadServiceError(
          "upload_failed",
          `Storage upload failed: ${storageError.message}`,
          500,
        );
      }

      const { data: assetRow, error: insertError } = await runTransientUploadOperation<{
        data: UploadAssetRow | null;
        error: { message?: string | null } | null;
      }>(
        "asset metadata insert",
        async () =>
          await privilegedClient
            .from("asset_objects")
            .insert({
              workspace_id: workspaceId,
              bucket: input.bucket,
              object_path: objectPath,
              mime_type: input.mimeType,
              byte_size: input.fileBuffer.length,
              created_by: user.id,
              ...(input.projectId ? { project_id: input.projectId } : {}),
            })
            .select(
              "id, bucket, object_path, mime_type, byte_size, workspace_id, project_id, created_at",
            )
            .single(),
        (result) => getRetryableSupabaseErrorMessage(result.error),
      );

      if (insertError || !assetRow) {
        console.error("[uploads] asset metadata insert failed", {
          bucket: input.bucket,
          objectPath,
          projectId: input.projectId ?? null,
          workspaceId,
          hasAssetRow: Boolean(assetRow),
          message: insertError?.message ?? null,
        });
        // Clean up the uploaded file on DB insert failure
        await privilegedClient.storage.from(input.bucket).remove([objectPath]);
        throw new UploadServiceError(
          "upload_failed",
          "Failed to record asset metadata.",
          500,
        );
      }

      const url = await getAssetUrl(privilegedClient, input.bucket, objectPath);

      return {
        asset: {
          id: assetRow.id,
          bucket: assetRow.bucket as AssetBucket,
          objectPath: assetRow.object_path,
          mimeType: assetRow.mime_type,
          byteSize: assetRow.byte_size,
          workspaceId: assetRow.workspace_id,
          projectId: assetRow.project_id,
          createdAt: assetRow.created_at,
        },
        url,
      };
    },

    async getAssetUrl(user, assetId) {
      const client = options.createUserClient(user.accessToken);
      const privilegedClient = options.getAdminClient?.() ?? client;

      const { data: assetRow, error } = await client
        .from("asset_objects")
        .select("bucket, object_path")
        .eq("id", assetId)
        .single();

      if (error || !assetRow) {
        throw new UploadServiceError(
          "asset_not_found",
          "Asset not found.",
          404,
        );
      }

      return getAssetUrl(
        privilegedClient,
        assetRow.bucket as AssetBucket,
        assetRow.object_path,
      );
    },

    async deleteAsset(user, assetId) {
      const client = options.createUserClient(user.accessToken);
      const privilegedClient = options.getAdminClient?.() ?? client;

      const { data: assetRow, error: fetchError } = await client
        .from("asset_objects")
        .select("bucket, object_path")
        .eq("id", assetId)
        .single();

      if (fetchError || !assetRow) {
        throw new UploadServiceError(
          "asset_not_found",
          "Asset not found.",
          404,
        );
      }

      await privilegedClient.storage
        .from(assetRow.bucket)
        .remove([assetRow.object_path]);

      const { error: deleteError } = await privilegedClient
        .from("asset_objects")
        .delete()
        .eq("id", assetId);

      if (deleteError) {
        throw new UploadServiceError(
          "upload_failed",
          "Failed to delete asset record.",
          500,
        );
      }
    },
  };
}

function buildObjectPath(
  workspaceId: string,
  projectId: string | undefined,
  fileName: string,
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (projectId) {
    return `${workspaceId}/${projectId}/${timestamp}-${safeName}`;
  }
  return `${workspaceId}/${timestamp}-${safeName}`;
}

async function getAssetUrl(
  client: UserSupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
): Promise<string> {
  if (PUBLIC_ASSET_BUCKETS.has(bucket)) {
    return createPublicUrl(client, bucket, objectPath);
  }

  return createSignedUrl(client, bucket, objectPath);
}

function createPublicUrl(
  client: UserSupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
): string {
  const { data } = client.storage
    .from(bucket)
    .getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw new UploadServiceError(
      "upload_failed",
      "Failed to generate public URL.",
      500,
    );
  }

  return data.publicUrl;
}

async function createSignedUrl(
  client: UserSupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new UploadServiceError(
      "upload_failed",
      "Failed to generate signed URL.",
      500,
    );
  }

  return data.signedUrl;
}

async function runTransientUploadOperation<T>(
  stepName: string,
  operation: () => Promise<T>,
  getRetryMessage: (result: T) => string | null,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const result = await operation();
      const retryMessage = getRetryMessage(result);

      if (
        !retryMessage ||
        attempt === TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS
      ) {
        return result;
      }

      console.warn("[uploads] transient operation failed, retrying", {
        attempt,
        maxAttempts: TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS,
        message: retryMessage,
        stepName,
      });
    } catch (error) {
      const retryMessage = getRetryableSupabaseErrorMessage(error);

      if (
        !retryMessage ||
        attempt === TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS
      ) {
        throw error;
      }

      console.warn("[uploads] transient operation threw, retrying", {
        attempt,
        maxAttempts: TRANSIENT_UPLOAD_OPERATION_RETRY_ATTEMPTS,
        message: retryMessage,
        stepName,
      });
    }

    await delay(TRANSIENT_UPLOAD_OPERATION_RETRY_DELAY_MS * attempt);
  }

  throw new Error(`Unreachable retry loop for ${stepName}.`);
}

function getRetryableSupabaseErrorMessage(error: unknown): string | null {
  const message = extractSupabaseErrorMessage(error);
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("und_err_") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("invalid response was received from the upstream server")
  ) {
    return message;
  }

  return null;
}

function extractSupabaseErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
