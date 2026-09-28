import { getTenantSlug, getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const CONTEXT_ENGINE_URL =
  process.env.NEXT_PUBLIC_CONTEXT_ENGINE_URL ?? "http://localhost:8083";

export interface ChatMessageForSummary {
  senderName: string;
  content: string;
  createdAt?: string;
}

export interface SummaryResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  message_count: number;
  strategy: "stuff" | "map_reduce" | "none";
}

export async function summarizeMessages(
  messages: ChatMessageForSummary[],
  projectId?: string,
  tenantId?: string
): Promise<SummaryResult> {
  const token = getToken();
  const tenant = tenantId ?? getTenantSlug();

  if (!token || !tenant) throw new Error("Please sign in to summarize messages.");

  // Try API Gateway (/api/ai/summarize) if available
  if (token && tenant) {
    try {
      const res = await fetch(`${API_URL}/api/ai/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenant,
        },
        body: JSON.stringify({ messages, projectId }),
      });

      if (res.ok) {
        return (await res.json()) as SummaryResult;
      }
    } catch {
      // Fallback directly to Context Engine on gateway network or proxy errors
    }
  }

  // Resilient direct fallback to Context Engine
  const directRes = await fetch(`${CONTEXT_ENGINE_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, projectId, tenantId: tenant }),
  });

  if (!directRes.ok) {
    const err = await directRes.json().catch(() => ({}));
    const detail = err?.detail;
    throw new Error(
      (typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : null)
        ?? err?.message
        ?? `Summarization request failed: ${directRes.status} ${directRes.statusText}`
    );
  }

  return directRes.json() as Promise<SummaryResult>;
}
