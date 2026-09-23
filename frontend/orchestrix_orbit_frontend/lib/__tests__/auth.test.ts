// lib/__tests__/auth.test.ts
// Unit tests for lib/auth.ts — all exported functions

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveAuthData,
  getToken,
  getRole,
  getEmail,
  getTenantSlug,
  isLoggedIn,
  getDashboardPath,
  logout,
} from "../auth";

// ── localStorage is available in jsdom, reset between tests ──────────────────
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("saveAuthData", () => {
  it("writes all four keys to localStorage", () => {
    saveAuthData("tok123", "ROLE_ADMIN", "user@test.com", "my-org");

    expect(localStorage.getItem("authToken")).toBe("tok123");
    expect(localStorage.getItem("userRole")).toBe("ROLE_ADMIN");
    expect(localStorage.getItem("userEmail")).toBe("user@test.com");
    expect(localStorage.getItem("tenantSlug")).toBe("my-org");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getToken", () => {
  it("returns the stored JWT when present", () => {
    localStorage.setItem("authToken", "my-jwt");
    expect(getToken()).toBe("my-jwt");
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getRole", () => {
  it("returns the stored role", () => {
    localStorage.setItem("userRole", "ROLE_LEAD");
    expect(getRole()).toBe("ROLE_LEAD");
  });

  it("returns null when no role stored", () => {
    expect(getRole()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getEmail", () => {
  it("returns the stored email", () => {
    localStorage.setItem("userEmail", "a@b.com");
    expect(getEmail()).toBe("a@b.com");
  });

  it("returns null when no email stored", () => {
    expect(getEmail()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getTenantSlug", () => {
  it("returns the stored tenant slug", () => {
    localStorage.setItem("tenantSlug", "acme-corp");
    expect(getTenantSlug()).toBe("acme-corp");
  });

  it("returns null when no tenant slug stored", () => {
    expect(getTenantSlug()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("isLoggedIn", () => {
  it("returns true when a token exists", () => {
    localStorage.setItem("authToken", "tok");
    expect(isLoggedIn()).toBe(true);
  });

  it("returns false when no token exists", () => {
    expect(isLoggedIn()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getDashboardPath", () => {
  it("routes ROLE_ADMIN to /admin-dashboard", () => {
    expect(getDashboardPath("ROLE_ADMIN")).toBe("/admin-dashboard");
  });

  it("routes ADMIN (no prefix) to /admin-dashboard", () => {
    expect(getDashboardPath("ADMIN")).toBe("/admin-dashboard");
  });

  it("routes ROLE_OWNER to /admin-dashboard", () => {
    expect(getDashboardPath("ROLE_OWNER")).toBe("/admin-dashboard");
  });

  it("routes ROLE_LEAD to /lead-dashboard", () => {
    expect(getDashboardPath("ROLE_LEAD")).toBe("/lead-dashboard");
  });

  it("routes LEAD to /lead-dashboard", () => {
    expect(getDashboardPath("LEAD")).toBe("/lead-dashboard");
  });

  it("routes ROLE_MEMBER to /dashboard/researcher", () => {
    expect(getDashboardPath("ROLE_MEMBER")).toBe("/dashboard/researcher");
  });

  it("routes ROLE_GUEST to /dashboard/researcher", () => {
    expect(getDashboardPath("ROLE_GUEST")).toBe("/dashboard/researcher");
  });

  it("routes ROLE_RESOURCE_MANAGER to /resource-dashboard", () => {
    expect(getDashboardPath("ROLE_RESOURCE_MANAGER")).toBe("/resource-dashboard");
  });

  it("routes by email containing resource.manager regardless of role", () => {
    expect(getDashboardPath("ROLE_MEMBER", "resource.manager@lab.com")).toBe(
      "/resource-dashboard"
    );
  });

  it("routes by email containing resource_manager", () => {
    expect(getDashboardPath("ROLE_LEAD", "the_resource_manager@lab.com")).toBe(
      "/resource-dashboard"
    );
  });

  it("defaults to /dashboard/researcher for unknown role", () => {
    expect(getDashboardPath("UNKNOWN_ROLE")).toBe("/dashboard/researcher");
  });

  it("handles empty role string gracefully", () => {
    expect(getDashboardPath("")).toBe("/dashboard/researcher");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("logout", () => {
  it("removes all four auth keys from localStorage", () => {
    saveAuthData("tok", "ROLE_ADMIN", "a@b.com", "my-org");
    logout();

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("userRole")).toBeNull();
    expect(localStorage.getItem("userEmail")).toBeNull();
    expect(localStorage.getItem("tenantSlug")).toBeNull();
  });

  it("does not throw when called on an already-empty localStorage", () => {
    expect(() => logout()).not.toThrow();
  });
});
