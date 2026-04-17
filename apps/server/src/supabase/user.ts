import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";
import { importJWK, jwtVerify } from "jose";

import type { Database } from "@loomic/shared";

import type { ServerEnv } from "../config/env.js";

export type UserSupabaseClient = SupabaseClient<Database>;

export type AuthenticatedUser = {
  accessToken: string;
  email: string;
  id: string;
  userMetadata: Record<string, unknown>;
};

export type RequestAuthenticator = {
  authenticate(
    request: Pick<FastifyRequest, "headers">,
  ): Promise<AuthenticatedUser | null>;
};

// --- In-memory auth cache (keyed by token, TTL 5 min) ---

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_SUPABASE_RETRY_DELAY_MS = 100;
const LOCAL_SUPABASE_RETRY_ATTEMPTS = 4;

type CachedAuth = { user: AuthenticatedUser; expiresAt: number };
const authCache = new Map<string, CachedAuth>();

function getCachedAuth(token: string): AuthenticatedUser | null {
  const entry = authCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    authCache.delete(token);
    return null;
  }
  return entry.user;
}

function setCachedAuth(token: string, user: AuthenticatedUser): void {
  authCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });

  // Lazy eviction: remove expired entries when cache grows large
  if (authCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of authCache) {
      if (now > val.expiresAt) authCache.delete(key);
    }
  }
}

// --- Authenticator factory ---

// Parse JWK JSON string into a CryptoKey at startup (async init)
let jwtPublicKeyPromise: Promise<Awaited<ReturnType<typeof importJWK>> | Uint8Array> | null = null;

function initJwtKey(
  env: Pick<ServerEnv, "supabaseJwtSecret">,
): Promise<Awaited<ReturnType<typeof importJWK>> | Uint8Array> | null {
  if (!env.supabaseJwtSecret) return null;

  try {
    const jwk = JSON.parse(env.supabaseJwtSecret);
    return importJWK(jwk, jwk.alg ?? "ES256");
  } catch {
    // Not a JWK JSON — treat as HMAC symmetric secret
    return Promise.resolve(new TextEncoder().encode(env.supabaseJwtSecret));
  }
}

export function createSupabaseRequestAuthenticator(
  env: Pick<ServerEnv, "supabaseAnonKey" | "supabaseJwtSecret" | "supabaseUrl">,
): RequestAuthenticator {
  jwtPublicKeyPromise = initJwtKey(env);

  // Local Supabase commonly issues ES256 access tokens in development while
  // older app envs may still carry a symmetric JWT secret. Keep remote user
  // verification available as a safety net when local signature checks fail.
  const createAuthVerificationClient =
    env.supabaseUrl && env.supabaseAnonKey
      ? createAuthVerificationClientFactory(env)
      : null;

  return {
    async authenticate(request) {
      const accessToken = readBearerToken(request.headers.authorization);
      if (!accessToken) {
        console.warn("[auth] missing bearer token", {
          authorizationHeaderType: Array.isArray(request.headers.authorization)
            ? "array"
            : typeof request.headers.authorization,
        });
        return null;
      }

      // 1. Check cache first
      const cached = getCachedAuth(accessToken);
      if (cached) return cached;

      // 2. Local JWT verification (preferred)
      if (jwtPublicKeyPromise) {
        try {
          const key = await jwtPublicKeyPromise;
          const { payload } = await jwtVerify(accessToken, key, {
            audience: "authenticated",
          });

          const userId = payload.sub;
          const email =
            typeof payload.email === "string" ? payload.email : null;

          if (!userId || !email) return null;

          const user: AuthenticatedUser = {
            accessToken,
            email,
            id: userId,
            userMetadata: isRecord(payload.user_metadata)
              ? (payload.user_metadata as Record<string, unknown>)
              : {},
          };

          setCachedAuth(accessToken, user);
          return user;
        } catch (error) {
          console.warn("[auth] local jwt verify failed", {
            error:
              error instanceof Error ? error.message : String(error),
            hasFallbackClient: Boolean(createAuthVerificationClient),
          });
          // Fall through to Supabase auth.getUser() when local verification
          // is unavailable or incompatible with the token signature format.
        }
      }

      // 3. Fallback: remote auth.getUser()
      if (createAuthVerificationClient) {
        const client = createAuthVerificationClient(accessToken);
        const { data, error } = await client.auth.getUser();

        if (error || !data.user || !data.user.email) {
          console.warn("[auth] fallback auth.getUser failed", {
            error: error?.message ?? null,
            hasEmail: Boolean(data?.user?.email),
            hasUser: Boolean(data?.user),
            supabaseUrl: env.supabaseUrl ?? null,
          });
          return null;
        }

        const user: AuthenticatedUser = {
          accessToken,
          email: data.user.email,
          id: data.user.id,
          userMetadata: isRecord(data.user.user_metadata)
            ? data.user.user_metadata
            : {},
        };

        setCachedAuth(accessToken, user);
        return user;
      }

      console.warn("[auth] no fallback auth client available", {
        hasSupabaseAnonKey: Boolean(env.supabaseAnonKey),
        hasSupabaseUrl: Boolean(env.supabaseUrl),
      });
      return null;
    },
  };
}

export function createUserSupabaseClientFactory(
  env: Pick<ServerEnv, "supabaseAnonKey" | "supabaseUrl">,
) {
  const stableFetch = createStableSupabaseFetch(env.supabaseUrl);

  return (accessToken: string): UserSupabaseClient => {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY are required for user-scoped Supabase access.",
      );
    }

    return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      accessToken: async () => accessToken,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Keep the explicit Authorization header alongside delegated accessToken
      // so PostgREST/RPC calls stay consistent across local Node and container
      // runtimes while still using the supported delegated-token path.
      global: {
        ...(stableFetch ? { fetch: stableFetch } : {}),
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  };
}

function createAuthVerificationClientFactory(
  env: Pick<ServerEnv, "supabaseAnonKey" | "supabaseUrl">,
) {
  const stableFetch = createStableSupabaseFetch(env.supabaseUrl);

  return (accessToken: string): UserSupabaseClient => {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY are required for user-scoped Supabase access.",
      );
    }

    return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        ...(stableFetch ? { fetch: stableFetch } : {}),
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  };
}

function readBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | null {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createStableSupabaseFetch(
  supabaseUrl: string | undefined,
): typeof fetch | undefined {
  if (!supabaseUrl) {
    return undefined;
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(supabaseUrl);
  } catch {
    return undefined;
  }

  return async (input, init) => {
    const requestUrl = resolveRequestUrl(baseUrl, input);
    const canRetry =
      requestUrl !== null &&
      requestUrl.origin === baseUrl.origin &&
      isLoopbackHost(requestUrl.hostname);
    const retryableRequest = cloneRetryableRequest(input);

    let lastError: unknown;

    for (let attempt = 1; attempt <= LOCAL_SUPABASE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const nextInput = retryableRequest ? retryableRequest.clone() : input;
        return await fetch(nextInput, init);
      } catch (error) {
        lastError = error;

        if (!canRetry || !isRetryableFetchFailure(error) || attempt === LOCAL_SUPABASE_RETRY_ATTEMPTS) {
          throw error;
        }

        console.warn("[supabase] retrying local request after transient fetch failure", {
          attempt,
          message: error instanceof Error ? error.message : String(error),
          url: sanitizeUrlForLogs(requestUrl),
        });

        await delay(LOCAL_SUPABASE_RETRY_DELAY_MS * attempt);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  };
}

function resolveRequestUrl(baseUrl: URL, input: Parameters<typeof fetch>[0]): URL | null {
  try {
    if (typeof input === "string") {
      return new URL(input, baseUrl);
    }
    if (input instanceof URL) {
      return input;
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return new URL(input.url, baseUrl);
    }
  } catch {
    return null;
  }

  return null;
}

function cloneRetryableRequest(
  input: Parameters<typeof fetch>[0],
): Request | null {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.clone();
  }

  return null;
}

function isRetryableFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message.includes("fetch failed")) {
    return true;
  }

  return String((error as Error & { cause?: unknown }).cause ?? "").includes(
    "UND_ERR_SOCKET",
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function sanitizeUrlForLogs(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
