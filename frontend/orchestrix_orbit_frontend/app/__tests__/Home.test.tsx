import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("sign in and registration UI", () => {
  it("sends the selected tenant and routes after a successful sign in", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "jwt", email: "lead@example.test", role: "ROLE_LEAD" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Organization"), "lab-one");
    await user.type(screen.getByLabelText("Email address"), "lead@example.test");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(document.querySelector<HTMLButtonElement>("#btn-signin")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/lead-dashboard"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), expect.objectContaining({
      headers: expect.objectContaining({ "X-Tenant-ID": "lab-one" }),
      body: JSON.stringify({ email: "lead@example.test", password: "secret123" }),
    }));
    expect(localStorage.getItem("authToken")).toBe("jwt");
    expect(localStorage.getItem("tenantSlug")).toBe("lab-one");
    vi.unstubAllGlobals();
  });

  it("shows a login error without saving credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: async () => "Invalid credentials" }));
    render(<Home />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Organization"), "lab-one");
    await user.type(screen.getByLabelText("Email address"), "lead@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(document.querySelector<HTMLButtonElement>("#btn-signin")!);
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects mismatched sign up passwords before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    const user = userEvent.setup();
    await user.click(document.querySelector<HTMLButtonElement>("#tab-signup")!);
    await user.type(screen.getByLabelText("Organization"), "lab-one");
    await user.type(screen.getByLabelText("Full name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email address"), "jane@example.test");
    await user.type(screen.getByLabelText("Password", { exact: true }), "secret123");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
