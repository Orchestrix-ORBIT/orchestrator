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

/** Save everything returned from the login/register API response */
export function saveAuthData(token: string, role: string, email: string, tenantSlug: string) {
  localStorage.setItem(TOKEN_KEY,  token);
  localStorage.setItem(ROLE_KEY,   role);
  localStorage.setItem(EMAIL_KEY,  email);
  localStorage.setItem(TENANT_KEY, tenantSlug);
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
export function getDashboardPath(role: string, email?: string): string {
  const normRole = (role || "").toUpperCase();
  const normEmail = (email || "").toLowerCase();

  // 1. Resource Manager check (email or specific role)
  if (
    normEmail.includes("resource.manager") ||
    normEmail.includes("resource_manager") ||
    normRole === "ROLE_RESOURCE_MANAGER" ||
    normRole === "RESOURCE_MANAGER"
  ) {
    return "/resource-dashboard";
  }

  if (normRole === "ROLE_ADMIN" || normRole === "ADMIN" || normRole === "ROLE_OWNER" || normRole === "OWNER") {
    return "/admin-dashboard";
  }
  if (normRole === "ROLE_LEAD" || normRole === "LEAD") {
    return "/lead-dashboard";
  }

  // 3. Default fallback for MEMBER / GUEST
  return "/dashboard/researcher";
}

/** Clear all auth data from storage (logout) */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(TENANT_KEY);
}
