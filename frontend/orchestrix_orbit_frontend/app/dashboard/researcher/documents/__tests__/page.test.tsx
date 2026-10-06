import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResearcherDocumentsPage from "../page";
import { ProjectsService } from "@/lib/services/projects";
import { DocumentsService } from "@/lib/services/documents";

vi.mock("@/lib/services/projects", () => ({ ProjectsService: { getAll: vi.fn() } }));
vi.mock("@/lib/services/documents", () => ({
  DocumentsService: { getByProject: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

const project = { id: "p1", name: "Alpha", status: "ACTIVE" as const, description: "", createdAt: "2026-01-01", ownerId: "u1" };
const doc = { id: "d1", projectId: "p1", title: "Methods", category: "OTHER",
  contentEncrypted: null, fileStorageKey: null, version: 1,
  authorId: "author-123", createdAt: "2026-01-01", updatedAt: "2026-01-01" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ProjectsService.getAll).mockResolvedValue([project]);
  vi.mocked(DocumentsService.getByProject).mockResolvedValue([doc]);
});

describe("researcher documents page", () => {
  it("creates a categorized document in its project", async () => {
    vi.mocked(DocumentsService.create).mockResolvedValue({ ...doc, id: "d2", title: "Meeting notes", category: "MEETING_MINUTES" });
    render(<ResearcherDocumentsPage />);
    const user = userEvent.setup();
    await screen.findByText("Methods");
    await user.click(screen.getByRole("button", { name: /New Document/i }));
    await user.type(screen.getByPlaceholderText("e.g. Methodology Draft"), " Meeting notes ");
    await user.selectOptions(document.querySelector<HTMLSelectElement>("#select-doc-category")!, "MEETING_MINUTES");
    await user.type(screen.getByPlaceholderText("Document content"), "Minutes");
    await user.click(screen.getByRole("button", { name: "Create Document" }));
    await waitFor(() => expect(screen.getByText("Meeting notes")).toBeInTheDocument());
    expect(DocumentsService.create).toHaveBeenCalledWith("p1", {
      title: "Meeting notes", contentEncrypted: "Minutes", category: "MEETING_MINUTES",
    });
  });

  it("keeps a document when delete confirmation is canceled", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<ResearcherDocumentsPage />);
    await screen.findByText("Methods");
    await userEvent.setup().click(screen.getByTitle("Delete"));
    expect(DocumentsService.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Methods")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
