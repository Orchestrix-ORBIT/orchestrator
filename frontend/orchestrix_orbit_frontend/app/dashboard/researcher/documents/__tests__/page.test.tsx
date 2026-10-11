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
    await user.click(screen.getAllByRole("button", { name: /Create Document/i })[0]);
    await user.type(screen.getByPlaceholderText("e.g. Synthesis Protocol for Next Batch"), " Meeting notes ");
    // The category defaults to "Meeting Minutes"
    await user.type(screen.getByPlaceholderText("Document outline, notes, or agenda..."), "Minutes");
    const submit = screen.getAllByRole("button", { name: "Create Document" });
    await user.click(submit[submit.length - 1]);
    await waitFor(() => expect(screen.getByText("Meeting notes")).toBeInTheDocument());
    expect(DocumentsService.create).toHaveBeenCalledWith("p1", expect.objectContaining({
      title: "Meeting notes", contentEncrypted: "Minutes", category: "MEETING_MINUTES",
    }));
  });

  it("keeps a document when delete confirmation is canceled", async () => {
    localStorage.setItem("userId", "author-123"); // only the author sees the delete button
    render(<ResearcherDocumentsPage />);
    const user = userEvent.setup();
    await screen.findByText("Methods");
    await user.click(screen.getByTitle("Delete document"));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(DocumentsService.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Methods")).toBeInTheDocument();
    localStorage.removeItem("userId");
  });
});
