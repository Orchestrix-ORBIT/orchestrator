import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from "@/lib/api";
import { SavedSummariesService } from "../savedSummaries";

describe("SavedSummariesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads summaries for the signed-in user's accessible projects", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    await SavedSummariesService.list();
    expect(api.get).toHaveBeenCalledWith("/api/ai/summaries");
  });

  it("sends the generated summary and its details to the save endpoint", async () => {
    vi.mocked(api.post).mockResolvedValue({});
    await SavedSummariesService.save("project-1", "Project chat summary", {
      summary: "The team agreed on a plan.",
      key_points: ["Plan agreed"],
      action_items: ["Share plan"],
      message_count: 3,
      strategy: "stuff",
    });
    expect(api.post).toHaveBeenCalledWith("/api/ai/summaries", {
      projectId: "project-1",
      title: "Project chat summary",
      summary: "The team agreed on a plan.",
      keyPoints: ["Plan agreed"],
      actionItems: ["Share plan"],
      messageCount: 3,
      strategy: "stuff",
    });
  });
});
