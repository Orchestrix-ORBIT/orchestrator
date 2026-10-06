import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadProjectsPage from "../page";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";

vi.mock("@/lib/services/projects", () => ({ ProjectsService: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock("@/lib/services/teams", () => ({ TeamsService: {
  getAllMembers: vi.fn().mockResolvedValue([]), createTeam: vi.fn(), addMember: vi.fn(),
} }));
vi.mock("@/lib/services/tasks", () => ({ TasksService: { getByProject: vi.fn().mockResolvedValue([]) } }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("lead project page", () => {
  it("shows loading, then filters the loaded projects", async () => {
    let finish!: (value: Project[]) => void;
    vi.mocked(ProjectsService.getAll).mockReturnValue(new Promise<Project[]>(resolve => { finish = resolve; }));
    render(<LeadProjectsPage />);
    expect(screen.getByText(/Loading Projects & Workspaces/)).toBeInTheDocument();
    finish([
      { id: "p1", name: "Alpha", status: "ACTIVE", description: "", createdAt: "2026-01-01", ownerId: "u1" },
      { id: "p2", name: "Beta", status: "ARCHIVED", description: "", createdAt: "2026-01-01", ownerId: "u1" },
    ]);
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    await userEvent.setup().type(screen.getByPlaceholderText("Search projects..."), "Beta");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("shows a load failure", async () => {
    vi.mocked(ProjectsService.getAll).mockRejectedValue(new Error("API unavailable"));
    render(<LeadProjectsPage />);
    expect(await screen.findByText("Error: API unavailable")).toBeInTheDocument();
  });

  it("creates a project and shows a failed submission for retry", async () => {
    vi.mocked(ProjectsService.getAll).mockResolvedValue([]);
    vi.mocked(ProjectsService.create).mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce({ id: "p1", name: "New study", description: "", status: "ACTIVE", createdAt: "2026-01-01", ownerId: "u1" });
    render(<LeadProjectsPage />);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Projects" });
    await user.click(screen.getByRole("button", { name: /New Project/i }));
    await user.type(screen.getByPlaceholderText("e.g. Neural Interface Study"), "  New study  ");
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(await screen.findByText("Permission denied")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    await waitFor(() => expect(screen.getByText("New study")).toBeInTheDocument());
    expect(ProjectsService.create).toHaveBeenCalledWith({ name: "New study", description: undefined });
  });

  it("persists selected researchers in a team linked to the new project", async () => {
    vi.mocked(ProjectsService.getAll).mockResolvedValue([]);
    vi.mocked(TeamsService.getAllMembers).mockResolvedValue([
      { id: "u2", email: "researcher@example.test", displayName: "Researcher Jane", role: "MEMBER" },
    ]);
    vi.mocked(TeamsService.createTeam).mockResolvedValue({ id: "team-1", name: "Study team", createdByUserId: "u1", createdAt: "2026-01-01" });
    vi.mocked(TeamsService.addMember).mockResolvedValue(undefined);
    vi.mocked(ProjectsService.create).mockResolvedValue({
      id: "p1", name: "Study", description: "", status: "ACTIVE", createdAt: "2026-01-01", ownerId: "u1",
    });
    render(<LeadProjectsPage />);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Projects" });
    await user.click(screen.getByRole("button", { name: /New Project/i }));
    await user.type(screen.getByPlaceholderText("e.g. Neural Interface Study"), "Study");
    await user.type(screen.getByPlaceholderText("Search researcher by name or email..."), "Jane");
    await user.click(screen.getByText("Researcher Jane"));
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    await waitFor(() => expect(ProjectsService.create).toHaveBeenCalledWith({
      name: "Study", description: undefined, teamId: "team-1",
    }));
    expect(TeamsService.addMember).toHaveBeenCalledWith("team-1", { userId: "u2", roleInTeam: "MEMBER" });
  });
});
