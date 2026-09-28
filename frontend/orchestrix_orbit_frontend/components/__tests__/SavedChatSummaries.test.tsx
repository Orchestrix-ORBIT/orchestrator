import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/savedSummaries", () => ({
  SavedSummariesService: { list: vi.fn() },
}));

import SavedChatSummaries from "../SavedChatSummaries";
import { SavedSummariesService } from "@/lib/services/savedSummaries";

describe("SavedChatSummaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a persisted summary with its key points and action items", async () => {
    vi.mocked(SavedSummariesService.list).mockResolvedValue([{
      id: "summary-1",
      projectId: "project-1",
      title: "Research chat summary",
      summary: "The team agreed on a plan.",
      keyPoints: ["Plan agreed"],
      actionItems: ["Share plan"],
      messageCount: 3,
      strategy: "stuff",
      processedAt: "2026-09-28T10:00:00Z",
    }]);

    render(<SavedChatSummaries />);

    expect(await screen.findByText("The team agreed on a plan.")).toBeInTheDocument();
    expect(screen.getByText("Plan agreed")).toBeInTheDocument();
    expect(screen.getByText("Share plan")).toBeInTheDocument();
  });
});
