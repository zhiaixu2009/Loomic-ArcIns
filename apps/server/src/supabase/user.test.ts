import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const createClient = vi.fn(() => ({
  auth: {
    getUser,
  },
}));
const importJWK = vi.fn();
const jwtVerify = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("jose", () => ({
  importJWK,
  jwtVerify,
}));

async function loadAuthenticatorModule() {
  return import("./user.js");
}

describe("createSupabaseRequestAuthenticator", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("falls back to Supabase auth.getUser when local JWT verification fails", async () => {
    jwtVerify.mockRejectedValueOnce(new Error("signature verification failed"));
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          email: "studio@example.com",
          id: "user-1",
          user_metadata: {
            display_name: "Studio Lead",
          },
        },
      },
      error: null,
    });

    const { createSupabaseRequestAuthenticator } =
      await loadAuthenticatorModule();

    const auth = createSupabaseRequestAuthenticator({
      supabaseAnonKey: "anon-key",
      supabaseJwtSecret: "local-dev-hmac-secret",
      supabaseUrl: "http://127.0.0.1:54321",
    });

    const user = await auth.authenticate({
      headers: {
        authorization: "Bearer access-token-1",
      },
    } as any);

    expect(jwtVerify).toHaveBeenCalledWith(
      "access-token-1",
      expect.any(Uint8Array),
      expect.objectContaining({ audience: "authenticated" }),
    );
    expect(createClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
        global: expect.objectContaining({
          headers: {
            Authorization: "Bearer access-token-1",
          },
        }),
      }),
    );
    expect(getUser).toHaveBeenCalledOnce();
    expect(user).toEqual({
      accessToken: "access-token-1",
      email: "studio@example.com",
      id: "user-1",
      userMetadata: {
        display_name: "Studio Lead",
      },
    });
  });

  it("binds user-scoped Supabase clients through both delegated auth paths", async () => {
    const { createUserSupabaseClientFactory } =
      await loadAuthenticatorModule();

    const createUserClient = createUserSupabaseClientFactory({
      supabaseAnonKey: "anon-key",
      supabaseUrl: "http://127.0.0.1:54321",
    });

    createUserClient("access-token-2");

    expect(createClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "anon-key",
      expect.objectContaining({
        accessToken: expect.any(Function),
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
        global: expect.objectContaining({
          headers: {
            Authorization: "Bearer access-token-2",
          },
        }),
      }),
    );

    const firstCreateClientCall = createClient.mock.calls.at(0) as
      | unknown[]
      | undefined;
    expect(firstCreateClientCall).toBeDefined();

    const options = firstCreateClientCall?.[2] as unknown as {
      accessToken?: () => Promise<string | null>;
    };
    await expect(options.accessToken?.()).resolves.toBe("access-token-2");
  });

  it("adds a retrying loopback fetch for user-scoped local Supabase clients", async () => {
    const runtimeFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
    vi.stubGlobal("fetch", runtimeFetch);

    const { createUserSupabaseClientFactory } =
      await loadAuthenticatorModule();

    const createUserClient = createUserSupabaseClientFactory({
      supabaseAnonKey: "anon-key",
      supabaseUrl: "http://127.0.0.1:54321",
    });

    createUserClient("access-token-3");

    const firstCreateClientCall = createClient.mock.calls.at(0) as
      | unknown[]
      | undefined;
    expect(firstCreateClientCall).toBeDefined();

    const options = firstCreateClientCall?.[2] as unknown as {
      global?: {
        fetch?: (input: string, init?: RequestInit) => Promise<unknown>;
      };
    };

    expect(options.global?.fetch).toBeTypeOf("function");
    await expect(
      options.global?.fetch?.("http://127.0.0.1:54321/rest/v1/projects"),
    ).resolves.toMatchObject({
      ok: true,
      status: 200,
    });
    expect(runtimeFetch).toHaveBeenCalledTimes(2);
  });
});
