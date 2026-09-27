import { getTenantSlug, getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  projectId: string,
  tenantId?: string
): Promise<SummaryResult> {
  const token = getToken();
  const tenant = tenantId ?? getTenantSlug();
  if (!token || !tenant) throw new Error("Please sign in to summarize messages.");

  const res = await fetch(`${API_URL}/api/ai/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-ID": tenant,
    },
    body: JSON.stringify({ messages, projectId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.detail;
    throw new Error(
      (typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : null)
        ?? err?.message
        ?? `Summarization request failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<SummaryResult>;
}
