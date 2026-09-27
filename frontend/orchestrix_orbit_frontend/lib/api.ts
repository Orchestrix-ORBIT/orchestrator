// lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Helper: build headers for every request
function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Read tenant slug from localStorage (set during login)
  const tenantSlug = typeof window !== "undefined"
    ? localStorage.getItem("tenantSlug") ?? ""
    : "";
  if (tenantSlug) headers["X-Tenant-ID"] = tenantSlug;

  // Read JWT token from localStorage (set during login)
  const token = typeof window !== "undefined"
    ? localStorage.getItem("authToken")
    : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

// Helper: unwrap response — throw on non-2xx with user-friendly message
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const raw = await res.text();
    // Try to extract the 'message' field from Spring Boot error JSON bodies
    try {
      const json = JSON.parse(raw);
      const msg = json?.message || json?.error || raw;
      // Attach HTTP status so callers can check it if needed
      const err = new Error(msg) as Error & { status: number };
      err.status = res.status;
      throw err;
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        // Raw text response — use as-is
        const err = new Error(raw || `Request failed (${res.status})`) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      throw parseErr;
    }
  }
  // 204 No Content — return null
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    fetch(`${BASE_URL}${path}`, { method: "GET", headers: buildHeaders() })
      .then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  delete: (path: string) =>
    fetch(`${BASE_URL}${path}`, { method: "DELETE", headers: buildHeaders() })
      .then((r) => handleResponse<void>(r)),

  patch: <T>(path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  del: (path: string) =>
    fetch(`${BASE_URL}${path}`, { method: "DELETE", headers: buildHeaders() })
      .then((r) => handleResponse<void>(r)),
};
