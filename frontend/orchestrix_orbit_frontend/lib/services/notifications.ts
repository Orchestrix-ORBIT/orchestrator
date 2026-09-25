/**
 * lib/services/notifications.ts
 *
 * Wraps the /api/notifications endpoints from Spring Boot.
 *
 * Backend Notification entity fields:
 *   id, userId, type, title, message, isRead, createdAt
 *
 * Available endpoints:
 *   GET    /api/notifications         → list all (ordered newest first)
 *   PATCH  /api/notifications/read-all → mark all as read
 *   PATCH  /api/notifications/{id}/read → toggle read for one
 */

import { api } from "@/lib/api";

export interface Notification {
  id: string;
  userId?: string;
  type: string;         // e.g. "TASK", "BOOKING", "AI_ALERT", "MENTION"
  title: string;
  message: string;
  read: boolean;
  createdAt: string;    // ISO timestamp
}

export const NotificationsService = {
  /** GET /api/notifications — list all notifications newest first */
  getAll: () => api.get<Notification[]>("/api/notifications"),

  /** PATCH /api/notifications/read-all — mark every notification as read */
  markAllRead: () => api.patch<void>("/api/notifications/read-all", {}),

  /** PATCH /api/notifications/{id}/read — toggle read status for one notification */
  toggleRead: (id: string) => api.patch<void>(`/api/notifications/${id}/read`, {}),
};
