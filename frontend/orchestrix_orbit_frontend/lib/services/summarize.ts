/**
 * summarize.ts — Client service for the Orchestrix Context Engine
 *
 * Calls POST http://localhost:8083/summarize with selected chat messages
 * and returns an AI-generated summary from LangChain + Gemini Flash.
 */

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
  const res = await fetch(`${CONTEXT_ENGINE_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, projectId, tenantId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.detail ?? `Context Engine error: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<SummaryResult>;
}
