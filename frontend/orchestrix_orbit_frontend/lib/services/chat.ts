import { getToken } from "@/lib/auth";

export interface ChatMessageItem {
  id: string;
  projectId: string;
  taskId?: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  replyToId?: string;
  replyToSender?: string;
  replyToContent?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  reactions?: Record<string, number>;
}

const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8082";

export async function fetchProjectMessages(
  projectId: string,
  tenant: string,
  page = 0,
  size = 15
): Promise<ChatMessageItem[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/chat/projects/${encodeURIComponent(projectId)}/messages?page=${page}&size=${size}`,
      { headers: { "X-Tenant-ID": tenant, Authorization: `Bearer ${getToken() ?? ""}` } }
    );
    if (!res.ok) {
      if (res.status >= 500) {
        throw new Error("The chat service is temporarily unavailable. Please try again later.");
      }
      throw new Error(`Chat history request failed (${res.status})`);
    }
    return await res.json() as ChatMessageItem[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      throw new Error("Cannot connect to the chat service. Please check your internet connection or try again later.");
    }
    throw err;
  }
}
