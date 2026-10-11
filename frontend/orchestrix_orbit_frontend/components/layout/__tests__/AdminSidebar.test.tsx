// components/layout/__tests__/AdminSidebar.test.tsx
// Tests for the AdminSidebar component

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Hoist mocks so they are available before vi.mock factory runs ─────────────
const { mockLogout, mockPush } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockPush: vi.fn(),
}));

// ── Mock auth ─────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  logout: mockLogout,
  isPlatformSession: () => localStorage.getItem("tenantSlug") === "platform",
}));

// ── Control navigation ────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin-dashboard"),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

import { usePathname } from "next/navigation";
import { AdminSidebar } from "../AdminSidebar";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePathname).mockReturnValue("/admin-dashboard");
});

describe("AdminSidebar — navigation links", () => {
  it("renders 'Organization Overview' nav link", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Organization Overview")).toBeInTheDocument();
  });

  it("renders 'Research Lead View' nav link", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Research Lead View")).toBeInTheDocument();
  });

  it("applies active style to 'Organization Overview' when pathname is /admin-dashboard", () => {
    vi.mocked(usePathname).mockReturnValue("/admin-dashboard");
    render(<AdminSidebar />);
    const adminLink = screen.getByRole("link", { name: /organization overview/i });
    // Active link is highlighted in white
    expect(adminLink).toHaveStyle({ color: "#ffffff" });
  });

  it("does NOT apply active style to 'Research Lead View' when on admin path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin-dashboard");
    render(<AdminSidebar />);
    const leadLink = screen.getByRole("link", { name: /research lead view/i });
    // Inactive link should not have the active background
    expect(leadLink).not.toHaveStyle({ color: "#ffffff" });
  });
});

describe("AdminSidebar — brand header", () => {
  it("displays 'Orchestrix' brand name", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Orchestrix")).toBeInTheDocument();
  });

  it("displays 'Organization Administrator' subtitle for an organization admin", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Organization Administrator")).toBeInTheDocument();
    expect(screen.queryByText("Platform Administrator")).not.toBeInTheDocument();
  });

  it("displays 'Platform Administrator' and 'Platform Overview' for the platform admin", async () => {
    localStorage.setItem("tenantSlug", "platform");
    render(<AdminSidebar />);
    expect(await screen.findByText("Platform Administrator")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /platform overview/i })).toBeInTheDocument();
    expect(screen.queryByText("Organization Administrator")).not.toBeInTheDocument();
    localStorage.removeItem("tenantSlug");
  });
});

describe("AdminSidebar — logout", () => {
  it("calls logout() and navigates to '/' when Sign out is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    // Sign-out asks for confirmation first
    expect(mockLogout).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /yes, sign out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});

describe("AdminSidebar — platform admin", () => {
  it("hides the Research Lead View link for the platform organization", async () => {
    localStorage.setItem("tenantSlug", "platform");
    render(<AdminSidebar />);
    await waitFor(() => expect(screen.queryByRole("link", { name: /research lead view/i })).not.toBeInTheDocument());
    localStorage.removeItem("tenantSlug");
  });

  it("shows the Research Lead View link for an organization admin", () => {
    localStorage.setItem("tenantSlug", "myorg");
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /research lead view/i })).toBeInTheDocument();
    localStorage.removeItem("tenantSlug");
  });
});
