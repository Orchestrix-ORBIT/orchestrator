import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const projectRef = "nqmitpyrheqqrcbkwwut";
const poolerUrl = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
const enabled = process.env.LIVE_SUPABASE_SMOKE === "1";
const coreUrl = "http://127.0.0.1:8080";
const chatUrl = "http://127.0.0.1:8082";

function requireLiveTarget() {
  if (!process.env.SPRING_DATASOURCE_URL?.startsWith(poolerUrl)
      || process.env.SPRING_DATASOURCE_USERNAME !== `postgres.${projectRef}`
      || !process.env.SPRING_DATASOURCE_PASSWORD) {
    throw new Error("Live smoke requires this project's Supabase session pooler and credentials");
  }
}

function sql(statement: string) {
  const result = spawnSync("psql", [
    `host=aws-0-ap-south-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.${projectRef} sslmode=require connect_timeout=10`,
    "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", statement,
  ], {
    encoding: "utf8",
    env: { ...process.env, PGPASSWORD: process.env.SPRING_DATASOURCE_PASSWORD },
    timeout: 20000,
  });
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function request(path: string, method: string, tenant: string, body?: unknown, token?: string) {
  return fetch(`${coreUrl}${path}`, {
    method,
    headers: {
      "X-Tenant-ID": tenant,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(path === "/api/admin/tenants" ? { "X-Bootstrap-Key": process.env.TENANT_BOOTSTRAP_KEY ?? "" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function sendChat(projectId: string, tenant: string, token: string, email: string, content: string) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${chatUrl}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("STOMP connect timed out")), 10000);
      client.onConnect = () => { clearTimeout(timer); resolve(); };
      client.onStompError = (frame) => { clearTimeout(timer); reject(new Error(frame.headers.message)); };
      client.onWebSocketError = () => { clearTimeout(timer); reject(new Error("WebSocket failed")); };
      client.activate();
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("STOMP delivery timed out")), 10000);
      client.subscribe(`/topic/tenant/${tenant.replaceAll("-", "_")}/project/${projectId}`, (message) => {
        if (JSON.parse(message.body).content === content) { clearTimeout(timer); resolve(); }
      });
      client.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({ projectId, tenantId: tenant, senderName: email, content }),
      });
    });
  } finally {
    await client.deactivate();
  }
}

describe.skipIf(!enabled)("live Supabase Java-service smoke", () => {
  it("writes and reads a project and chat message, then removes its tenant", async () => {
    requireLiveTarget();
    const suffix = crypto.randomUUID().slice(0, 8);
    const tenant = `integration-live-${suffix}`;
    const schema = `org_integration_live_${suffix}`;
    const email = `live-${suffix}@example.test`;
    let projectId: string | undefined;
    let token: string | undefined;
    try {
      const provisioned = await request("/api/admin/tenants", "POST", "myorg", {
        slug: tenant, name: "Live integration smoke",
      });
      expect(provisioned.status, await provisioned.text()).toBe(201);

      const registered = await request("/api/auth/register", "POST", tenant, {
        email, password: "IntegrationPass123!", displayName: "Live Smoke",
      });
      expect(registered.status).toBe(201);
      token = (await registered.json()).token;
      expect(token).toBeTruthy();

      const created = await request("/api/projects", "POST", tenant, { name: "Live smoke project" }, token);
      expect(created.status).toBe(201);
      projectId = (await created.json()).id;
      expect(projectId).toBeTruthy();
      const read = await request(`/api/projects/${projectId}`, "GET", tenant, undefined, token);
      expect(read.status).toBe(200);
      expect((await read.json()).name).toBe("Live smoke project");

      const content = `Live smoke ${crypto.randomUUID()}`;
      await sendChat(projectId!, tenant, token!, email, content);
      let messages: Array<{ content: string }> = [];
      for (let attempt = 0; attempt < 20; attempt++) {
        const history = await fetch(`${chatUrl}/api/chat/projects/${projectId}/messages`, {
          headers: { "X-Tenant-ID": tenant, Authorization: `Bearer ${token}` },
        });
        expect(history.status).toBe(200);
        messages = await history.json();
        if (messages.some((message) => message.content === content)) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      expect(messages.map((message) => message.content)).toContain(content);
      expect(sql(`SELECT count(*) FROM ${schema}.chat_messages WHERE project_id = '${projectId}'`)).toBe("1");
    } finally {
      let projectCleanupError: Error | undefined;
      if (projectId && token) {
        try {
          const deleted = await request(`/api/projects/${projectId}`, "DELETE", tenant, undefined, token);
          if (deleted.status !== 204) projectCleanupError = new Error(`Project cleanup returned HTTP ${deleted.status}`);
        } catch (error) {
          projectCleanupError = error instanceof Error ? error : new Error(String(error));
        }
      }
      sql(`DELETE FROM public.tenants WHERE slug = '${tenant}'; DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      expect(sql(`SELECT count(*) FROM public.tenants WHERE slug = '${tenant}'`)).toBe("0");
      expect(sql(`SELECT count(*) FROM pg_namespace WHERE nspname = '${schema}'`)).toBe("0");
      if (projectCleanupError) throw projectCleanupError;
    }
  }, 90000);
});
