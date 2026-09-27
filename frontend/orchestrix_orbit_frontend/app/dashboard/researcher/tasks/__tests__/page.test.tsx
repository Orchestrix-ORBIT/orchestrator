import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResearcherTasksPage from "../page";
import { ProjectsService } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";

vi.mock("@/lib/services/projects", () => ({ ProjectsService: { getAll: vi.fn() } }));
vi.mock("@/lib/services/tasks", () => ({ TasksService: { getByProject: vi.fn(), update: vi.fn(), create: vi.fn() } }));

const project = { id: "p1", name: "Alpha", status: "ACTIVE" as const, description: "", createdAt: "2026-01-01", createdByUserId: "u1" };
const task = { id: "t1", projectId: "p1", title: "Review data", status: "TODO" as const,
  priority: "MEDIUM" as const, createdAt: "2026-01-01" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(ProjectsService.getAll).mockResolvedValue([project]);
  vi.mocked(TasksService.getByProject).mockResolvedValue([task]);
});

describe("researcher task board", () => {
  it("moves a task and rolls back the card when the API rejects the update", async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(TasksService.update).mockReturnValue(new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<ResearcherTasksPage />);
    await screen.findByText("Review data");
    await userEvent.setup().click(screen.getByTitle("Move to In Progress"));
    expect(TasksService.update).toHaveBeenCalledWith("p1", "t1", { status: "IN_PROGRESS" });
    reject(new Error("Forbidden"));
    await waitFor(() => expect(screen.getByTitle("Move to In Progress")).toBeInTheDocument());
  });

  it("creates a task in the selected project", async () => {
    vi.mocked(TasksService.create).mockResolvedValue({ ...task, id: "t2", title: "New task" });
    render(<ResearcherTasksPage />);
    const user = userEvent.setup();
    await screen.findByText("Review data");
    await user.click(screen.getByRole("button", { name: /New Task/i }));
    await user.type(screen.getByPlaceholderText("e.g. Review literature"), " New task ");
    await user.click(screen.getByRole("button", { name: "Create Task" }));
    expect(await screen.findByText("New task")).toBeInTheDocument();
    expect(TasksService.create).toHaveBeenCalledWith("p1", {
      title: "New task", priority: "MEDIUM", dueDate: undefined,
    });
  });
});
