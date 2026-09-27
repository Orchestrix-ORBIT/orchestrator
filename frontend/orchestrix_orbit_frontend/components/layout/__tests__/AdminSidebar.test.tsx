// components/layout/__tests__/AdminSidebar.test.tsx
// Tests for the AdminSidebar component

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("renders 'Admin Overview' nav link", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Admin Overview")).toBeInTheDocument();
  });

  it("renders 'Research Lead View' nav link", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Research Lead View")).toBeInTheDocument();
  });

  it("applies active style to 'Admin Overview' when pathname is /admin-dashboard", () => {
    vi.mocked(usePathname).mockReturnValue("/admin-dashboard");
    render(<AdminSidebar />);
    const adminLink = screen.getByRole("link", { name: /admin overview/i });
    // Active link gets background color applied via merged style objects
    expect(adminLink).toHaveStyle({ background: "#f5f5f5" });
  });

  it("does NOT apply active style to 'Research Lead View' when on admin path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin-dashboard");
    render(<AdminSidebar />);
    const leadLink = screen.getByRole("link", { name: /research lead view/i });
    // Inactive link should not have the active background
    expect(leadLink).not.toHaveStyle({ background: "#f5f5f5" });
  });
});

describe("AdminSidebar — brand header", () => {
  it("displays 'Orchestrix' brand name", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Orchestrix")).toBeInTheDocument();
  });

  it("displays 'System Administrator' subtitle", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("System Administrator")).toBeInTheDocument();
  });
});

describe("AdminSidebar — logout", () => {
  it("calls logout() and navigates to '/' when Sign out is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
