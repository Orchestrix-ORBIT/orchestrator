import { describe, expect, it } from "vitest";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken, saveAuthData } from "@/lib/auth";
import { ProjectsService } from "@/lib/services/projects";
import { fetchProjectMessages } from "@/lib/services/chat";
import { summarizeMessages } from "@/lib/services/summarize";

const enabled = process.env.CROSS_SERVICE_INTEGRATION === "1";
const coreUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "http://127.0.0.1:8082/ws";

async function postJson(path: string, tenant: string | null, body: unknown) {
  const res = await fetch(`${coreUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tenant ? { "X-Tenant-ID": tenant } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  expect(res.status, JSON.stringify(result)).toBe(201);
  return result;
}

async function sendStompMessage(projectId: string, tenant: string, senderName: string, content: string) {
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: { Authorization: `Bearer ${getToken() ?? ""}` },
    reconnectDelay: 0,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("STOMP connection timed out")), 10000);
      client.onConnect = () => {
        clearTimeout(timer);
        resolve();
      };
      client.onWebSocketError = () => {
        clearTimeout(timer);
        reject(new Error("STOMP WebSocket connection failed"));
      };
      client.activate();
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("STOMP delivery timed out")), 10000);
      client.subscribe(`/topic/tenant/${tenant.replaceAll("-", "_")}/project/${projectId}`, (message) => {
        if (JSON.parse(message.body).content === content) {
          clearTimeout(timer);
          resolve();
        }
      });
      client.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({ projectId, tenantId: tenant, senderName, content }),
      });
    });
  } finally {
    await client.deactivate();
  }
}

describe.skipIf(!enabled)("frontend to backend and chat to context engine", () => {
  it("creates a project through frontend services and summarizes its persisted chat", async () => {
    const tenant = `integration-cross-${crypto.randomUUID().slice(0, 8)}`;
    const email = `cross-${crypto.randomUUID().slice(0, 8)}@example.test`;
    await postJson("/api/admin/tenants", null, { slug: tenant, name: "Cross-service test" });
    const auth = await postJson("/api/auth/register", tenant, {
      email,
      password: "IntegrationPass123!",
      displayName: "Cross Service Admin",
    });
    expect(auth.role).toBe("ROLE_ADMIN");
    saveAuthData(auth.token, auth.role, auth.email, tenant);

    const project = await ProjectsService.create({ name: "Cross-service project" });
    try {
      expect((await ProjectsService.getById(project.id)).name).toBe(project.name);
      expect((await ProjectsService.getAll()).some((item) => item.id === project.id)).toBe(true);

      const content = `Decision ${crypto.randomUUID()}: ship the integration check`;
      await sendStompMessage(project.id, tenant, email, content);
      let messages = await fetchProjectMessages(project.id, tenant);
      for (let attempt = 0; attempt < 20 && !messages.some((item) => item.content === content); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        messages = await fetchProjectMessages(project.id, tenant);
      }
      expect(messages.map((item) => item.content)).toContain(content);

      const selected = messages
        .filter((item) => item.content === content)
        .map(({ senderName, content, createdAt }) => ({ senderName, content, createdAt }));
      const summary = await summarizeMessages(selected, project.id, tenant);
      expect(summary.message_count).toBe(1);
      expect(summary.summary).toBe(content);
      expect(summary.key_points).toEqual(["Cross Service Admin"]);
    } finally {
      await ProjectsService.delete(project.id);
      localStorage.clear();
    }
  }, 45000);
});
