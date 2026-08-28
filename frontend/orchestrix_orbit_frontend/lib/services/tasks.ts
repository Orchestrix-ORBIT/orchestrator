/**
 * lib/services/tasks.ts
 *
 * Tasks in this backend are always scoped to a project.
 * That's why every endpoint starts with /api/projects/{projectId}/tasks
 *
 * Backend task statuses: TODO | IN_PROGRESS | DONE | BLOCKED
 * Backend task priorities: LOW | MEDIUM | HIGH | CRITICAL
 */

import { api } from "@/lib/api";

// ── Types matching the Spring Boot TaskResponse DTO ──────────────────────────
export type TaskStatus   = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  projectId: string;
  createdAt: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

// ── Service object ───────────────────────────────────────────────────────────
export const TasksService = {
  /** GET /api/projects/{projectId}/tasks — all tasks for a project */
  getByProject: (projectId: string) =>
    api.get<Task[]>(`/api/projects/${projectId}/tasks`),

  /** GET /api/projects/{projectId}/tasks?status=IN_PROGRESS — filter by status */
  getByProjectAndStatus: (projectId: string, status: TaskStatus) =>
    api.get<Task[]>(`/api/projects/${projectId}/tasks?status=${status}`),

  /** GET /api/projects/{projectId}/tasks?assigneeId={uid} — filter by assignee */
  getByProjectAndAssignee: (projectId: string, assigneeId: string) =>
    api.get<Task[]>(`/api/projects/${projectId}/tasks?assigneeId=${assigneeId}`),

  /** GET /api/projects/{projectId}/tasks/{taskId} */
  getById: (projectId: string, taskId: string) =>
    api.get<Task>(`/api/projects/${projectId}/tasks/${taskId}`),

  /** POST /api/projects/{projectId}/tasks — create a new task */
  create: (projectId: string, body: CreateTaskBody) =>
    api.post<Task>(`/api/projects/${projectId}/tasks`, body),

  /** PATCH /api/projects/{projectId}/tasks/{taskId} — partial update */
  update: (projectId: string, taskId: string, body: UpdateTaskBody) =>
    api.patch<Task>(`/api/projects/${projectId}/tasks/${taskId}`, body),

  /** DELETE /api/projects/{projectId}/tasks/{taskId} */
  delete: (projectId: string, taskId: string) =>
    api.del(`/api/projects/${projectId}/tasks/${taskId}`),
};
