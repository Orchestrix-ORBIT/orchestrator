// lib/services/__tests__/projects.test.ts
// Unit tests for ProjectsService — verifies URL, method, and body forwarding

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProjectsService } from "../projects";
import * as apiModule from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ID = "proj-xyz";

describe("ProjectsService.getAll", () => {
  it("calls api.get with /api/projects", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ProjectsService.getAll();
    expect(apiModule.api.get).toHaveBeenCalledWith("/api/projects");
  });
});

describe("ProjectsService.getById", () => {
  it("calls api.get with the project ID path", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await ProjectsService.getById(ID);
    expect(apiModule.api.get).toHaveBeenCalledWith(`/api/projects/${ID}`);
  });
});

describe("ProjectsService.getSummary", () => {
  it("calls api.get with the /summary path", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await ProjectsService.getSummary(ID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${ID}/summary`
    );
  });
});

describe("ProjectsService.create", () => {
  it("calls api.post with /api/projects and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = { name: "New Project", description: "A desc" };
    await ProjectsService.create(body);
    expect(apiModule.api.post).toHaveBeenCalledWith("/api/projects", body);
  });
});

describe("ProjectsService.delete", () => {
  it("calls api.del with the project ID path", async () => {
    vi.mocked(apiModule.api.del).mockResolvedValue(undefined);
    await ProjectsService.delete(ID);
    expect(apiModule.api.del).toHaveBeenCalledWith(`/api/projects/${ID}`);
  });
});

describe("ProjectsService.update", () => {
  it("calls api.put with correct URL and body on success", async () => {
    const updated = { id: ID, name: "Updated", description: "" };
    vi.mocked(apiModule.api.put).mockResolvedValue(updated);
    const result = await ProjectsService.update(ID, {
      name: "Updated",
      description: "",
    });
    expect(apiModule.api.put).toHaveBeenCalledWith(`/api/projects/${ID}`, {
      name: "Updated",
      description: "",
    });
    expect(result).toEqual(updated);
  });

  it("returns a fallback object when api.put rejects", async () => {
    vi.mocked(apiModule.api.put).mockRejectedValue(new Error("Network error"));
    const result = await ProjectsService.update(ID, { name: "Fallback" });
    // The service has a .catch that returns { id, ...body }
    expect(result).toMatchObject({ id: ID, name: "Fallback" });
  });
});
