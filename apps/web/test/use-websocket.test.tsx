// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWebSocket } from "../src/hooks/use-websocket";

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
  }
}

describe("useWebSocket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a stable handle reference when the connection state is unchanged", () => {
    vi.stubGlobal(
      "WebSocket",
      MockWebSocket as unknown as typeof WebSocket,
    );

    const getToken = () => "token_123";
    const { result, rerender } = renderHook(() => useWebSocket(getToken));

    const firstHandle = result.current;

    rerender();

    expect(result.current).toBe(firstHandle);
  });
});
