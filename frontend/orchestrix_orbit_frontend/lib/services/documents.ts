/**
 * lib/services/documents.ts
 *
 * Documents are always scoped to a project (like tasks).
 * The backend AES-256 encrypts document content — the frontend receives
 * the decrypted content transparently (server handles the cipher).
 *
 * Backend access levels: PRIVATE | TEAM | PUBLIC
 */

import { api } from "@/lib/api";

// ── Types matching Spring Boot DocumentResponse DTO ──────────────────────────
export type DocumentAccess = "PRIVATE" | "TEAM" | "PUBLIC";

export interface Document {
  id: string;
  projectId: string;
  title: string;
  contentPreview?: string; // First 200 chars of decrypted content
  mimeType?: string;
  sizeBytes?: number;
  accessLevel: DocumentAccess;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentBody {
  title: string;
  content?: string;
  mimeType?: string;
  accessLevel?: DocumentAccess;
}

export interface UpdateDocumentBody {
  title?: string;
  content?: string;
  accessLevel?: DocumentAccess;
}

// ── Service object ───────────────────────────────────────────────────────────
export const DocumentsService = {
  /** GET /api/projects/{projectId}/documents — list all documents */
  getByProject: (projectId: string) =>
    api.get<Document[]>(`/api/projects/${projectId}/documents`),

  /** GET /api/projects/{projectId}/documents/{documentId} */
  getById: (projectId: string, documentId: string) =>
    api.get<Document>(`/api/projects/${projectId}/documents/${documentId}`),

  /** POST /api/projects/{projectId}/documents — create a document */
  create: (projectId: string, body: CreateDocumentBody) =>
    api.post<Document>(`/api/projects/${projectId}/documents`, body),

  /** PUT /api/projects/{projectId}/documents/{documentId} — update */
  update: (projectId: string, documentId: string, body: UpdateDocumentBody) =>
    api.put<Document>(`/api/projects/${projectId}/documents/${documentId}`, body),

  /** DELETE /api/projects/{projectId}/documents/{documentId} */
  delete: (projectId: string, documentId: string) =>
    api.del(`/api/projects/${projectId}/documents/${documentId}`),
};
