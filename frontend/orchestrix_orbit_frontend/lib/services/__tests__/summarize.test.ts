// lib/services/__tests__/summarize.test.ts
// Unit tests for summarizeMessages — mocks global fetch directly

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
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
    expect(url).toContain("/summarize");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({
      messages: mockMessages,
      projectId: "proj-1",
      tenantId: "tenant-1",
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

    await expect(summarizeMessages(mockMessages)).rejects.toThrow(
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

    await expect(summarizeMessages(mockMessages)).rejects.toThrow(
      "Context Engine error: 503 Service Unavailable"
    );
  });
});
