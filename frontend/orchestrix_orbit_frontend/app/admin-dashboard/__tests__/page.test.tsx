import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiGet, apiPost, apiPatch, apiDel } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiDel: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get: apiGet, post: apiPost, patch: apiPatch, del: apiDel } }));
vi.mock("@/lib/auth", () => ({ getTenantSlug: () => "myorg", isPlatformSession: () => false }));
vi.mock("@/lib/services/teams", () => ({
  TeamsService: { getAllMembers: vi.fn(), updateMemberRole: vi.fn(), reactivateMember: vi.fn(), rejectSignup: vi.fn(), deleteMember: vi.fn(), removeMemberRecord: vi.fn() },
}));

import AdminPage from "../page";
import { TeamsService } from "@/lib/services/teams";

const members = [
  { id: "a1", email: "admin@myorg.com", displayName: "Admin", role: "ADMIN", status: "ACTIVE" },
  { id: "m1", email: "marcus@myorg.com", displayName: "Marcus", role: "MEMBER", status: "ACTIVE" },
  { id: "s1", email: "suspended@myorg.com", displayName: "Sam", role: "MEMBER", status: "SUSPENDED" },
  { id: "p1", email: "pending@myorg.com", displayName: "Pat", role: "MEMBER", status: "INACTIVE" },
];

const tenantList = [
  { id: "t1", slug: "myorg", name: "My Org", schemaName: "org_myorg", status: "ACTIVE", userCount: 4 },
  { id: "t2", slug: "acme", name: "Acme Lab", schemaName: "org_acme", status: "ACTIVE", userCount: 2 },
];
let orgAdmins: { id: string; email: string; displayName: string; status: string }[] = [];
function mockContext(platformAdmin: boolean) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/admin/tenants/context") return { platformAdmin, slug: platformAdmin ? "myorg" : "acme", name: platformAdmin ? "My Org" : "Acme Lab", schemaName: "x" };
    if (path === "/api/admin/tenants") return tenantList;
    if (path === "/api/admin/tenants/t2/admins") return orgAdmins.slice();
    throw new Error("unexpected " + path);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  orgAdmins = [{ id: "u9", email: "boss@acme.org", displayName: "Acme Boss", status: "ACTIVE" }];
  mockContext(false);
  vi.mocked(TeamsService.getAllMembers).mockResolvedValue(members as never);
});

describe("admin dashboard page", () => {
  it("platform admin loads organizations (and no organization roster)", async () => {
    mockContext(true);
    render(<AdminPage />);
    expect(await screen.findByText("Platform Administration")).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith("/api/admin/tenants");
    expect(screen.getAllByText("org_myorg").length).toBeGreaterThan(0);
    expect(screen.queryByText("marcus@myorg.com")).not.toBeInTheDocument();
    expect(screen.getByText("🛡️ Organization Administrators")).toBeInTheDocument();
  });

  it("organization admin loads its user roster", async () => {
    render(<AdminPage />);
    expect(await screen.findByText("marcus@myorg.com")).toBeInTheDocument();
  });

  it("platform admin sees an organization's admins and assigns a new one after confirmation", async () => {
    mockContext(true);
    apiPost.mockImplementation(async (path: string, body: { email: string }) => {
      if (path === "/api/admin/tenants/t2/admins") { orgAdmins.push({ id: "u10", email: body.email, displayName: "New", status: "ACTIVE" }); return orgAdmins[1]; }
      throw new Error("unexpected " + path);
    });
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("🛡️ Organization Administrators");
    await user.selectOptions(screen.getByLabelText("Organization"), "t2");
    expect(await screen.findByTestId("org-admin-boss@acme.org")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Admin email"), "second@acme.org");
    await user.type(screen.getByLabelText("Initial password (new accounts)"), "Initial123!");
    await user.click(screen.getByRole("button", { name: "Assign Admin" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Assign administrator?");
    expect(apiPost).not.toHaveBeenCalledWith("/api/admin/tenants/t2/admins", expect.anything());
    await user.click(screen.getByRole("button", { name: "Yes, Assign" }));
    expect(apiPost).toHaveBeenCalledWith("/api/admin/tenants/t2/admins", { email: "second@acme.org", displayName: undefined, password: "Initial123!" });
    expect(await screen.findByTestId("org-admin-second@acme.org")).toBeInTheDocument();
    expect(screen.getByText(/second@acme.org is now an administrator/)).toBeInTheDocument();
  });

  it("platform admin removes an admin after confirmation and sees the server error for the last admin", async () => {
    mockContext(true);
    apiDel.mockRejectedValue(new Error("An organization must keep at least one administrator. Add another admin first."));
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("🛡️ Organization Administrators");
    await user.selectOptions(screen.getByLabelText("Organization"), "t2");
    const row = await screen.findByTestId("org-admin-boss@acme.org");
    await user.click(within(row).getByRole("button", { name: "Remove admin" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Remove administrator?");
    await user.click(screen.getByRole("button", { name: "Yes, Remove" }));
    expect(apiDel).toHaveBeenCalledWith("/api/admin/tenants/t2/admins/u9");
    expect(await screen.findByText(/must keep at least one administrator/)).toBeInTheDocument();
  });

  it("protects admin accounts from role changes", async () => {
    render(<AdminPage />);
    await screen.findByText("admin@myorg.com");
    expect(screen.getByText(/Protected Admin/)).toBeInTheDocument();
  });

  it("changes a member's role through the dropdown", async () => {
    vi.mocked(TeamsService.updateMemberRole).mockResolvedValue({ ...members[1], role: "LEAD" } as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("marcus@myorg.com");
    const row = screen.getByText("marcus@myorg.com").closest("tr")!;
    await user.click(row.querySelector(".role-dropdown-container button")!);
    await user.click(screen.getByText("Research Lead (Supervisor)"));
    expect(TeamsService.updateMemberRole).toHaveBeenCalledWith("m1", "LEAD");
    await waitFor(() => expect(row.textContent).toContain("LEAD"));
  });

  it("shows suspended users and reactivates them", async () => {
    vi.mocked(TeamsService.reactivateMember).mockResolvedValue({ ...members[2], status: "ACTIVE" } as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("suspended@myorg.com");
    expect(screen.getByText("suspended@myorg.com").closest("tr")).toHaveTextContent("SUSPENDED");
    const srow = screen.getByText("suspended@myorg.com").closest("tr")!;
    await user.click(srow.querySelector("button[id^='btn-reactivate-']")!);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Reactivate account?");
    expect(TeamsService.reactivateMember).not.toHaveBeenCalled();     // nothing happens before confirming
    await user.click(screen.getByRole("button", { name: "Yes, Reactivate" }));
    expect(TeamsService.reactivateMember).toHaveBeenCalledWith("s1");
    await waitFor(() => expect(srow).not.toHaveTextContent("SUSPENDED"));
  });

  it("shows new sign-ups as PENDING APPROVAL and approves them", async () => {
    vi.mocked(TeamsService.reactivateMember).mockResolvedValue({ ...members[3], status: "ACTIVE" } as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    const row = screen.getByText("pending@myorg.com").closest("tr")!;
    expect(row).toHaveTextContent("PENDING APPROVAL");
    await user.click(row.querySelector("button[id^='btn-reactivate-']")!);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Approve account?");
    expect(screen.getByRole("dialog")).toHaveTextContent("pending@myorg.com");
    await user.click(screen.getByRole("button", { name: "Yes, Approve" }));
    expect(TeamsService.reactivateMember).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(row).not.toHaveTextContent("PENDING APPROVAL"));
    expect(row).toHaveTextContent("ACTIVE");
  });

  it("rejects a pending sign-up after confirmation and removes the row", async () => {
    vi.mocked(TeamsService.rejectSignup).mockResolvedValue(undefined as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    const row = screen.getByText("pending@myorg.com").closest("tr")!;
    await user.click(row.querySelector("button[id^='btn-reject-']")!);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Reject sign-up request?");
    await user.click(screen.getByRole("button", { name: "Yes, Reject" }));
    expect(TeamsService.rejectSignup).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.queryByText("pending@myorg.com")).not.toBeInTheDocument());
  });

  it("deletes a user permanently after confirmation and removes the row", async () => {
    let finish!: (v: unknown) => void;
    vi.mocked(TeamsService.deleteMember).mockReturnValue(new Promise((r) => { finish = r; }) as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("marcus@myorg.com");
    await user.click(screen.getByText("marcus@myorg.com").closest("tr")!.querySelector("button[id^='btn-delete-']")!);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Delete user permanently?");
    expect(TeamsService.deleteMember).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Yes, Delete" }));
    expect(TeamsService.deleteMember).toHaveBeenCalledWith("m1");
    expect(await screen.findByTestId("row-processing-m1")).toHaveTextContent("Deleting…");
    finish(undefined);
    await waitFor(() => expect(screen.queryByText("marcus@myorg.com")).not.toBeInTheDocument());
  });

  it("keeps the user and shows the server reason when deletion is refused", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(TeamsService.deleteMember).mockRejectedValue(new Error("This user still owns 2 projects. Reassign them first, or suspend the account instead."));
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("marcus@myorg.com");
    await user.click(screen.getByText("marcus@myorg.com").closest("tr")!.querySelector("button[id^='btn-delete-']")!);
    await user.click(await screen.findByRole("button", { name: "Yes, Delete" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("still owns 2 projects")));
    expect(screen.getByText("marcus@myorg.com")).toBeInTheDocument();
    alertSpy.mockRestore();
  });

  it("suspends an active user after confirmation and offers Reactivate", async () => {
    vi.mocked(TeamsService.removeMemberRecord).mockResolvedValue(undefined as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("marcus@myorg.com");
    const row = () => screen.getByText("marcus@myorg.com").closest("tr")!;
    await user.click(row().querySelector("button[id^='btn-suspend-']")!);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Suspend account?");
    await user.click(screen.getByRole("button", { name: "Yes, Suspend" }));
    expect(TeamsService.removeMemberRecord).toHaveBeenCalledWith("m1");
    await waitFor(() => expect(row()).toHaveTextContent("SUSPENDED"));
    expect(row().querySelector("button[id^='btn-reactivate-']")).not.toBeNull();
    expect(row().querySelector("button[id^='btn-suspend-']")).toBeNull();
  });

  it("offers no Suspend button for admins or already-suspended users", async () => {
    render(<AdminPage />);
    await screen.findByText("admin@myorg.com");
    expect(screen.getByText("admin@myorg.com").closest("tr")!.querySelector("button[id^='btn-suspend-']")).toBeNull();
    expect(screen.getByText("suspended@myorg.com").closest("tr")!.querySelector("button[id^='btn-suspend-']")).toBeNull();
  });

  it("offers no Delete button for admin accounts", async () => {
    render(<AdminPage />);
    await screen.findByText("admin@myorg.com");
    expect(screen.getByText("admin@myorg.com").closest("tr")!.querySelector("button[id^='btn-delete-']")).toBeNull();
  });

  it("does nothing when the confirmation popup is cancelled", async () => {
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    const row = screen.getByText("pending@myorg.com").closest("tr")!;
    await user.click(row.querySelector("button[id^='btn-reject-']")!);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(TeamsService.rejectSignup).not.toHaveBeenCalled();
    expect(row).toHaveTextContent("PENDING APPROVAL");
  });

  it("offers Reject only for pending sign-ups, not for suspended users", async () => {
    render(<AdminPage />);
    await screen.findByText("suspended@myorg.com");
    expect(screen.getByText("suspended@myorg.com").closest("tr")!.querySelector("button[id^='btn-reject-']")).toBeNull();
    expect(screen.getByText("pending@myorg.com").closest("tr")!.querySelector("button[id^='btn-reject-']")).not.toBeNull();
  });

  it("shows a skeleton row with 'Approving…' until the approval finishes", async () => {
    let finish!: (v: unknown) => void;
    vi.mocked(TeamsService.reactivateMember).mockReturnValue(new Promise((r) => { finish = r; }) as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    await user.click(screen.getByText("pending@myorg.com").closest("tr")!.querySelector("button[id^='btn-reactivate-']")!);
    await user.click(screen.getByRole("button", { name: "Yes, Approve" }));
    const busy = await screen.findByTestId("row-processing-p1");
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveTextContent("Approving…");
    expect(screen.queryByText("pending@myorg.com")).not.toBeInTheDocument();     // real row replaced by skeleton
    finish({ ...members[3], status: "ACTIVE" });
    await waitFor(() => expect(screen.queryByTestId("row-processing-p1")).not.toBeInTheDocument());
    expect(screen.getByText("pending@myorg.com").closest("tr")).toHaveTextContent("ACTIVE");
  });

  it("shows a skeleton row with 'Rejecting…' until the rejection finishes", async () => {
    let finish!: (v: unknown) => void;
    vi.mocked(TeamsService.rejectSignup).mockReturnValue(new Promise((r) => { finish = r; }) as never);
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    await user.click(screen.getByText("pending@myorg.com").closest("tr")!.querySelector("button[id^='btn-reject-']")!);
    await user.click(screen.getByRole("button", { name: "Yes, Reject" }));
    expect(await screen.findByTestId("row-processing-p1")).toHaveTextContent("Rejecting…");
    finish(undefined);
    await waitFor(() => expect(screen.queryByTestId("row-processing-p1")).not.toBeInTheDocument());
    expect(screen.queryByText("pending@myorg.com")).not.toBeInTheDocument();
  });

  it("restores the row if the approval fails", async () => {
    vi.stubGlobal("alert", vi.fn());
    vi.mocked(TeamsService.reactivateMember).mockRejectedValue(new Error("Network down"));
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("pending@myorg.com");
    await user.click(screen.getByText("pending@myorg.com").closest("tr")!.querySelector("button[id^='btn-reactivate-']")!);
    await user.click(screen.getByRole("button", { name: "Yes, Approve" }));
    await waitFor(() => expect(screen.queryByTestId("row-processing-p1")).not.toBeInTheDocument());
    expect(screen.getByText("pending@myorg.com").closest("tr")).toHaveTextContent("PENDING APPROVAL");
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("Network down"));
    vi.unstubAllGlobals();
  });

  it("platform admin sees the organization registry with user counts", async () => {
    mockContext(true);
    render(<AdminPage />);
    expect(await screen.findByText(/Organization Registry \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("Acme Lab").closest("div")!.parentElement!).toHaveTextContent("2 users");
    expect(screen.getByText(/Platform org/)).toBeInTheDocument();          // own org cannot be suspended
    expect(screen.getByRole("button", { name: /Create Tenant Schema/ })).toBeInTheDocument();
  });

  it("organization admin only manages its own users (no provisioning, no registry)", async () => {
    mockContext(false);
    render(<AdminPage />);
    expect(await screen.findByText("Organization Administration")).toBeInTheDocument();
    await screen.findByText("marcus@myorg.com");
    expect(screen.queryByText(/Organization Registry/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create Tenant Schema/ })).not.toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalledWith("/api/admin/tenants");       // never asks for other organizations
    expect(screen.getAllByText(/Acme Lab/).length).toBeGreaterThan(0);   // its own organization is named
  });

  it("suspends another organization after confirmation", async () => {
    mockContext(true);
    apiPatch.mockResolvedValue({ ...tenantList[1], status: "SUSPENDED" });
    render(<AdminPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Suspend" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Suspend organization?");
    expect(apiPatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Yes, Suspend" }));
    expect(apiPatch).toHaveBeenCalledWith("/api/admin/tenants/t2/status?status=SUSPENDED", {});
    await waitFor(() => expect(document.querySelector("#btn-tenant-status-acme")).toHaveTextContent("Reactivate"));
  });

  it("provisions a tenant with a normalised slug and shows success", async () => {
    mockContext(true);
    apiPost.mockResolvedValue({ id: "t2", slug: "acme-lab", name: "Acme Lab", schemaName: "org_acme_lab" });
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("Platform Administration");
    await user.type(screen.getByPlaceholderText("e.g. Acme Research Lab"), "Acme Lab");
    await user.type(screen.getByPlaceholderText("e.g. acme-lab"), "Acme Lab");
    await user.click(screen.getByRole("button", { name: /Create Tenant Schema/ }));
    expect(apiPost).toHaveBeenCalledWith("/api/admin/tenants", { slug: "acme-lab", name: "Acme Lab" });
    expect(await screen.findByText(/Successfully created tenant: Acme Lab \(org_acme_lab\)/)).toBeInTheDocument();
  });

  it("shows the server error when provisioning fails", async () => {
    mockContext(true);
    apiPost.mockRejectedValue(new Error("Tenant slug already exists"));
    render(<AdminPage />);
    const user = userEvent.setup();
    await screen.findByText("Platform Administration");
    await user.type(screen.getByPlaceholderText("e.g. Acme Research Lab"), "Dup");
    await user.type(screen.getByPlaceholderText("e.g. acme-lab"), "myorg");
    await user.click(screen.getByRole("button", { name: /Create Tenant Schema/ }));
    expect(await screen.findByText(/Tenant slug already exists/)).toBeInTheDocument();
  });
});
