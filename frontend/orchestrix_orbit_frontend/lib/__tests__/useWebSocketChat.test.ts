// lib/__tests__/useWebSocketChat.test.ts
// Tests for the useWebSocketChat hook — mocks SockJS + STOMP + fetch

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Mock @stomp/stompjs ───────────────────────────────────────────────────────
// Must use a class (constructor) because the source does `new Client(...)`
const mockPublish = vi.fn();
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
const mockSubscribe = vi.fn();

vi.mock("@stomp/stompjs", () => {
  class MockClient {
    active = false;
    private _config: Record<string, unknown>;

    constructor(config: Record<string, unknown>) {
      this._config = config;
    }

    activate() {
      mockActivate();
      // Simulate async connect — trigger onConnect synchronously for tests
      if (typeof this._config.onConnect === "function") {
        this._config.onConnect();
      }
    }

    deactivate() {
      mockDeactivate();
    }

    publish(args: unknown) {
      mockPublish(args);
    }

    subscribe(dest: string, cb: unknown) {
      mockSubscribe(dest, cb);
    }
  }

  return { Client: MockClient };
});

// ── Mock sockjs-client ────────────────────────────────────────────────────────
vi.mock("sockjs-client", () => ({
  default: vi.fn(() => ({})),
}));

// ── Mock auth helpers ─────────────────────────────────────────────────────────
vi.mock("../auth", () => ({
  getTenantSlug: vi.fn(() => "test-tenant"),
  getEmail: vi.fn(() => "user@test.com"),
}));

import { useWebSocketChat } from "../useWebSocketChat";

const PROJECT_ID = "proj-123";

const fakeMessages = [
  {
    id: "msg-1",
    projectId: PROJECT_ID,
    senderId: "u1",
    senderName: "Alice",
    content: "Hello",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "msg-2",
    projectId: PROJECT_ID,
    senderId: "u2",
    senderName: "Bob",
    content: "Hi there",
    createdAt: "2026-01-01T00:01:00Z",
  },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useWebSocketChat — initial state", () => {
  it("starts with empty messages and loading history before fetch resolves", () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID));

    // Immediately after mount, before fetch resolves
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoadingHistory).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("subscribes to the tenant-specific project topic", () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    renderHook(() => useWebSocketChat(PROJECT_ID));

    expect(mockSubscribe).toHaveBeenCalledWith(
      `/topic/tenant/test_tenant/project/${PROJECT_ID}`,
      expect.any(Function)
    );
  });
});

describe("useWebSocketChat — fetchHistory", () => {
  it("sets messages from the API response and marks loading as false", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeMessages),
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID, 15));

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].senderName).toBe("Alice");
  });

  it("sets hasMore=false when returned message count is less than pageSize", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeMessages), // 2 < pageSize of 15
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID, 15));

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it("handles API failure gracefully — empty messages, hasMore=false", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID));

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("handles network throw gracefully", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID));

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));
    expect(result.current.messages).toEqual([]);
  });
});

describe("useWebSocketChat — sendMessage", () => {
  it("adds an optimistic message to the list immediately", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID));

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));

    act(() => {
      result.current.sendMessage("Hello world", "Alice");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Hello world");
    expect(result.current.messages[0].senderName).toBe("Alice");
    expect(result.current.messages[0].id).toMatch(/^opt-/);
  });

  it("does not add a message for empty or whitespace-only content", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);

    const { result } = renderHook(() => useWebSocketChat(PROJECT_ID));

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false));

    act(() => {
      result.current.sendMessage("   ", "Alice");
    });

    expect(result.current.messages).toHaveLength(0);
  });
});
