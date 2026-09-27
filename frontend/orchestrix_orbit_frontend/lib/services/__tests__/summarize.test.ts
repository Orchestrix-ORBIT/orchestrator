// lib/services/__tests__/summarize.test.ts
// Unit tests for summarizeMessages — mocks global fetch directly

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTenantSlug, getToken } from "@/lib/auth";
import { summarizeMessages } from "../summarize";
import type { ChatMessageForSummary, SummaryResult } from "../summarize";

const mockMessages: ChatMessageForSummary[] = [
  { senderName: "Alice", content: "Let's start the experiment." },
  { senderName: "Bob", content: "Agreed, ready when you are." },
];

const mockSummaryResult: SummaryResult = {
  summary: "The team agreed to start the experiment.",
  key_points: ["Experiment start"],
  action_items: ["Begin experiment"],
  message_count: 2,
  strategy: "stuff",
};

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(),
  getTenantSlug: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(getToken).mockReturnValue("test-token");
  vi.mocked(getTenantSlug).mockReturnValue("stored-tenant");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("summarizeMessages", () => {
  it("sends correct request body and returns SummaryResult on success", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSummaryResult),
    } as unknown as Response);

    const result = await summarizeMessages(mockMessages, "proj-1", "tenant-1");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/ai/summarize");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "X-Tenant-ID": "tenant-1",
    });
    expect(JSON.parse(options.body as string)).toEqual({
      messages: mockMessages,
      projectId: "proj-1",
    });
    expect(result).toEqual(mockSummaryResult);
  });

  it("throws an Error with detail message when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ detail: "Model overloaded" }),
    } as unknown as Response);

    await expect(summarizeMessages(mockMessages, "proj-1")).rejects.toThrow(
      "Model overloaded"
    );
  });

  it("throws a fallback error message when error body has no detail field", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.resolve({}),
    } as unknown as Response);

    await expect(summarizeMessages(mockMessages, "proj-1")).rejects.toThrow(
      "Summarization request failed: 503 Service Unavailable"
    );
  });

  it("does not send messages without a login token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    await expect(summarizeMessages(mockMessages, "proj-1")).rejects.toThrow(
      "Please sign in"
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
