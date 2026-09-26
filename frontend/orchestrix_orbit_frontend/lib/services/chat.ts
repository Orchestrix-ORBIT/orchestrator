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
  const res = await fetch(
    `${API_BASE}/api/chat/projects/${encodeURIComponent(projectId)}/messages?page=${page}&size=${size}`,
    { headers: { "X-Tenant-ID": tenant, Authorization: `Bearer ${getToken() ?? ""}` } }
  );
  if (!res.ok) throw new Error(`Chat history request failed (${res.status})`);
  return res.json() as Promise<ChatMessageItem[]>;
}
