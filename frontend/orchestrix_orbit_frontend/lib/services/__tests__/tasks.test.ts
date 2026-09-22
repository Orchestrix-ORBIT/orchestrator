// lib/services/__tests__/tasks.test.ts
// Unit tests for TasksService — verifies correct URL and HTTP method via api mock

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TasksService } from "../tasks";
import * as apiModule from "@/lib/api";

// Mock the api module so no real fetch is made
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

const PID = "proj-001";
const TID = "task-abc";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TasksService.getByProject", () => {
  it("calls api.get with the correct project tasks URL", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await TasksService.getByProject(PID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks`
    );
  });
});

describe("TasksService.getByProjectAndStatus", () => {
  it("appends ?status= query parameter", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await TasksService.getByProjectAndStatus(PID, "IN_PROGRESS");
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks?status=IN_PROGRESS`
    );
  });
});

describe("TasksService.getByProjectAndAssignee", () => {
  it("appends ?assigneeId= query parameter", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await TasksService.getByProjectAndAssignee(PID, "user-999");
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks?assigneeId=user-999`
    );
  });
});

describe("TasksService.getById", () => {
  it("calls api.get with combined project+task URL", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await TasksService.getById(PID, TID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks/${TID}`
    );
  });
});

describe("TasksService.create", () => {
  it("calls api.post with correct URL and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = { title: "New Task", priority: "HIGH" as const };
    await TasksService.create(PID, body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks`,
      body
    );
  });
});

describe("TasksService.update", () => {
  it("calls api.patch with correct URL and body", async () => {
    vi.mocked(apiModule.api.patch).mockResolvedValue({});
    const body = { status: "DONE" as const };
    await TasksService.update(PID, TID, body);
    expect(apiModule.api.patch).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks/${TID}`,
      body
    );
  });
});

describe("TasksService.delete", () => {
  it("calls api.del with correct URL", async () => {
    vi.mocked(apiModule.api.del).mockResolvedValue(undefined);
    await TasksService.delete(PID, TID);
    expect(apiModule.api.del).toHaveBeenCalledWith(
      `/api/projects/${PID}/tasks/${TID}`
    );
  });
});
