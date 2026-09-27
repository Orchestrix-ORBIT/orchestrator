// lib/services/__tests__/documents.test.ts
// Unit tests for DocumentsService — project-scoped document CRUD

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentsService } from "../documents";
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

const PID = "proj-111";
const DID = "doc-222";

describe("DocumentsService.getByProject", () => {
  it("calls api.get with the project documents URL", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await DocumentsService.getByProject(PID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/documents`
    );
  });
});

describe("DocumentsService.getById", () => {
  it("calls api.get with project + document ID URL", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await DocumentsService.getById(PID, DID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/projects/${PID}/documents/${DID}`
    );
  });
});

describe("DocumentsService.create", () => {
  it("calls api.post with correct URL and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = { title: "My Doc", content: "Content here", accessLevel: "TEAM" as const };
    await DocumentsService.create(PID, body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      `/api/projects/${PID}/documents`,
      body
    );
  });
});

describe("DocumentsService.update", () => {
  it("calls api.put with correct URL and body", async () => {
    vi.mocked(apiModule.api.put).mockResolvedValue({});
    const body = { title: "Updated Title" };
    await DocumentsService.update(PID, DID, body);
    expect(apiModule.api.put).toHaveBeenCalledWith(
      `/api/projects/${PID}/documents/${DID}`,
      body
    );
  });
});

describe("DocumentsService.delete", () => {
  it("calls api.del with the correct URL", async () => {
    vi.mocked(apiModule.api.del).mockResolvedValue(undefined);
    await DocumentsService.delete(PID, DID);
    expect(apiModule.api.del).toHaveBeenCalledWith(
      `/api/projects/${PID}/documents/${DID}`
    );
  });
});
