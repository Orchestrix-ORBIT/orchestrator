// lib/__tests__/api.test.ts
// Unit tests for lib/api.ts — header injection, HTTP methods, error handling

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "../api";

// Helper: create a mock Response object
function mockResponse(
  body: unknown,
  status = 200,
  ok = true
): Response {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    json: () => Promise.resolve(JSON.parse(bodyStr)),
    text: () => Promise.resolve(bodyStr),
  } as unknown as Response;
}

// ── Setup & teardown ──────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Header injection", () => {
  it("always includes Content-Type: application/json", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true }));
    await api.get("/test");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });

  it("adds Authorization header when authToken is in localStorage", async () => {
    localStorage.setItem("authToken", "my-jwt-token");
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: 1 }));
    await api.get("/test");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-jwt-token"
    );
  });

  it("omits Authorization header when no token in localStorage", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: 1 }));
    await api.get("/test");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(
      (options.headers as Record<string, string>)["Authorization"]
    ).toBeUndefined();
  });

  it("adds X-Tenant-ID header when tenantSlug is in localStorage", async () => {
    localStorage.setItem("tenantSlug", "acme-org");
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: 1 }));
    await api.get("/test");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["X-Tenant-ID"]).toBe(
      "acme-org"
    );
  });

  it("omits X-Tenant-ID header when no tenantSlug in localStorage", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: 1 }));
    await api.get("/test");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(
      (options.headers as Record<string, string>)["X-Tenant-ID"]
    ).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HTTP methods", () => {
  it("api.get dispatches GET request", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ items: [] }));
    await api.get("/items");

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/items");
    expect(options.method).toBe("GET");
  });

  it("api.post dispatches POST with serialised body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ id: "1" }));
    const body = { name: "test" };
    await api.post("/items", body);

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/items");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify(body));
  });

  it("api.put dispatches PUT with serialised body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ id: "1" }));
    const body = { name: "updated" };
    await api.put("/items/1", body);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("PUT");
    expect(options.body).toBe(JSON.stringify(body));
  });

  it("api.patch dispatches PATCH with serialised body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ id: "1" }));
    await api.patch("/items/1", { status: "DONE" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("PATCH");
  });

  it("api.delete dispatches DELETE request", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(null, 204));
    await api.delete("/items/1");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("DELETE");
  });

  it("api.del dispatches DELETE request", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(null, 204));
    await api.del("/items/1");

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("DELETE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("handleResponse — error handling", () => {
  it("throws Error with status on 401 responses", async () => {
    const errBody = JSON.stringify({ message: "Unauthorized access" });
    vi.mocked(fetch).mockResolvedValue(mockResponse(errBody, 401, false));

    await expect(api.get("/secure")).rejects.toMatchObject({
      message: "Unauthorized access",
      status: 401,
    });
  });

  it("throws Error with status on 500 responses (JSON body)", async () => {
    const errBody = JSON.stringify({ error: "Internal Server Error" });
    vi.mocked(fetch).mockResolvedValue(mockResponse(errBody, 500, false));

    await expect(api.get("/items")).rejects.toMatchObject({
      message: "Internal Server Error",
      status: 500,
    });
  });

  it("throws Error with raw text when response is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve("Service Unavailable"),
      json: () => { throw new SyntaxError("not json"); },
    } as unknown as Response);

    await expect(api.get("/items")).rejects.toMatchObject({
      message: "Service Unavailable",
      status: 503,
    });
  });

  it("returns null for 204 No Content", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(null, 204));
    const result = await api.delete("/items/1");
    expect(result).toBeNull();
  });

  it("returns parsed JSON body on 200 success", async () => {
    const data = { id: "abc", name: "Project X" };
    vi.mocked(fetch).mockResolvedValue(mockResponse(data));
    const result = await api.get<{ id: string; name: string }>("/projects/abc");
    expect(result).toEqual(data);
  });
});
