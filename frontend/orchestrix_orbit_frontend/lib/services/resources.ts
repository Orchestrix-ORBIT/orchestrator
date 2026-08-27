/**
 * lib/services/resources.ts
 *
 * Resources = physical or virtual lab assets (GPU nodes, microscopes, rooms, etc.)
 * Bookings  = reservations of a resource for a time slot
 *
 * Backend resource types:    COMPUTE | INSTRUMENT | ROOM | SOFTWARE
 * Backend resource statuses: AVAILABLE | IN_USE | MAINTENANCE | DECOMMISSIONED
 * Backend booking statuses:  PENDING | APPROVED | REJECTED | CANCELLED
 */

import { api } from "@/lib/api";

// ── Types matching Spring Boot DTOs ─────────────────────────────────────────
export type ResourceType   = "GPU" | "CPU" | "STORAGE" | "DATASET" | "API_KEY" | "COMPUTE" | "INSTRUMENT" | "ROOM" | "SOFTWARE";
export type ResourceStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "DECOMMISSIONED";
export type BookingStatus  = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Resource {
  id: string;
  name: string;
  description?: string;
  type: ResourceType;
  status: ResourceStatus;
  location?: string;
  maxDurationHours?: number;
  ownerId: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  projectId?: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  status: BookingStatus;
  createdAt: string;
}

export interface CreateResourceBody {
  name: string;
  description?: string;
  type: ResourceType;
  location?: string;
  maxDurationHours?: number;
}

export interface CreateBookingBody {
  projectId?: string;
  startTime: string; // ISO 8601 e.g. "2026-08-27T09:00:00Z"
  endTime: string;
  purpose?: string;
}

// ── Service object ───────────────────────────────────────────────────────────
export const ResourcesService = {
  /** GET /api/resources — list all resources (optional type/status filters) */
  getAll: (type?: ResourceType, status?: ResourceStatus) => {
    const params = new URLSearchParams();
    if (type)   params.append("type", type);
    if (status) params.append("status", status);
    const qs = params.toString();
    return api.get<Resource[]>(`/api/resources${qs ? "?" + qs : ""}`);
  },

  /** GET /api/resources/{id} */
  getById: (id: string) => api.get<Resource>(`/api/resources/${id}`),

  /** POST /api/resources — create a new resource (admin/owner) */
  create: (body: CreateResourceBody) =>
    api.post<Resource>("/api/resources", body),

  // ── Bookings ──────────────────────────────────────────────────────────────

  /** GET /api/resources/{id}/bookings — all bookings for a resource */
  getBookings: (resourceId: string) =>
    api.get<Booking[]>(`/api/resources/${resourceId}/bookings`),

  /** GET /api/resources/bookings/me — current user's bookings */
  getMyBookings: () =>
    api.get<Booking[]>("/api/resources/bookings/me"),

  /** POST /api/resources/{id}/bookings — create a booking */
  createBooking: (resourceId: string, body: CreateBookingBody) =>
    api.post<Booking>(`/api/resources/${resourceId}/bookings`, body),

  /** PATCH /api/resources/bookings/{bookingId}/status — approve/reject */
  updateBookingStatus: (bookingId: string, status: BookingStatus) =>
    api.patch<Booking>(`/api/resources/bookings/${bookingId}/status`, { status }),
};
