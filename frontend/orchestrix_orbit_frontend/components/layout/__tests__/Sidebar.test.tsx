// components/layout/__tests__/Sidebar.test.tsx
// Tests for the Lead Dashboard Sidebar component

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Hoist mocks so they are available before vi.mock factory runs ─────────────
const { mockLogout, mockPush } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockPush: vi.fn(),
}));

// ── Mock auth helpers ─────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  logout: mockLogout,
  getTenantSlug: vi.fn(() => "myorg"),
  getRole: vi.fn(() => "ROLE_LEAD"),
}));

// ── Control navigation mocks ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/lead-dashboard"),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

import { usePathname } from "next/navigation";
import * as authModule from "@/lib/auth";
import { Sidebar } from "../Sidebar";

// ── Stub global fetch (org name lookup) ───────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authModule.getRole).mockReturnValue("ROLE_LEAD");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: "Acme Research Lab" }),
    })
  );
});

describe("Sidebar — navigation links", () => {
  it("renders all 8 expected navigation labels", () => {
    render(<Sidebar />);
    const expectedLabels = [
      "Overview",
      "Projects",
      "Team & Roster",
      "Resources",
      "Chat",
      "Documents",
      "AI Summaries",
      "Notifications",
    ];
    expectedLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("marks the active link based on current pathname", () => {
    vi.mocked(usePathname).mockReturnValue("/lead-dashboard");
    render(<Sidebar />);
    // The 'Overview' link's href is exactly /lead-dashboard — active color is #ffffff
    const overviewLink = screen.getByRole("link", { name: /overview/i });
    expect(overviewLink).toHaveStyle({ color: "#ffffff" });
  });

  it("marks a non-active link as inactive based on pathname", () => {
    vi.mocked(usePathname).mockReturnValue("/lead-dashboard");
    render(<Sidebar />);
    const projectsLink = screen.getByRole("link", { name: /projects/i });
    expect(projectsLink).toHaveStyle({ color: "#888888" });
  });
});

describe("Sidebar — admin visibility", () => {
  it("does NOT render 'Back to Admin' link for non-admin roles", () => {
    vi.mocked(authModule.getRole).mockReturnValue("ROLE_LEAD");
    render(<Sidebar />);
    expect(screen.queryByText(/back to admin/i)).not.toBeInTheDocument();
  });

  it("renders 'Back to Admin' link when role is ROLE_ADMIN", async () => {
    vi.mocked(authModule.getRole).mockReturnValue("ROLE_ADMIN");
    render(<Sidebar />);
    await waitFor(() => {
      expect(screen.getByText(/back to admin/i)).toBeInTheDocument();
    });
  });

  it("renders 'Back to Admin' link when role is ROLE_OWNER", async () => {
    vi.mocked(authModule.getRole).mockReturnValue("ROLE_OWNER");
    render(<Sidebar />);
    await waitFor(() => {
      expect(screen.getByText(/back to admin/i)).toBeInTheDocument();
    });
  });
});

describe("Sidebar — org name display", () => {
  it("displays the fetched org name in the brand header", async () => {
    render(<Sidebar />);
    await waitFor(() => {
      expect(screen.getByText(/Acme Research Lab/)).toBeInTheDocument();
    });
  });

  it("falls back to uppercased tenant slug when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
    render(<Sidebar />);
    await waitFor(() => {
      expect(screen.getByText(/MYORG/)).toBeInTheDocument();
    });
  });
});

describe("Sidebar — logout", () => {
  it("calls logout() and redirects to '/' when Sign Out is clicked", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
