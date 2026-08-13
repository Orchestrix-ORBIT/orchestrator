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

// Helper: unwrap response — throw on non-2xx
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
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

  del: (path: string) =>
    fetch(`${BASE_URL}${path}`, { method: "DELETE", headers: buildHeaders() })
      .then((r) => handleResponse<void>(r)),
};
