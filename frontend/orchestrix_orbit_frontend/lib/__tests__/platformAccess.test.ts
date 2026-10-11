import { beforeEach, describe, expect, it } from "vitest";
import { canAccessDashboard, getDashboardPath, isPlatformSession } from "../auth";

// Platform admin (org "platform") only uses Platform Administration; lab dashboards are off-limits.
describe("platform session access", () => {
  beforeEach(() => localStorage.clear());

  it("recognises the platform organization session", () => {
    localStorage.setItem("tenantSlug", "platform");
    expect(isPlatformSession()).toBe(true);
    localStorage.setItem("tenantSlug", "myorg");
    expect(isPlatformSession()).toBe(false);
  });

  it("platform admin may open only the admin dashboard", () => {
    localStorage.setItem("tenantSlug", "platform");
    expect(getDashboardPath("ROLE_ADMIN")).toBe("/admin-dashboard");
    expect(canAccessDashboard("admin", "ROLE_ADMIN")).toBe(true);
    expect(canAccessDashboard("lead", "ROLE_ADMIN")).toBe(false);
    expect(canAccessDashboard("resource", "ROLE_ADMIN")).toBe(false);
    expect(canAccessDashboard("researcher", "ROLE_ADMIN")).toBe(false);
  });

  it("an organization admin keeps the Research Lead and Resource views", () => {
    localStorage.setItem("tenantSlug", "myorg");
    expect(canAccessDashboard("admin", "ROLE_ADMIN")).toBe(true);
    expect(canAccessDashboard("lead", "ROLE_ADMIN")).toBe(true);
    expect(canAccessDashboard("resource", "ROLE_ADMIN")).toBe(true);
  });

  it("non-admin roles are unchanged in normal organizations", () => {
    localStorage.setItem("tenantSlug", "myorg");
    expect(canAccessDashboard("lead", "ROLE_LEAD")).toBe(true);
    expect(canAccessDashboard("admin", "ROLE_LEAD")).toBe(false);
    expect(canAccessDashboard("resource", "ROLE_RESOURCE_MANAGER")).toBe(true);
    expect(canAccessDashboard("researcher", "ROLE_MEMBER")).toBe(true);
  });
});
