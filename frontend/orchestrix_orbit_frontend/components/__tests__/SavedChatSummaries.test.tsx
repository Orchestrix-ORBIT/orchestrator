import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/aiSummaries", () => ({
  getAiSummaries: vi.fn(),
  deleteAiSummary: vi.fn(),
}));

import SavedChatSummaries from "../SavedChatSummaries";
import { getAiSummaries } from "@/lib/services/aiSummaries";

describe("SavedChatSummaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a persisted summary with its key findings and action items", async () => {
    vi.mocked(getAiSummaries).mockResolvedValue([{
      id: "summary-1",
      projectId: "project-1",
      topic: "Research chat summary",
      summary: "The team agreed on a plan.",
      keyFindings: ["Plan agreed"],
      actionItems: ["Share plan"],
      confidence: 90,
      date: "28 Sep 2026",
      status: "COMPLETED",
      model: "gemini",
      messageCount: 3,
    } as never]);

    render(<SavedChatSummaries />);

    // The first summary is selected automatically
    expect(await screen.findByText("The team agreed on a plan.")).toBeInTheDocument();
    expect(screen.getByText("Plan agreed")).toBeInTheDocument();
    expect(screen.getByText("Share plan")).toBeInTheDocument();
  });
});
