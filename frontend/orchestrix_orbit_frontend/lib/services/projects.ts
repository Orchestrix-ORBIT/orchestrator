/**
 * lib/services/projects.ts
 *
 * HOW THIS WORKS:
 * This file wraps the /api/projects endpoints from Spring Boot.
 * Instead of writing fetch() in every component, you import ProjectsService
 * and call ProjectsService.getAll(), ProjectsService.create(...), etc.
 *
 * The `api` helper from lib/api.ts automatically:
 *   - Adds "Authorization: Bearer <token>" header (JWT)
 *   - Adds "X-Tenant-ID: <slug>" header (multi-tenancy)
 *   - Adds "Content-Type: application/json" header
 *   - Throws an Error if the response is not 2xx
 */

import { api } from "@/lib/api";

// ── Types matching the Spring Boot ProjectResponse DTO ───────────────────────
// These must match the JSON that comes back from the backend exactly.
export interface Project {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  createdByUserId: string;
}

export interface ProjectSummary {
  totalTasks: number;
  completedTasks: number;
  totalDocuments: number;
  totalMembers: number;
}

export interface CreateProjectBody {
  name: string;
  description?: string;
}

// ── Service object ───────────────────────────────────────────────────────────
export const ProjectsService = {
  /** GET /api/projects — list all projects in this tenant */
  getAll: () => api.get<Project[]>("/api/projects"),

  /** GET /api/projects/{id} — get one project by UUID */
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`),

  /** GET /api/projects/{id}/summary — task + member counts */
  getSummary: (id: string) => api.get<ProjectSummary>(`/api/projects/${id}/summary`),

  /** POST /api/projects — create a new project */
  create: (body: CreateProjectBody) =>
    api.post<Project>("/api/projects", body),

  /** DELETE /api/projects/{id} — delete a project */
  delete: (id: string) => api.del(`/api/projects/${id}`),
};
