import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    // The board uses drag-and-drop between columns, followed by a confirmation dialog
    const titles = ["To Do", "In Progress", "Completed (Pending Review)", "Accepted ✓"];
    const titleSpan = (title: string) => screen.getAllByText(title).find((el) => el.tagName === "SPAN")!;
    // A column is the largest ancestor of its title that contains no other column title
    const column = (title: string) => {
      let el: HTMLElement = titleSpan(title);
      while (el.parentElement && titles.every((t) => t === title || !el.parentElement!.contains(titleSpan(t)))) el = el.parentElement;
      return el;
    };
    const card = () => document.getElementById("task-card-t1")!;
    const store: Record<string, string> = {};
    const dataTransfer = { setData: (k: string, v: string) => { store[k] = v; }, getData: (k: string) => store[k] ?? "", effectAllowed: "move", dropEffect: "move" };

    fireEvent.dragStart(card(), { dataTransfer });
    fireEvent.dragOver(column("In Progress"), { dataTransfer });
    fireEvent.drop(column("In Progress"), { dataTransfer });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Confirm Move" }));

    expect(TasksService.update).toHaveBeenCalledWith("p1", "t1", { status: "IN_PROGRESS" });
    await waitFor(() => expect(column("In Progress").contains(card())).toBe(true));
    reject(new Error("Forbidden"));
    await waitFor(() => expect(column("To Do").contains(card())).toBe(true));
  });

  it("does NOT show a New Task button — researchers cannot create tasks", async () => {
    render(<ResearcherTasksPage />);
    await screen.findByText("Review data");
    expect(screen.queryByRole("button", { name: /New Task/i })).toBeNull();
  });
});
