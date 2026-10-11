/**
 * lib/auth.ts — Central auth utility
 *
 * WHY THIS FILE EXISTS:
 * After the user logs in, we store their JWT token and role in localStorage.
 * This file gives us one place to read/write/clear that data.
 * Every page that needs to check "is the user logged in?" or "what role are they?"
 * imports from here — so if we ever change how auth works, we change it in ONE place.
 */

const TOKEN_KEY   = "authToken";
const ROLE_KEY    = "userRole";
const EMAIL_KEY   = "userEmail";
const TENANT_KEY  = "tenantSlug";
const USER_ID_KEY = "userId";

/** Save everything returned from the login/register API response */
export function saveAuthData(token: string, role: string, email: string, tenantSlug: string, userId?: string) {
  localStorage.setItem(TOKEN_KEY,  token);
  localStorage.setItem(ROLE_KEY,   role);
  localStorage.setItem(EMAIL_KEY,  email);
  localStorage.setItem(TENANT_KEY, tenantSlug);
  if (userId) localStorage.setItem(USER_ID_KEY, userId);
}

/** Get the stored JWT token (or null if not logged in) */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Get the stored role, e.g. "ROLE_MEMBER", "ROLE_ADMIN", "ROLE_OWNER" */
export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

/** Get the logged-in user's email */
export function getEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_KEY);
}

/** Get the active tenant slug (used as X-Tenant-ID header) */
export function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_KEY);
}

/** Get the logged-in user's UUID */
export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

/** True if a token exists in storage */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * Given a role string from the backend (e.g. "ROLE_ADMIN"),
 * returns the correct dashboard path to redirect to after login.
 *
 * Backend role values:
 *   ROLE_OWNER  → same as admin, gets lead-dashboard
 *   ROLE_ADMIN  → lead-dashboard (project leads, supervisors)
 *   ROLE_MEMBER → dashboard/researcher (regular researcher)
 *   ROLE_GUEST  → dashboard/researcher (read-only access)
 */
export function getDashboardPath(role: string, _email?: string): string {
  // The dashboard is decided ONLY by the role the backend issued in the JWT.
  // (Earlier versions guessed from the email text, which let e.g. "lead.x@..." MEMBER
  // accounts land on the Lead UI.) The email parameter is kept for call-site compatibility.
  const r = (role || "").toUpperCase().replace(/^ROLE_/, "");
  if (r === "ADMIN" || r === "OWNER") return "/admin-dashboard";
  if (r === "LEAD") return "/lead-dashboard";
  if (r === "RESOURCE_MANAGER") return "/resource-dashboard";
  return "/dashboard/researcher"; // MEMBER, RESEARCHER, GUEST
}

/**
 * Which roles may open which dashboard. Admin may also open the Lead and Resource views;
 * every signed-in role may open the researcher view.
 */
/** Slug of the platform organization (matches Core API's PLATFORM_TENANT). */
export const PLATFORM_TENANT = (process.env.NEXT_PUBLIC_PLATFORM_TENANT ?? "platform").toLowerCase();

/** True when signed in to the platform organization (manages organizations, holds no lab data). */
export function isPlatformSession(): boolean {
  return (getTenantSlug() || "").toLowerCase() === PLATFORM_TENANT;
}

export function canAccessDashboard(dashboard: "admin" | "lead" | "resource" | "researcher", role: string): boolean {
  const r = (role || "").toUpperCase().replace(/^ROLE_/, "");
  const isAdmin = r === "ADMIN" || r === "OWNER";
  // The platform organization has no projects, resources or research data: its admin only
  // uses Platform Administration, never the lab dashboards.
  if (dashboard !== "admin" && isPlatformSession()) return false;
  switch (dashboard) {
    case "admin": return isAdmin;
    case "lead": return isAdmin || r === "LEAD";
    case "resource": return isAdmin || r === "RESOURCE_MANAGER";
    case "researcher": return r !== "";
  }
}

/** Clear all auth data from storage (logout) */
export function logout() {
  // Revoke the token on the server (FR-AUTH-08) so it cannot be reused after sign-out.
  // Fire-and-forget: local sign-out must not wait for, or fail because of, the network.
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && typeof fetch === "function") {
    const tenant = localStorage.getItem(TENANT_KEY) ?? "";
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/auth/logout`, {
      method: "POST",
      keepalive: true,
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-ID": tenant } : {}) },
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_ID_KEY);
}
