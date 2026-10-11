import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboardLayout from "../layout";

const { replace, getRole } = vi.hoisted(() => ({ replace: vi.fn(), getRole: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/admin-dashboard" }));
vi.mock("@/lib/auth", async (orig) => ({ getDashboardPath: (await orig<typeof import("@/lib/auth")>()).getDashboardPath, canAccessDashboard: (await orig<typeof import("@/lib/auth")>()).canAccessDashboard, getRole, getEmail: () => "admin@myorg.com", logout: vi.fn(), isLoggedIn: () => true }));
vi.mock("@/components/layout/AdminSidebar", () => ({ AdminSidebar: () => <nav>Admin navigation</nav> }));

beforeEach(() => vi.clearAllMocks());

describe("admin dashboard UI gate", () => {
  it("redirects a member and hides admin content", async () => {
    getRole.mockReturnValue("ROLE_MEMBER");
    render(<AdminDashboardLayout><p>Sensitive administration</p></AdminDashboardLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/researcher"));
    expect(screen.queryByText("Sensitive administration")).not.toBeInTheDocument();
  });

  it("redirects a lead to the lead dashboard", async () => {
    getRole.mockReturnValue("ROLE_LEAD");
    render(<AdminDashboardLayout><p>Sensitive administration</p></AdminDashboardLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/lead-dashboard"));
    expect(screen.queryByText("Sensitive administration")).not.toBeInTheDocument();
  });

  it("shows admin content to an admin", async () => {
    getRole.mockReturnValue("ROLE_ADMIN");
    render(<AdminDashboardLayout><p>Sensitive administration</p></AdminDashboardLayout>);
    expect(await screen.findByText("Sensitive administration")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
