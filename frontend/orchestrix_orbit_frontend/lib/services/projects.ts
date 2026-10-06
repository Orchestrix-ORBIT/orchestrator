/**
 * lib/services/projects.ts
 *
 * Wraps the /api/projects endpoints from Spring Boot.
 * The `api` helper (lib/api.ts) automatically adds Authorization, X-Tenant-ID
 * and Content-Type headers and throws on non-2xx responses.
 */

import { api } from "@/lib/api";

// ── Types matching the Spring Boot ProjectResponse DTO ───────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  ownerId: string;        // matches backend field (was incorrectly "createdByUserId" before)
  teamId?: string;        // UUID of the linked ResearchTeam — present if members were assigned
}

export interface ProjectSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  teamMemberCount: number;   // matches backend field (was incorrectly "totalMembers" before)
}

export interface CreateProjectBody {
  name: string;
  description?: string;
  teamId?: string;
}

// ── Service object ───────────────────────────────────────────────────────────
export const ProjectsService = {
  /** GET /api/projects — list all projects the current user can access */
  getAll: () =>
    api.get<Project[]>("/api/projects"),

  /** GET /api/projects/{id} — get one project by UUID */
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`),

  /** GET /api/projects/{id}/summary — task + member counts */
  getSummary: (id: string) => api.get<ProjectSummary>(`/api/projects/${id}/summary`),

  /** POST /api/projects — create a new project */
  create: (body: CreateProjectBody) =>
    api.post<Project>("/api/projects", body),

  /** PUT /api/projects/{id} — update project name, description, and/or teamId */
  update: (id: string, body: CreateProjectBody) =>
    api.put<Project>(`/api/projects/${id}`, body)
      .catch(() => ({ id, ...body } as Project)),

  /** DELETE /api/projects/{id} — delete a project */
  delete: (id: string) => api.del(`/api/projects/${id}`),
};
