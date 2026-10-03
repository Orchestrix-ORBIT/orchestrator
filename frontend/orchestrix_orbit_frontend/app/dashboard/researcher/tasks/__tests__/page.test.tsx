import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResearcherTasksPage from "../page";
import { ProjectsService } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";

vi.mock("@/lib/services/projects", () => ({ ProjectsService: { getAll: vi.fn() } }));
vi.mock("@/lib/services/tasks", () => ({ TasksService: { getByProject: vi.fn(), update: vi.fn() } }));

const project = { id: "p1", name: "Alpha", status: "ACTIVE" as const, description: "", createdAt: "2026-01-01", ownerId: "u1" };
const task = { id: "t1", projectId: "p1", title: "Review data", status: "TODO" as const,
  priority: "MEDIUM" as const, createdAt: "2026-01-01", assigneeId: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Set currentUserId so isOwnTask() returns true for the test task (assigneeId: "u1")
  localStorage.setItem("userId", "u1");
  vi.mocked(ProjectsService.getAll).mockResolvedValue([project]);
  vi.mocked(TasksService.getByProject).mockResolvedValue([task]);
});

describe("researcher task board", () => {
  it("moves a task and rolls back the card when the API rejects the update", async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(TasksService.update).mockReturnValue(new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<ResearcherTasksPage />);
    await screen.findByText("Review data");

    // New design uses a status <select> dropdown instead of move buttons
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects.find(el => (el as HTMLSelectElement).value === "TODO");
    expect(statusSelect).toBeTruthy();
    await userEvent.setup().selectOptions(statusSelect!, "IN_PROGRESS");
    expect(TasksService.update).toHaveBeenCalledWith("p1", "t1", { status: "IN_PROGRESS" });
    reject(new Error("Forbidden"));
    await waitFor(() => {
      const allSelects = screen.getAllByRole("combobox");
      const rolled = allSelects.find(el => (el as HTMLSelectElement).value === "TODO");
      expect(rolled).toBeTruthy();
    });
  });

  it("does NOT show a New Task button — researchers cannot create tasks", async () => {
    render(<ResearcherTasksPage />);
    await screen.findByText("Review data");
    expect(screen.queryByRole("button", { name: /New Task/i })).toBeNull();
  });
});
