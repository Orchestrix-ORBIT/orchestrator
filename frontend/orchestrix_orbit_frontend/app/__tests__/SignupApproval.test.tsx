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

async function signUp(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);
  const user = userEvent.setup();
  await user.click(document.querySelector<HTMLButtonElement>("#tab-signup")!);
  await user.type(document.querySelector<HTMLInputElement>("#su-tenant")!, "myorg");
  await user.type(document.querySelector<HTMLInputElement>("#su-name")!, "New Person");
  await user.type(document.querySelector<HTMLInputElement>("#su-email")!, "New.Person@MyOrg.com");
  await user.type(document.querySelector<HTMLInputElement>("#su-password")!, "Password123!");
  await user.type(document.querySelector<HTMLInputElement>("#su-confirm")!, "Password123!");
  await user.click(document.querySelector<HTMLButtonElement>("#btn-signup")!);
  return user;
}

describe("account creation and admin approval UI", () => {
  it("shows a green 'awaiting approval' notice when the API returns no token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ token: null, email: "new.person@myorg.com", role: "ROLE_MEMBER" }) });
    await signUp(fetchMock);
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("An administrator must approve it before you can sign in.");
    expect(document.querySelector("#signin-error")).toBeNull();          // not shown as an error
    expect(document.querySelector("#btn-signin")).not.toBeNull();         // back on the sign-in tab
    expect(document.querySelector<HTMLInputElement>("#si-email, input[type=email]")!.value).toBe("New.Person@MyOrg.com"); // prefilled
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/register"), expect.objectContaining({
      headers: expect.objectContaining({ "X-Tenant-ID": "myorg" }),
    }));
    expect(push).not.toHaveBeenCalled();                                  // no auto-login
  });

  it("tells the first user of a new organization they can sign in now", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ token: "jwt", email: "founder@neworg.com", role: "ROLE_ADMIN" }) });
    await signUp(fetchMock);
    expect(await screen.findByRole("status")).toHaveTextContent("You can sign in now.");
  });

  it("shows the server error when the email is already registered", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ message: "Email is already registered: new.person@myorg.com" }) });
    await signUp(fetchMock);
    expect(await screen.findByText(/already registered/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the 'not active yet' message when a pending account tries to sign in", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403,
      text: async () => JSON.stringify({ message: "This account is not active yet. Ask an administrator to approve or reactivate it." }) }));
    render(<Home />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Organization"), "myorg");
    await user.type(screen.getByLabelText("Email address"), "new.person@myorg.com");
    await user.type(screen.getByLabelText("Password"), "Password123!");
    await user.click(document.querySelector<HTMLButtonElement>("#btn-signin")!);
    await waitFor(() => expect(document.querySelector("#signin-error")).toHaveTextContent("not active yet"));
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    const user = userEvent.setup();
    await user.click(document.querySelector<HTMLButtonElement>("#tab-signup")!);
    await user.type(document.querySelector<HTMLInputElement>("#su-tenant")!, "myorg");
    await user.type(document.querySelector<HTMLInputElement>("#su-name")!, "X");
    await user.type(document.querySelector<HTMLInputElement>("#su-email")!, "x@myorg.com");
    await user.type(document.querySelector<HTMLInputElement>("#su-password")!, "Password123!");
    await user.type(document.querySelector<HTMLInputElement>("#su-confirm")!, "Different123!");
    await user.click(document.querySelector<HTMLButtonElement>("#btn-signup")!);
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
