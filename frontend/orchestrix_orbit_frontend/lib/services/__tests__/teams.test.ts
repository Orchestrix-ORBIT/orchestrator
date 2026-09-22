// lib/services/__tests__/teams.test.ts
// Unit tests for TeamsService — ResearchTeam + TeamMember endpoints

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TeamsService } from "../teams";
import * as apiModule from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const TEAM_ID = "team-001";
const USER_ID = "user-999";
const MEMBER_ID = "member-abc";

// ── Research Teams ────────────────────────────────────────────────────────────
describe("TeamsService.getMyTeams", () => {
  it("calls api.get with /api/research-teams", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await TeamsService.getMyTeams();
    expect(apiModule.api.get).toHaveBeenCalledWith("/api/research-teams");
  });
});

describe("TeamsService.createTeam", () => {
  it("calls api.post with /api/research-teams and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = { name: "Alpha Team", description: "Research group" };
    await TeamsService.createTeam(body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      "/api/research-teams",
      body
    );
  });
});

describe("TeamsService.addMember", () => {
  it("calls api.post with the team members URL and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue(undefined);
    const body = { userId: USER_ID, role: "MEMBER" as const };
    await TeamsService.addMember(TEAM_ID, body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      `/api/research-teams/${TEAM_ID}/members`,
      body
    );
  });
});

describe("TeamsService.removeMember", () => {
  it("calls api.del with the team+user URL", async () => {
    vi.mocked(apiModule.api.del).mockResolvedValue(undefined);
    await TeamsService.removeMember(TEAM_ID, USER_ID);
    expect(apiModule.api.del).toHaveBeenCalledWith(
      `/api/research-teams/${TEAM_ID}/members/${USER_ID}`
    );
  });
});

// ── Team Member records (admin) ───────────────────────────────────────────────
describe("TeamsService.getAllMembers", () => {
  it("calls api.get with /api/team", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await TeamsService.getAllMembers();
    expect(apiModule.api.get).toHaveBeenCalledWith("/api/team");
  });
});

describe("TeamsService.getMemberById", () => {
  it("calls api.get with /api/team/{id}", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await TeamsService.getMemberById(MEMBER_ID);
    expect(apiModule.api.get).toHaveBeenCalledWith(`/api/team/${MEMBER_ID}`);
  });
});

describe("TeamsService.updateMemberRole", () => {
  it("calls api.patch with the role endpoint and role payload", async () => {
    vi.mocked(apiModule.api.patch).mockResolvedValue({});
    await TeamsService.updateMemberRole(MEMBER_ID, "LEAD");
    expect(apiModule.api.patch).toHaveBeenCalledWith(
      `/api/team/${MEMBER_ID}/role`,
      { role: "LEAD" }
    );
  });
});

describe("TeamsService.removeMemberRecord", () => {
  it("calls api.del with /api/team/{id}", async () => {
    vi.mocked(apiModule.api.del).mockResolvedValue(undefined);
    await TeamsService.removeMemberRecord(MEMBER_ID);
    expect(apiModule.api.del).toHaveBeenCalledWith(`/api/team/${MEMBER_ID}`);
  });
});
