/**
 * lib/services/teams.ts
 *
 * TWO separate concepts in the backend:
 *
 * 1. ResearchTeam — a named group within the tenant
 *    Endpoint: /api/research-teams
 *    Used by: Lead dashboard (create/manage teams)
 *
 * 2. TeamMember — members inside a ResearchTeam
 *    Endpoint: /api/team  (list/update individual member records)
 *    ADMIN only: PATCH and DELETE on /api/team/{id}
 *
 * TeamRole values: LEAD | MEMBER | OBSERVER
 */

import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
export type TeamRole = "LEAD" | "MEMBER" | "OBSERVER";

export interface ResearchTeam {
  id: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  userEmail?: string;
  userDisplayName?: string;
}

export interface CreateTeamBody {
  name: string;
  description?: string;
}

export interface AddMemberBody {
  userId: string;
  role: TeamRole;
}

// ── Service object ───────────────────────────────────────────────────────────
export const TeamsService = {
  // ── Research Teams ────────────────────────────────────────────────────────

  /** GET /api/research-teams — teams the current user belongs to */
  getMyTeams: () => api.get<ResearchTeam[]>("/api/research-teams"),

  /** POST /api/research-teams — create a new research team */
  createTeam: (body: CreateTeamBody) =>
    api.post<ResearchTeam>("/api/research-teams", body),

  /** POST /api/research-teams/{teamId}/members — add a member */
  addMember: (teamId: string, body: AddMemberBody) =>
    api.post<void>(`/api/research-teams/${teamId}/members`, body),

  /** DELETE /api/research-teams/{teamId}/members/{userId} — remove a member */
  removeMember: (teamId: string, userId: string) =>
    api.del(`/api/research-teams/${teamId}/members/${userId}`),

  // ── Team Member records (admin) ───────────────────────────────────────────

  /** GET /api/team — all team member records (admin) */
  getAllMembers: () => api.get<TeamMember[]>("/api/team"),

  /** GET /api/team/{id} */
  getMemberById: (id: string) => api.get<TeamMember>(`/api/team/${id}`),

  /** PATCH /api/team/{id}/role — update member's role (ADMIN only) */
  updateMemberRole: (id: string, role: TeamRole) =>
    api.patch<TeamMember>(`/api/team/${id}/role`, { role }),

  /** DELETE /api/team/{id} — remove a member (ADMIN only) */
  removeMemberRecord: (id: string) => api.del(`/api/team/${id}`),
};
