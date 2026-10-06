/**
 * lib/services/aiSummaries.ts
 *
 * Centralized service for managing AI-generated chat summaries,
 * action item extractions, and project insights directly connected to the PostgreSQL database.
 */

import { api } from "@/lib/api";

export interface SavedAiSummary {
  id: string;
  projectId: string;
  projectName?: string;
  topic: string;
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  deadlineSuggestions?: string[];
  confidence: number;
  date: string;
  status: "Pending Approval" | "Executed" | "Archived";
  model: string;
  sourceType: "CHAT_SUMMARY";
  createdBy?: string;
  messageCount?: number;
}

export interface NewAiSummaryInput {
  projectId: string;
  projectName?: string;
  topic?: string;
  summary: string;
  keyFindings?: string[];
  actionItems?: string[];
  deadlineSuggestions?: string[];
  confidence?: number;
  status?: "Pending Approval" | "Executed" | "Archived";
  model?: string;
  transcriptHash?: string;
  createdBy?: string;
  messageCount?: number;
}

interface BackendAiSummary {
  id: string;
  projectId: string;
  topic: string;
  summaryText: string;
  actionItems: string[];
  keyFindings: string[];
  deadlineSuggestions: string[];
  confidence: number;
  model: string;
  status: string;
  transcriptHash: string;
  processedAt: string;
}

const LOCAL_CACHE_KEY = "ai_chat_summaries_cache";

/**
 * Fetch all saved AI summaries directly from the backend database.
 */
export async function getAiSummaries(projectId?: string): Promise<SavedAiSummary[]> {
  try {
    const url = projectId ? `/api/ai-summaries?projectId=${encodeURIComponent(projectId)}` : "/api/ai-summaries";
    const res = await api.get<BackendAiSummary[]>(url);

    if (Array.isArray(res)) {
      const items: SavedAiSummary[] = res.map((item) => ({
        id: item.id,
        projectId: item.projectId,
        topic: item.topic || "Chat Discussion Summary",
        summary: item.summaryText,
        keyFindings: item.keyFindings || [],
        actionItems: item.actionItems || [],
        deadlineSuggestions: item.deadlineSuggestions || [],
        confidence: typeof item.confidence === "number" ? item.confidence : 100,
        date: item.processedAt
          ? new Date(item.processedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
        status: (item.status as any) || "Pending Approval",
        model: item.model || "LangChain Context Engine",
        sourceType: "CHAT_SUMMARY",
      }));

      // Cache locally for offline/fallback
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(items));
        } catch (_) {}
      }

      return items;
    }
  } catch (err) {
    console.warn("Failed to load AI summaries from backend API, checking local cache:", err);
  }

  // Fallback to local cache if offline
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}
  }

  return [];
}

/**
 * Save a newly generated AI summary directly to the backend database.
 */
export async function saveAiSummary(input: NewAiSummaryInput): Promise<SavedAiSummary> {
  const payload = {
    projectId: input.projectId,
    topic: input.topic || "Chat Discussion Summary",
    summaryText: input.summary,
    actionItems: input.actionItems || [],
    keyFindings: input.keyFindings || [],
    deadlineSuggestions: input.deadlineSuggestions || [],
    confidence: input.confidence ?? 100,
    model: input.model || "LangChain Context Engine",
    status: input.status || "Pending Approval",
    transcriptHash: input.transcriptHash || `hash-${Date.now()}`,
  };

  let savedItem: SavedAiSummary;

  try {
    const res = await api.post<BackendAiSummary>("/api/ai-summaries", payload);
    savedItem = {
      id: res.id,
      projectId: res.projectId,
      projectName: input.projectName,
      topic: res.topic || payload.topic,
      summary: res.summaryText,
      keyFindings: res.keyFindings || [],
      actionItems: res.actionItems || [],
      deadlineSuggestions: res.deadlineSuggestions || [],
      confidence: res.confidence || payload.confidence,
      date: res.processedAt
        ? new Date(res.processedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
      status: (res.status as any) || "Pending Approval",
      model: res.model || payload.model,
      sourceType: "CHAT_SUMMARY",
      createdBy: input.createdBy,
      messageCount: input.messageCount,
    };
  } catch (err) {
    console.error("Failed to persist AI summary to backend DB, falling back to local:", err);
    savedItem = {
      id: `local-${Date.now()}`,
      projectId: input.projectId,
      projectName: input.projectName,
      topic: payload.topic,
      summary: payload.summaryText,
      keyFindings: payload.keyFindings,
      actionItems: payload.actionItems,
      deadlineSuggestions: payload.deadlineSuggestions,
      confidence: payload.confidence,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Pending Approval",
      model: payload.model,
      sourceType: "CHAT_SUMMARY",
      createdBy: input.createdBy,
      messageCount: input.messageCount,
    };
  }

  // Update local cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      const list: SavedAiSummary[] = cached ? JSON.parse(cached) : [];
      const updated = [savedItem, ...list.filter((x) => x.id !== savedItem.id)];
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("ai_summaries_updated", { detail: savedItem }));
    } catch (_) {}
  }

  return savedItem;
}

/**
 * Update review status in backend database ("Pending Approval" | "Executed" | "Archived").
 */
export async function updateAiSummaryStatus(
  id: string,
  status: "Pending Approval" | "Executed" | "Archived"
): Promise<void> {
  try {
    if (!id.startsWith("local-")) {
      await api.patch(`/api/ai-summaries/${encodeURIComponent(id)}/status`, { status });
    }
  } catch (err) {
    console.error("Failed to update AI summary status in backend:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const list: SavedAiSummary[] = JSON.parse(cached);
        const updated = list.map((item) => (item.id === id ? { ...item, status } : item));
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent("ai_summaries_updated", { detail: { id, status } }));
    } catch (_) {}
  }
}

/**
 * Update the actionItems list directly in the backend.
 * Used to track approval state securely without relying on title comparison.
 */
export async function updateAiSummaryActionItems(id: string, actionItems: string[]): Promise<void> {
  try {
    if (!id.startsWith("local-")) {
      await api.patch(`/api/ai-summaries/${encodeURIComponent(id)}/action-items`, { actionItems });
    }
  } catch (err) {
    console.error("Failed to update AI summary action items in backend:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const list: SavedAiSummary[] = JSON.parse(cached);
        const updated = list.map((item) => (item.id === id ? { ...item, actionItems } : item));
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent("ai_summaries_updated", { detail: { id, actionItems } }));
    } catch (_) {}
  }
}

/**
 * Delete an AI summary from backend database.
 */
export async function deleteAiSummary(id: string): Promise<void> {
  try {
    if (!id.startsWith("local-")) {
      await api.del(`/api/ai-summaries/${encodeURIComponent(id)}`);
    }
  } catch (err) {
    console.error("Failed to delete AI summary from backend:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const list: SavedAiSummary[] = JSON.parse(cached);
        const updated = list.filter((item) => item.id !== id);
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent("ai_summaries_updated", { detail: { id, deleted: true } }));
    } catch (_) {}
  }
}
